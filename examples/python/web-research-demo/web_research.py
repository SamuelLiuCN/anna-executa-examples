#!/usr/bin/env python3
"""web_research.py — Executa plugin that uses host web search & fetch.

This example demonstrates:

* declaring ``host_capabilities: ["web.search", "web.fetch"]`` in the
  manifest (without it the host refuses ``web/*`` with -32521 NOT_GRANTED)
* issuing reverse JSON-RPC ``web/search`` / ``web/fetch`` requests through
  :class:`executa_sdk.WebClient`
* sharing one stdin reader between agent-initiated invokes and host responses

The plugin exposes two tools:

* ``web_search`` — provider-agnostic web/news search via the host.
* ``research_topic`` — search + fetch the top results and return their
  extracted content (a minimal "research pipeline" demo).

Provider API keys / SSRF guarding / quota / billing all stay host-side —
the plugin never talks to a search provider directly. End-to-end enablement:

1. Declare ``host_capabilities`` (below) and (re-)register the executa so
   the caps land in ``manifest_cache``.
2. The end user must enable the Web toggle for this Executa in Anna's
   Permissions panel (writes ``web_grant.enabled = true``).

Wire contract: matrix-nexus ``docs/design/app-web-search.md`` §2 / §4.

Protocol reminders (two historical foot-guns):
* ``describe`` must return the **bare manifest** as the result;
* ``invoke`` must return the ``{success, tool, data}`` **wrapper**.
"""

from __future__ import annotations

import json
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

# Allow running this file directly from a fresh checkout without first
# installing the SDK (falls back to the in-repo copy).
try:
    import executa_sdk  # noqa: F401
except ModuleNotFoundError:
    _SDK_PATH = Path(__file__).resolve().parents[3] / "sdk" / "python"
    if _SDK_PATH.is_dir():
        sys.path.insert(0, str(_SDK_PATH))

import asyncio  # noqa: E402

from executa_sdk import WebClient, WebError  # noqa: E402

# ─── Manifest ────────────────────────────────────────────────────────

MANIFEST = {
    "display_name": "Web Research Demo",
    "version": "0.1.0",
    "description": "Searches the web and extracts page content via host-managed web/search + web/fetch.",
    "author": "Anna Developer",
    # Without these entries, Nexus refuses the plugin's web requests with
    # -32521 (WEB_NOT_GRANTED). Re-register after changing them so they
    # reach manifest_cache.
    "host_capabilities": ["web.search", "web.fetch"],
    "tools": [
        {
            "name": "web_search",
            "description": "Search the web (or news) and return provider-agnostic results.",
            "parameters": [
                {"name": "query", "type": "string", "description": "Search query", "required": True},
                {"name": "max_results", "type": "integer", "description": "Max results (1-10)", "required": False, "default": 5},
                {"name": "topic", "type": "string", "description": "general or news", "required": False, "default": "general", "enum": ["general", "news"]},
                {"name": "time_range", "type": "string", "description": "Recency filter", "required": False, "enum": ["day", "week", "month", "year"]},
            ],
        },
        {
            "name": "research_topic",
            "description": "Search a topic, fetch the top pages, and return their extracted content.",
            "parameters": [
                {"name": "query", "type": "string", "description": "Research topic", "required": True},
                {"name": "pages", "type": "integer", "description": "How many top results to fetch (1-3)", "required": False, "default": 2},
            ],
        },
    ],
    "runtime": {"type": "uv", "min_version": "0.1.0"},
}


# ─── Web client + bookkeeping ────────────────────────────────────────

_stdout_lock = threading.Lock()


def _write_frame(msg: dict) -> None:
    payload = json.dumps(msg, ensure_ascii=False)
    with _stdout_lock:
        sys.stdout.write(payload + "\n")
        sys.stdout.flush()


web = WebClient(write_frame=_write_frame)


# ─── Tool implementations ────────────────────────────────────────────


async def _web_search(
    query: str,
    max_results: int = 5,
    topic: str = "general",
    time_range: str | None = None,
    *,
    invoke_id: str,
) -> dict:
    result = await web.search(
        query=query,
        max_results=max(1, min(10, int(max_results))),
        topic=topic if topic in ("general", "news") else "general",
        time_range=time_range,
    )
    return {
        "results": result.get("results", []),
        "provider_tier": result.get("provider_tier"),
        "quota_consumed": result.get("quota_consumed"),
    }


async def _research_topic(query: str, pages: int = 2, *, invoke_id: str) -> dict:
    pages = max(1, min(3, int(pages)))
    found = await web.search(query=query, max_results=pages)
    results = found.get("results", [])
    if not results:
        return {"query": query, "results": [], "pages": [], "note": "no results"}

    urls = [r["url"] for r in results[:pages]]
    fetched = await web.fetch(urls=urls, format="markdown", max_chars=6000)

    # Per-item failure isolation — a blocked/broken page doesn't fail the
    # whole research run; report it inline instead.
    out_pages = []
    for page in fetched.get("pages", []):
        out_pages.append(
            {
                "url": page.get("url"),
                "ok": page.get("ok"),
                "title": page.get("title"),
                "content": page.get("content"),
                "truncated": page.get("truncated"),
                "error": page.get("error"),
            }
        )
    return {
        "query": query,
        "results": results,
        "pages": out_pages,
        "quota_consumed": round(
            float(found.get("quota_consumed") or 0)
            + float(fetched.get("quota_consumed") or 0),
            4,
        ),
    }


# ─── JSON-RPC dispatch ───────────────────────────────────────────────


def _make_response(req_id, *, result=None, error=None) -> dict:
    out = {"jsonrpc": "2.0", "id": req_id}
    if error is not None:
        out["error"] = error
    else:
        out["result"] = result
    return out


def _handle_initialize(req_id, params: dict) -> dict:
    proto = (params or {}).get("protocolVersion") or "1.1"
    if proto != "2.0":
        web.disable(
            f"host did not negotiate v2 (offered protocolVersion={proto!r}); "
            "web/* requires Executa protocol 2.0"
        )
    return _make_response(
        req_id,
        result={
            "protocolVersion": proto if proto in ("1.1", "2.0") else "2.0",
            "serverInfo": {
                "name": MANIFEST["display_name"],
                "version": MANIFEST["version"],
            },
            "client_capabilities": {"web": {}} if proto == "2.0" else {},
            "capabilities": {},
        },
    )


def _handle_describe(req_id) -> dict:
    # ⚠️ result MUST be the bare manifest (not {"manifest": ...}).
    return _make_response(req_id, result=MANIFEST)


def _handle_health(req_id) -> dict:
    return _make_response(
        req_id,
        result={
            "status": "healthy",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "version": MANIFEST["version"],
        },
    )


_loop = asyncio.new_event_loop()
_loop_thread = threading.Thread(target=_loop.run_forever, daemon=True)
_loop_thread.start()


def _handle_invoke(req_id, params: dict) -> dict:
    tool = params.get("tool")
    args = params.get("arguments") or {}
    invoke_id = params.get("invoke_id") or ""

    if tool == "web_search":
        coro = _web_search(invoke_id=invoke_id, **args)
    elif tool == "research_topic":
        coro = _research_topic(invoke_id=invoke_id, **args)
    else:
        return _make_response(
            req_id,
            error={"code": -32601, "message": f"Unknown tool: {tool}"},
        )

    fut = asyncio.run_coroutine_threadsafe(coro, _loop)
    try:
        data = fut.result(timeout=180.0)
    except WebError as e:
        return _make_response(
            req_id,
            error={"code": e.code, "message": e.message, "data": e.data},
        )
    except Exception as e:  # noqa: BLE001
        return _make_response(
            req_id,
            error={"code": -32603, "message": f"Tool execution failed: {e}"},
        )
    # ⚠️ invoke results MUST use the {success, tool, data} wrapper.
    return _make_response(req_id, result={"success": True, "tool": tool, "data": data})


def _handle_message(line: str) -> None:
    try:
        msg = json.loads(line)
    except json.JSONDecodeError:
        _write_frame(_make_response(None, error={"code": -32700, "message": "Parse error"}))
        return

    # Reverse-RPC reply from host → resolve a pending web future.
    if "method" not in msg:
        if not web.dispatch_response(msg):
            print(f"⚠️  unmatched response id={msg.get('id')!r}", file=sys.stderr)
        return

    method = msg.get("method")
    req_id = msg.get("id")
    params = msg.get("params") or {}

    if method == "initialize":
        resp = _handle_initialize(req_id, params)
    elif method == "describe":
        resp = _handle_describe(req_id)
    elif method == "invoke":
        resp = _handle_invoke(req_id, params)
    elif method == "health":
        resp = _handle_health(req_id)
    elif method == "shutdown":
        resp = _make_response(req_id, result={"ok": True})
    else:
        resp = _make_response(req_id, error={"code": -32601, "message": f"Method not found: {method}"})

    if req_id is not None:
        _write_frame(resp)


# ─── Main loop ───────────────────────────────────────────────────────


def main() -> None:
    print("🔌 web-research-demo plugin started", file=sys.stderr)
    pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="invoke")
    try:
        for raw in sys.stdin:
            line = raw.strip()
            if not line:
                continue
            pool.submit(_handle_message, line)
    finally:
        pool.shutdown(wait=False, cancel_futures=True)
        _loop.call_soon_threadsafe(_loop.stop)


if __name__ == "__main__":
    main()
