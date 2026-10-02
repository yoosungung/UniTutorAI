"""TDD for Pages custom-domain zone DNS (CNAME) ensure helpers."""
from __future__ import annotations

import unittest

from pages_domain_dns import (
    dns_write_ok,
    domain_status,
    has_dns_record,
    zone_id_from_list,
    zone_tag_for_domain,
)


class DomainStatusTests(unittest.TestCase):
    def test_status_active(self) -> None:
        raw = '{"result":[{"name":"tutor.askwho.net","status":"pending"}]}'
        self.assertEqual(domain_status(raw, "tutor.askwho.net"), "pending")

    def test_missing(self) -> None:
        self.assertIsNone(domain_status('{"result":[]}', "tutor.askwho.net"))


class ZoneTagTests(unittest.TestCase):
    def test_zone_tag(self) -> None:
        raw = (
            '{"result":[{"name":"tutor.askwho.net","status":"pending",'
            '"zone_tag":"ea509cac6526cf092c630cdabf45ae50"}]}'
        )
        self.assertEqual(
            zone_tag_for_domain(raw, "tutor.askwho.net"),
            "ea509cac6526cf092c630cdabf45ae50",
        )

    def test_missing_tag(self) -> None:
        raw = '{"result":[{"name":"tutor.askwho.net","status":"pending"}]}'
        self.assertIsNone(zone_tag_for_domain(raw, "tutor.askwho.net"))


class ZoneIdTests(unittest.TestCase):
    def test_first_zone(self) -> None:
        raw = '{"result":[{"id":"zone-1","name":"askwho.net"}]}'
        self.assertEqual(zone_id_from_list(raw), "zone-1")

    def test_empty(self) -> None:
        self.assertIsNone(zone_id_from_list('{"result":[]}'))


class DnsRecordTests(unittest.TestCase):
    def test_cname_present(self) -> None:
        raw = (
            '{"result":[{"type":"CNAME","name":"tutor.askwho.net",'
            '"content":"unitutor.pages.dev"}]}'
        )
        self.assertTrue(has_dns_record(raw, "tutor.askwho.net"))

    def test_absent(self) -> None:
        self.assertFalse(has_dns_record('{"result":[]}', "tutor.askwho.net"))


class DnsWriteOkTests(unittest.TestCase):
    def test_created(self) -> None:
        self.assertTrue(dns_write_ok(200, '{"success":true}'))
        self.assertTrue(dns_write_ok(201, "{}"))

    def test_already_exists(self) -> None:
        self.assertTrue(dns_write_ok(400, '{"errors":[{"message":"Record already exists"}]}'))

    def test_forbidden(self) -> None:
        self.assertFalse(dns_write_ok(403, '{"errors":[{"message":"Authentication error"}]}'))


if __name__ == "__main__":
    unittest.main()
