#!/usr/bin/env python3
"""credentials_via_executa_plugin.py — minimal Executa that reads the user's
platform-authorized accounts and exchanges short-lived access tokens.

Demonstrates the Reverse RPC half of the Credentials Demo app:

    iframe ── anna.tools.invoke ──▶ this Executa ── credentials/* ──▶ host → Nexus

Side-by-side with the HOST API half (`anna.credentials.list_accounts` /
`anna.credentials.get_token` called directly from the iframe), the two
surfaces expose the SAME multi-account data:

* HOST API — gated by manifest `ui.host_api.credentials` (provider ids)
  + the user's per-app `credentials_grant` (permission editor).
* Reverse RPC (this plugin) — gated by this plugin's manifest
  ``credentials`` declaration: the host mints a per-invoke
  ``credentials_token`` whose ``providers`` claim covers exactly the
  OAuth providers our declared credential names map to
  (``GOOGLE_ACCESS_TOKEN`` → ``google``).

Security notes baked into the demo:

* ``list_accounts`` returns metadata only — never tokens.
* ``token_info`` fetches a token but returns it MASKED (prefix + length)
  so full tokens never land in chat transcripts.
* ``token_info`` declares ``"multi_account": true`` — the platform
  injects an optional ``account`` argument into the LLM-visible schema;
  we pass it straight to ``credentials/getToken`` as ``account_id``
  (an email is resolved against ``list_accounts`` first).
"""

from __future__ import annotations

import asyncio
import json
import sys
import threading
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

# Fallback for fresh checkouts: locate the in-repo SDK when not pip-installed.
try:
    import executa_sdk  # noqa: F401
except ModuleNotFoundError:
    _SDK_PATH = Path(__file__).resolve().parents[4] / "sdk" / "python"
    if _SDK_PATH.is_dir():
        sys.path.insert(0, str(_SDK_PATH))

from executa_sdk import (  # noqa: E402
    PROTOCOL_VERSION_V2,
    CredentialsClient,
    CredentialsError,
)
from executa_sdk.sampling import _write_frame  # noqa: E402

# ─── Manifest ────────────────────────────────────────────────────────
# The ``credentials`` declaration is doing double duty here:
# 1. classic default-account injection — the host injects the default
#    account's GOOGLE_ACCESS_TOKEN into params.context.credentials;
# 2. multi-account gating — because GOOGLE_ACCESS_TOKEN maps to the
#    OAuth provider ``google``, the host mints a per-invoke
#    ``credentials_token`` authorizing credentials/* reverse-RPCs for it.

MANIFEST = {
    "display_name": "Credentials via Executa",
    "version": "0.2.0",
    "description": (
        "Reads the user's platform-authorized Google accounts, exchanges "
        "short-lived access tokens via credentials/* reverse-RPC, and "
        "fetches recent Gmail messages with them."
    ),
    "author": "Anna Developer",
    "credentials": [
        {
            "name": "GOOGLE_ACCESS_TOKEN",
            "display_name": "Google access token (default account)",
            "description": (
                "Injected by the platform when the user has authorized "
                "Google. Also unlocks the credentials/* reverse-RPC surface "
                "for the 'google' provider."
            ),
            "required": False,
            "sensitive": True,
        }
    ],
    "tools": [
        {
            "name": "list_accounts",
            "description": (
                "List the user's authorized accounts for a platform provider "
                "(metadata only — emails, default flag, status, scopes; "
                "never tokens). Reverse-RPC: credentials/listAccounts."
            ),
            "parameters": [
                {
                    "name": "provider",
                    "type": "string",
                    "description": "Platform provider id.",
                    "required": False,
                    "default": "google",
                },
            ],
        },
        {
            "name": "token_info",
            "description": (
                "Exchange a short-lived access token for ONE account and "
                "report masked token info (prefix, length, expiry, which "
                "account served it). Reverse-RPC: credentials/getToken. "
                "Omit 'account' for the user's default account; pass an "
                "account_id or email to target a specific one."
            ),
            "multi_account": True,
            "parameters": [
                {
                    "name": "provider",
                    "type": "string",
                    "description": "Platform provider id.",
                    "required": False,
                    "default": "google",
                },
            ],
        },
        {
            "name": "gmail_recent",
            "description": (
                "Fetch the user's most recent Gmail messages (From / Subject / "
                "Date / snippet — metadata only, never bodies or tokens). "
                "Exchanges a short-lived token via credentials/getToken, then "
                "calls the Gmail REST API server-side. Requires the account's "
                "Google authorization to include the gmail.readonly scope. "
                "Omit 'account' for the default account."
            ),
            "multi_account": True,
            "parameters": [
                {
                    "name": "max_results",
                    "type": "number",
                    "description": "How many messages to fetch (1-10).",
                    "required": False,
                    "default": 5,
                },
            ],
        },
        {
            "name": "injected_credential_info",
            "description": (
                "Report whether the classic default-account credential "
                "injection (params.context.credentials.GOOGLE_ACCESS_TOKEN) "
                "was present for this invoke — masked. Compares the legacy "
                "startup-injection path with the on-demand getToken path."
            ),
            "parameters": [],
        },
    ],
}

credentials = CredentialsClient()


def _mask(token: str) -> dict:
    return {
        "token_prefix": (token[:8] + "…") if len(token) > 8 else "…",
        "token_length": len(token),
    }


# ─── Tool implementations ────────────────────────────────────────────


async def _list_accounts(*, provider: str = "google", **_ignored) -> dict:
    out = await credentials.list_accounts(provider=provider or "google")
    return {"provider": provider or "google", **out}


async def _resolve_account_id(provider: str, account: str) -> str | None | dict:
    """Turn an email or account_id into an account_id (None = default).

    Returns a dict (error payload) when an email doesn't match any
    authorized account.
    """
    account_id = (account or "").strip() or None
    # An email is a friendlier handle than an opaque account_id — resolve it.
    if account_id and "@" in account_id:
        listing = await credentials.list_accounts(provider=provider)
        matches = [
            a
            for a in listing.get("accounts", [])
            if (a.get("email") or "").lower() == account_id.lower()
        ]
        if not matches:
            return {
                "provider": provider,
                "error": f"no authorized account with email {account_id!r}",
                "available_accounts": [
                    {"account_id": a.get("account_id"), "email": a.get("email")}
                    for a in listing.get("accounts", [])
                ],
            }
        account_id = matches[0]["account_id"]
    return account_id


async def _token_info(
    *, provider: str = "google", account: str = "", **_ignored
) -> dict:
    provider = provider or "google"
    account_id = await _resolve_account_id(provider, account)
    if isinstance(account_id, dict):  # email didn't resolve
        return account_id

    tok = await credentials.get_token(provider=provider, account_id=account_id)
    return {
        "provider": provider,
        "account_id": tok.get("account_id"),
        "expires_at": tok.get("expires_at"),
        **_mask(tok.get("access_token") or ""),
    }


# ─── Gmail (token consumer) ──────────────────────────────────────────

_GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me"


def _gmail_get(token: str, path: str, params: dict | None = None) -> dict:
    """Blocking GET against the Gmail REST API (stdlib only)."""
    url = _GMAIL_API + path
    if params:
        url += "?" + urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(
        url, headers={"Authorization": f"Bearer {token}"}
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")[:300]
        hint = (
            " (missing gmail.readonly scope on this account's authorization?)"
            if e.code in (401, 403)
            else ""
        )
        raise RuntimeError(f"Gmail API {e.code} on {path}{hint}: {body}") from None


def _header_map(message: dict) -> dict:
    return {
        (h.get("name") or "").lower(): h.get("value") or ""
        for h in (message.get("payload") or {}).get("headers") or []
    }


async def _gmail_recent(
    *, account: str = "", max_results: float = 5, **_ignored
) -> dict:
    account_id = await _resolve_account_id("google", account)
    if isinstance(account_id, dict):  # email didn't resolve
        return account_id

    n = max(1, min(10, int(max_results or 5)))
    tok = await credentials.get_token(provider="google", account_id=account_id)
    token = tok.get("access_token") or ""

    listing = await asyncio.to_thread(
        _gmail_get, token, "/messages", {"maxResults": n}
    )
    ids = [m["id"] for m in (listing.get("messages") or [])]
    metas = await asyncio.gather(
        *(
            asyncio.to_thread(
                _gmail_get,
                token,
                f"/messages/{mid}",
                {
                    "format": "metadata",
                    "metadataHeaders": ["From", "Subject", "Date"],
                },
            )
            for mid in ids
        )
    )
    messages = []
    for meta in metas:
        headers = _header_map(meta)
        messages.append(
            {
                "id": meta.get("id"),
                "from": headers.get("from", ""),
                "subject": headers.get("subject") or "(no subject)",
                "date": headers.get("date", ""),
                "snippet": meta.get("snippet", ""),
            }
        )
    return {
        "provider": "google",
        "account_id": tok.get("account_id"),
        "count": len(messages),
        "messages": messages,
    }


async def _injected_credential_info(*, _context: dict, **_ignored) -> dict:
    injected = (_context.get("credentials") or {}).get("GOOGLE_ACCESS_TOKEN")
    if not injected:
        return {
            "injected": False,
            "note": (
                "no GOOGLE_ACCESS_TOKEN injected — the user may not have "
                "authorized Google, or the default account credential is "
                "not usable"
            ),
        }
    return {"injected": True, **_mask(injected)}


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
    if proto != PROTOCOL_VERSION_V2:
        credentials.disable(
            f"host did not negotiate v2 (offered protocolVersion={proto!r}); "
            "credentials/* requires Executa protocol 2.0"
        )
    return _make_response(
        req_id,
        result={
            "protocolVersion": proto if proto in ("1.1", "2.0") else "2.0",
            "serverInfo": {
                "name": MANIFEST["display_name"],
                "version": MANIFEST["version"],
            },
            "client_capabilities": {},
            "capabilities": {},
        },
    )


_loop = asyncio.new_event_loop()
_loop_thread = threading.Thread(target=_loop.run_forever, daemon=True)
_loop_thread.start()


def _handle_invoke(req_id, params: dict) -> dict:
    tool = params.get("tool")
    args = params.get("arguments") or {}
    context = params.get("context") or {}

    if tool == "list_accounts":
        coro = _list_accounts(**args)
    elif tool == "token_info":
        coro = _token_info(**args)
    elif tool == "gmail_recent":
        coro = _gmail_recent(**args)
    elif tool == "injected_credential_info":
        coro = _injected_credential_info(_context=context, **args)
    else:
        return _make_response(
            req_id,
            error={"code": -32601, "message": f"Unknown tool: {tool}"},
        )

    fut = asyncio.run_coroutine_threadsafe(coro, _loop)
    try:
        data = fut.result(timeout=60.0)
    except CredentialsError as e:
        return _make_response(
            req_id,
            error={"code": e.code, "message": e.message, "data": e.data},
        )
    except (TypeError, ValueError) as e:
        return _make_response(
            req_id,
            error={"code": -32602, "message": f"Invalid params: {e}"},
        )
    except Exception as e:  # noqa: BLE001
        return _make_response(
            req_id,
            error={"code": -32603, "message": f"Tool execution failed: {e}"},
        )
    return _make_response(
        req_id, result={"success": True, "tool": tool, "data": data}
    )


def _handle_message(line: str) -> None:
    try:
        msg = json.loads(line)
    except json.JSONDecodeError:
        _write_frame(
            _make_response(None, error={"code": -32700, "message": "Parse error"})
        )
        return

    # Reverse-RPC reply from host → resolve a pending credentials future.
    if "method" not in msg:
        if credentials.dispatch_response(msg):
            return
        print(f"⚠️  unmatched response id={msg.get('id')!r}", file=sys.stderr)
        return

    method = msg.get("method")
    req_id = msg.get("id")
    params = msg.get("params") or {}

    if method == "initialize":
        resp = _handle_initialize(req_id, params)
    elif method == "describe":
        resp = _make_response(req_id, result=MANIFEST)
    elif method == "invoke":
        resp = _handle_invoke(req_id, params)
    elif method == "health":
        resp = _make_response(
            req_id,
            result={
                "status": "healthy",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "version": MANIFEST["version"],
            },
        )
    elif method == "shutdown":
        resp = _make_response(req_id, result={"ok": True})
    else:
        resp = _make_response(
            req_id,
            error={"code": -32601, "message": f"Method not found: {method}"},
        )

    if req_id is not None:
        _write_frame(resp)


def main() -> None:
    print("🔌 credentials-via-executa plugin started", file=sys.stderr)
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
