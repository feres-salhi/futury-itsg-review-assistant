"""T10-054 — upload inbox and the five onboarding jobs.

Contract under test:
- save_upload: server-issued INB-n ids, sha256, extension allowlist, size cap,
  path-traversal-safe names — fail closed on every violation;
- register_regulation / add_manual_case: honest pending-approval records,
  never a silently integrated source or case;
- import_software_report: adopted TEEL0 parser (run_review, T10-031) on a
  synthetic fixture; malformed input → honest ValueError;
- create_case_from_reference / create_random_case: designer role behind the
  privacy airlock (fail closed), drafts stored pending review, agent_run
  envelope persisted; no criteria with a cited basis → honest refusal.
"""
from __future__ import annotations

import hashlib
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from itsg import actions, jobs
from itsg.store import Store


def _designer_run(cases):
    class FakeRun:
        run_id = "RUN-FAKE-1"
        status = "candidate"
        result = {"cases": cases}
        def to_dict(self):
            return {"run_id": self.run_id, "status": self.status, "result": self.result}
    return FakeRun()


class UploadTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store_root = Path(self.tmp.name) / "store"
        self.store_root.mkdir()

    def tearDown(self):
        self.tmp.cleanup()

    def test_save_upload_issues_ids_and_hash(self):
        rec = jobs.save_upload(self.store_root, "amendment.xml", b"<rule/>")
        self.assertEqual(rec["id"], "INB-1")
        self.assertEqual(rec["original_name"], "amendment.xml")
        self.assertEqual(rec["sha256"], hashlib.sha256(b"<rule/>").hexdigest())
        self.assertTrue((jobs.inbox_dir(self.store_root) / rec["stored_name"]).exists())
        rec2 = jobs.save_upload(self.store_root, "other.md", b"# note")
        self.assertEqual(rec2["id"], "INB-2")

    def test_save_upload_rejects_bad_type_and_traversal(self):
        with self.assertRaises(ValueError):
            jobs.save_upload(self.store_root, "evil.exe", b"MZ")
        with self.assertRaises(ValueError):
            jobs.save_upload(self.store_root, "empty.txt", b"")
        with self.assertRaises(ValueError):
            jobs.save_upload(self.store_root, "", b"x")
        # a client path is metadata, never the identity
        rec = jobs.save_upload(self.store_root, "../../etc/passwd.txt", b"x")
        self.assertEqual(rec["original_name"], "passwd.txt")
        self.assertNotIn("..", rec["stored_name"])

    def test_save_upload_size_cap(self):
        with mock.patch.object(jobs, "MAX_UPLOAD_BYTES", 8):
            with self.assertRaises(ValueError):
                jobs.save_upload(self.store_root, "big.txt", b"x" * 9)

    def test_unknown_file_id_is_honest(self):
        with self.assertRaises(ValueError):
            jobs.get_inbox_file(self.store_root, "INB-99")


class PendingRecordTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store_root = Path(self.tmp.name) / "store"
        self.store_root.mkdir()
        self.file = jobs.save_upload(self.store_root, "aenderung.xml", b"<xml/>")

    def tearDown(self):
        self.tmp.cleanup()

    def test_regulation_lands_pending_g0(self):
        result = jobs.register_regulation(self.store_root, self.file["id"], "Änderung §3.2")
        self.assertEqual(result["status"], "pending_g0")
        rec = Store(self.store_root).all("regulation_candidate")[0]
        self.assertEqual(rec["id"], "REG-1")
        self.assertEqual(rec["title"], "Änderung §3.2")
        self.assertEqual(rec["status"], "pending_g0")

    def test_manual_case_lands_pending_review(self):
        result = jobs.add_manual_case(self.store_root, file_id=self.file["id"])
        self.assertEqual(result["status"], "pending_review")
        rec = Store(self.store_root).all("case_draft")[0]
        self.assertEqual(rec["origin"], "manual")
        self.assertEqual(rec["status"], "pending_review")

    def test_manual_case_direct_text_and_empty_refusal(self):
        result = jobs.add_manual_case(self.store_root, text="Fall: Krankengeld …")
        self.assertTrue(result["case_draft_id"].startswith("DRAFT-"))
        with self.assertRaises(ValueError):
            jobs.add_manual_case(self.store_root)


TEEL0_FIXTURE = (
    # DSLW: DATUM-ERSTELLUNG @42, DATENSATZ-ID @99 (36), ABGABEGRUND @201
    "DSLW" + " " * 37 + "20260311"
    + " " * 49 + "D" * 36 + " " * 66 + "01"
    + "\n"
    # DBVO: GRUNDAV @5, AU-AB-AG @6 (a date), AU-AB-SV @14, KZ-AK-AU @22, ANZAHL-AU @31
    + "DBVO" + "1" + "20260101" + "87654321" + "1"
    + " " * 8 + "01"
    # one AU period @32: BEGINN 8, ENDE 8, 34 insurer-side chars
    + "20260101" + "20260401" + "x" * 34
)


class SoftwareReportTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store_root = Path(self.tmp.name) / "store"
        self.store_root.mkdir()
        self.file = jobs.save_upload(self.store_root, "teel0.txt",
                                     TEEL0_FIXTURE.encode("latin-1"))

    def tearDown(self):
        self.tmp.cleanup()

    def test_parse_and_store(self):
        result = jobs.import_software_report(self.store_root, self.file["id"])
        self.assertTrue(result["software_report_id"].startswith("TEEL0-IN-"))
        self.assertEqual(result["fields"]["ABGABEGRUND"], "01")
        self.assertEqual(result["periods"], 1)
        rec = Store(self.store_root).all("software_report")[0]
        self.assertEqual(rec["fields"]["AU-ZEITRAEUME"], [["01.01.2026", "01.04.2026"]])

    def test_malformed_report_is_honest(self):
        bad = jobs.save_upload(self.store_root, "broken.txt", b"kein TEEL0")
        with self.assertRaises(ValueError):
            jobs.import_software_report(self.store_root, bad["id"])


class CaseCreationTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store_root = Path(self.tmp.name) / "store"
        self.store_root.mkdir()

    def tearDown(self):
        self.tmp.cleanup()

    def test_reference_case_creates_drafts_behind_airlock(self):
        with mock.patch.object(jobs.llm, "run_role", return_value=_designer_run([
                {"case_type": "normal", "inputs": {"a": 1}, "expected": {"x": "1"},
                 "expected_basis": "BP §3.2", "rationale": "r"}])) as run_role:
            result = jobs.create_case_from_reference(self.store_root, "BP §3.2 Abs. 1")
        self.assertEqual(result["case_draft_ids"], ["DRAFT-1"])
        run_role.assert_called_once()
        drafts = Store(self.store_root).all("case_draft")
        self.assertEqual(drafts[0]["status"], "pending_review")
        self.assertEqual(drafts[0]["origin"], "designer")
        # the envelope is persisted like every other role run
        runs = Store(self.store_root).all("agent_run")
        self.assertEqual(runs[0]["run_id"], "RUN-FAKE-1")

    def test_random_case_needs_criteria_with_basis(self):
        with self.assertRaises(ValueError):
            jobs.create_random_case(self.store_root)

    def test_random_case_picks_a_criterion(self):
        Store(self.store_root).put("criterion", {
            "id": "CRIT-1", "expected_basis": "BP §3.2 Abs. 1: 6 Wochen"})
        with mock.patch.object(jobs.llm, "run_role", return_value=_designer_run([
                {"case_type": "boundary", "inputs": {}, "expected": {},
                 "expected_basis": "BP §3.2", "rationale": ""}])):
            result = jobs.create_random_case(self.store_root)
        self.assertEqual(result["case_draft_ids"], ["DRAFT-1"])

    def test_airlock_unavailable_fails_closed(self):
        with mock.patch.object(jobs, "Schleuse", None):
            with self.assertRaises(PermissionError):
                jobs.create_case_from_reference(self.store_root, "BP §3.2")

    def test_empty_reference_refused(self):
        with self.assertRaises(ValueError):
            jobs.create_case_from_reference(self.store_root, "  ")


class ActionPlumbingTests(unittest.TestCase):
    """The five jobs ride the existing propose → confirm → execute whitelist."""

    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store_root = Path(self.tmp.name) / "store"
        self.store_root.mkdir()
        jobs.save_upload(self.store_root, "aenderung.xml", b"<xml/>")

    def tearDown(self):
        self.tmp.cleanup()

    def test_register_regulation_needs_and_honors_token(self):
        root = self.store_root
        with self.assertRaises(PermissionError):
            actions.execute("register_regulation", {"file_id": "INB-1"}, None, root, "rev")
        proposal = actions.propose("register_regulation", {"file_id": "INB-1"}, "s1")
        result = actions.execute("register_regulation", {"file_id": "INB-1"},
                                 proposal["confirm_token"], root, "rev", "s1")
        self.assertEqual(result["status"], "pending_g0")
        # params-bound token: replay against different params is refused
        with self.assertRaises(PermissionError):
            actions.execute("register_regulation", {"file_id": "INB-2"},
                            proposal["confirm_token"], root, "rev", "s1")

    def test_create_random_case_via_whitelist(self):
        root = self.store_root
        Store(root).put("criterion", {
            "id": "CRIT-1", "expected_basis": "BP §3.2"})
        proposal = actions.propose("create_random_case", {}, "s1")
        with mock.patch.object(jobs.llm, "run_role", return_value=_designer_run([
                {"case_type": "normal", "inputs": {}, "expected": {},
                 "expected_basis": "BP §3.2", "rationale": ""}])):
            result = actions.execute("create_random_case", {},
                                     proposal["confirm_token"], root, "rev", "s1")
        self.assertEqual(result["status"], "pending_review")


if __name__ == "__main__":
    unittest.main()
