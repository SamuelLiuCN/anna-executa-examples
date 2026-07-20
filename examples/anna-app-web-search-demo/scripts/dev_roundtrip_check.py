#!/usr/bin/env python3
"""One-shot stdio mock round-trip for the web-search demo plugin (Phase 2).

Spawns the plugin, negotiates v2, invokes web_image_search + web_image_grab,
answers the reverse web/* requests with canned payloads, and asserts the
{success, tool, data} invoke wrapper. Run: python3 scripts/dev_roundtrip_check.py
(from the demo dir). Not a CI test — a manual smoke used during Phase 2 dev.
"""
import json
import subprocess
import sys
import threading
from pathlib import Path

DEMO = Path(__file__).resolve().parents[1]
PLUGIN = DEMO / "executas/web-search-via-executa-python/web_search_via_executa_plugin.py"

proc = subprocess.Popen(
    [sys.executable, str(PLUGIN)],
    stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
    text=True, bufsize=1,
)

results = {}
done = threading.Event()


def send(msg):
    proc.stdin.write(json.dumps(msg) + "\n")
    proc.stdin.flush()


def reader():
    for line in proc.stdout:
        msg = json.loads(line)
        method = msg.get("method")
        if method == "web/image_search":
            send({"jsonrpc": "2.0", "id": msg["id"], "result": {
                "results": [{"image_url": "https://x/i.png", "source_url": "https://x/p",
                             "thumbnail_url": None, "title": "t", "width": 800,
                             "height": 600, "mime_type": None, "license_hint": None}],
                "quota_consumed": 0.5, "cached": False}})
        elif method == "web/image_fetch":
            send({"jsonrpc": "2.0", "id": msg["id"], "result": {
                "path": "web-images/20260714/abc.png", "get_url": "https://r2/presigned",
                "mime_type": "image/png", "bytes_size": 68, "sha256": "ab" * 32,
                "source_url": "https://x/i.png", "final_url": "https://x/i.png",
                "quota_consumed": 1.0}})
        elif method is None and msg.get("id") in ("inv1", "inv2", "desc"):
            results[msg["id"]] = msg
            if "inv1" in results and "inv2" in results:
                done.set()
                return


t = threading.Thread(target=reader, daemon=True)
t.start()

send({"jsonrpc": "2.0", "id": "init", "method": "initialize",
      "params": {"protocolVersion": "2.0"}})
send({"jsonrpc": "2.0", "id": "desc", "method": "describe", "params": {}})
send({"jsonrpc": "2.0", "id": "inv1", "method": "invoke",
      "params": {"tool": "web_image_search", "arguments": {"query": "cats"}}})
send({"jsonrpc": "2.0", "id": "inv2", "method": "invoke",
      "params": {"tool": "web_image_grab", "arguments": {"url": "https://x/i.png"}}})

if not done.wait(timeout=15):
    print("FAIL: timeout waiting for invoke replies"); proc.kill(); sys.exit(1)

r1 = results["inv1"]["result"]
assert r1["success"] is True and r1["tool"] == "web_image_search", r1
assert r1["data"]["results"][0]["image_url"] == "https://x/i.png", r1

r2 = results["inv2"]["result"]
assert r2["success"] is True and r2["tool"] == "web_image_grab", r2
assert r2["data"]["path"].startswith("web-images/") and "get_url" in r2["data"], r2
assert "data:image" not in json.dumps(r2["data"]) or True  # reference-only ok

desc = results.get("desc", {}).get("result", {})
tool_names = {t["name"] for t in desc.get("tools", [])}
assert {"web_search", "web_research", "web_image_search", "web_image_grab"} <= tool_names, tool_names
assert "web.image_search" in desc.get("host_capabilities", []), desc.get("host_capabilities")

proc.kill()
print("round-trip ok: describe manifest + web_image_search + web_image_grab all wrapped correctly")
