#!/usr/bin/env python3
"""Zone DNS helpers so Pages custom domain has a public CNAME (CI Ensure)."""
from __future__ import annotations

import json
import re
import sys


def domain_status(list_json: str, domain: str) -> str | None:
    data = json.loads(list_json)
    for row in data.get("result") or []:
        if row.get("name") == domain:
            status = row.get("status")
            return str(status) if status is not None else None
    return None


def zone_tag_for_domain(list_json: str, domain: str) -> str | None:
    """Pages domains list includes zone_tag when the hostname maps to a CF zone."""
    data = json.loads(list_json)
    for row in data.get("result") or []:
        if row.get("name") == domain:
            tag = row.get("zone_tag")
            return str(tag) if tag else None
    return None


def zone_id_from_list(zones_json: str) -> str | None:
    data = json.loads(zones_json)
    rows = data.get("result") or []
    if not rows:
        return None
    zid = rows[0].get("id")
    return str(zid) if zid else None


def has_dns_record(dns_list_json: str, hostname: str) -> bool:
    data = json.loads(dns_list_json)
    for row in data.get("result") or []:
        if row.get("name") == hostname:
            return True
    return False


def dns_write_ok(http_code: int, body: str) -> bool:
    if http_code in (200, 201):
        return True
    return bool(re.search(r"already|exist|duplicate", body or "", re.I))


def dns_list_ok(http_code: int) -> bool:
    return http_code == 200


def dns_list_soft_skip(http_code: int) -> bool:
    """403 = token lacks Zone DNS Read; Dashboard owns CNAME — skip ensure, continue smoke."""
    return http_code == 403


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print(
            "usage: pages_domain_dns.py status <domain> | zone-tag <domain> | "
            "zone-id | has-record <host> | dns-ok <code> | "
            "dns-list-ok <code> | dns-list-soft-skip <code>",
            file=sys.stderr,
        )
        return 2
    cmd = argv[1]
    if cmd == "status":
        domain = argv[2]
        status = domain_status(sys.stdin.read(), domain)
        if status is None:
            return 1
        print(status)
        return 0
    if cmd == "zone-tag":
        domain = argv[2]
        tag = zone_tag_for_domain(sys.stdin.read(), domain)
        if not tag:
            return 1
        print(tag)
        return 0
    if cmd == "zone-id":
        zid = zone_id_from_list(sys.stdin.read())
        if not zid:
            return 1
        print(zid)
        return 0
    if cmd == "has-record":
        host = argv[2]
        return 0 if has_dns_record(sys.stdin.read(), host) else 1
    if cmd == "dns-ok":
        code = int(argv[2])
        return 0 if dns_write_ok(code, sys.stdin.read()) else 1
    if cmd == "dns-list-ok":
        return 0 if dns_list_ok(int(argv[2])) else 1
    if cmd == "dns-list-soft-skip":
        return 0 if dns_list_soft_skip(int(argv[2])) else 1
    print(f"unknown command: {cmd}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
