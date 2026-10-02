#!/usr/bin/env python3
"""Idempotent Cloudflare Pages domain attach helpers (CI Ensure step)."""
from __future__ import annotations

import json
import re
import sys


def is_attached(list_json: str, domain: str) -> bool:
    data = json.loads(list_json)
    names = [x.get("name") for x in (data.get("result") or [])]
    return domain in names


def attach_http_ok(http_code: int, body: str) -> bool:
    if http_code in (200, 201):
        return True
    return bool(re.search(r"already|exist|duplicate", body or "", re.I))


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("usage: pages_domain_attached.py check <domain> | attach-ok <code>", file=sys.stderr)
        return 2
    cmd = argv[1]
    if cmd == "check":
        domain = argv[2]
        ok = is_attached(sys.stdin.read(), domain)
        return 0 if ok else 1
    if cmd == "attach-ok":
        code = int(argv[2])
        ok = attach_http_ok(code, sys.stdin.read())
        return 0 if ok else 1
    print(f"unknown command: {cmd}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
