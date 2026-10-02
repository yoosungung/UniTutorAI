#!/usr/bin/env python3
"""TDD for Pages domain attach idempotency helpers."""
from __future__ import annotations

import unittest

from pages_domain_attached import attach_http_ok, is_attached


class PagesDomainAttachedTest(unittest.TestCase):
    def test_compact_json_name(self) -> None:
        raw = '{"success":true,"result":[{"name":"tutor.askwho.net","status":"active"}]}'
        self.assertTrue(is_attached(raw, "tutor.askwho.net"))
        self.assertFalse(is_attached(raw, "other.askwho.net"))

    def test_pretty_json_name_with_spaces(self) -> None:
        raw = '{\n  "result": [ { "name": "tutor.askwho.net" } ]\n}'
        self.assertTrue(is_attached(raw, "tutor.askwho.net"))

    def test_empty_result(self) -> None:
        self.assertFalse(is_attached('{"result":[]}', "tutor.askwho.net"))

    def test_attach_ok_codes(self) -> None:
        self.assertTrue(attach_http_ok(200, "{}"))
        self.assertTrue(attach_http_ok(201, "{}"))
        self.assertTrue(attach_http_ok(400, '{"errors":[{"message":"already exists"}]}'))
        self.assertFalse(attach_http_ok(403, '{"errors":[{"message":"forbidden"}]}'))
        self.assertFalse(attach_http_ok(400, '{"errors":[{"message":"zone mismatch"}]}'))


if __name__ == "__main__":
    unittest.main()
