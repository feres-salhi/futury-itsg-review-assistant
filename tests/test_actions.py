"""Tests for the fail-closed SÜSIE action registry (itsg.actions).

Fail-closed contract under test:
- unknown action ids are refused at propose time (ValueError);
- read-only actions execute client-side without a token;
- mutating and decision-gate actions need a fresh, unexpired, action-bound
  confirmation token (PermissionError otherwise);
- decision-gate actions additionally need a non-blank human reviewer and a
  gate id inside the action's allowed set, and stamp the human as
  decision_maker with executor "susie-assistant".
"""
from __future__ import annotations

import tempfile
import unittest
from pathlib import Path
from unittest import mock

from itsg import actions
from itsg.store import Store


class ActionRegistryTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.store_root = Path(self.tmp.name) / "data" / "susie"
        actions._PENDING.clear()

    # -- propose ---------------------------------------------------------------

    def test_unknown_action_propose_raises(self):
        with self.assertRaises(ValueError):
            actions.propose("deploy_missiles", {}, "s1")

    def test_read_only_needs_no_token(self):
        out = actions.propose("select_case", {"case_id": "TC-002"}, "s1")
        self.assertIsNone(out["confirm_token"])
        self.assertEqual(out["action"]["id"], "select_case")
        self.assertEqual(out["action"]["params"], {"case_id": "TC-002"})

    def test_mutating_propose_returns_token(self):
        out = actions.propose("save_note", {"text": "Notiz", "case_id": "TC-002"}, "s1")
        self.assertTrue(out["confirm_token"])
        self.assertEqual(out["action"]["id"], "save_note")

    def test_gate_action_propose_returns_token(self):
        out = actions.propose(
            "request_release", {"gate": "G6", "decision": "escalated", "rationale": "r"}, "s1")
        self.assertTrue(out["confirm_token"])

    # -- read-only execution ----------------------------------------------------

    def test_read_only_executes_without_token(self):
        out = actions.execute("filter_cases", {"query": "EAZ"}, None, self.store_root, "Amr")
        self.assertEqual(out, {"executed": True, "mode": "client"})

    # -- mutating execution ------------------------------------------------------

    def test_mutating_execution_without_token_refused(self):
        with self.assertRaises(PermissionError):
            actions.execute("save_note", {"text": "x"}, None, self.store_root, "Amr")

    def test_mutating_execution_with_wrong_token_refused(self):
        with self.assertRaises(PermissionError):
            actions.execute("save_note", {"text": "x"}, "not-a-real-token", self.store_root, "Amr")

    def test_mutating_execution_with_token_writes_note(self):
        tok = actions.propose("save_note", {"text": "Notiz", "case_id": "TC-002"}, "s1")["confirm_token"]
        out = actions.execute(
            "save_note", {"text": "Notiz", "case_id": "TC-002"}, tok, self.store_root, "Amr")
        self.assertTrue(out["executed"])
        notes = Store(self.store_root).all("note")
        self.assertTrue(any(n["text"] == "Notiz" for n in notes))
        self.assertTrue(any(n["author"] == "Amr" for n in notes))
        self.assertTrue(any(n["id"].startswith("NOTE-") for n in notes))

    def test_token_bound_to_action(self):
        tok = actions.propose("save_note", {"text": "Notiz", "case_id": "TC-002"}, "s1")["confirm_token"]
        with self.assertRaises(PermissionError):
            actions.execute("export_report", {}, tok, self.store_root, "Amr")

    def test_expired_token_refused(self):
        tok = actions.propose("save_note", {"text": "Notiz", "case_id": "TC-002"}, "s1")["confirm_token"]
        future = actions._now() + actions.CONFIRM_TTL_S + 1
        with mock.patch.object(actions, "_now", return_value=future):
            with self.assertRaises(PermissionError):
                actions.execute(
                    "save_note", {"text": "Notiz", "case_id": "TC-002"}, tok, self.store_root, "Amr")

    def test_token_cannot_be_replayed(self):
        tok = actions.propose("save_note", {"text": "Notiz", "case_id": "TC-002"}, "s1")["confirm_token"]
        actions.execute("save_note", {"text": "Notiz", "case_id": "TC-002"}, tok, self.store_root, "Amr")
        with self.assertRaises(PermissionError):
            actions.execute("save_note", {"text": "Nochmal"}, tok, self.store_root, "Amr")

    def test_token_bound_to_session(self):
        tok = actions.propose("save_note", {"text": "Notiz", "case_id": "TC-002"}, "s1")["confirm_token"]
        with self.assertRaises(PermissionError):
            actions.execute(
                "save_note", {"text": "Notiz", "case_id": "TC-002"}, tok, self.store_root,
                "Amr", session_id="s2")

    # -- export_report ------------------------------------------------------------

    def test_export_report_returns_all_kinds(self):
        store = Store(self.store_root)
        store.put("report", {"id": "RPT-1"})
        store.put("test_case", {"id": "TC-1"})
        store.put("note", {"id": "NOTE-1", "text": "x"})
        store.put("gate", {"id": "GATE-G6-1"})
        tok = actions.propose("export_report", {}, "s1")["confirm_token"]
        out = actions.execute("export_report", {}, tok, self.store_root, "Amr")
        self.assertEqual([r["id"] for r in out["report"]], ["RPT-1"])
        self.assertEqual([r["id"] for r in out["cases"]], ["TC-1"])
        self.assertEqual([r["id"] for r in out["notes"]], ["NOTE-1"])
        self.assertEqual([r["id"] for r in out["gates"]], ["GATE-G6-1"])
        self.assertEqual(out["generated_by"], "Amr")
        self.assertEqual(out["executed_by"], "susie-assistant")

    # -- decision-gate execution ---------------------------------------------------

    def test_gate_without_token_refused(self):
        with self.assertRaises(PermissionError):
            actions.execute(
                "request_release",
                {"gate": "G6", "decision": "escalated", "rationale": "r"},
                None, self.store_root, "Amr")

    def test_gate_without_reviewer_refused(self):
        tok = actions.propose(
            "request_release", {"gate": "G6", "decision": "escalated", "rationale": "r"}, "s1"
        )["confirm_token"]
        with self.assertRaises(PermissionError):
            actions.execute(
                "request_release",
                {"gate": "G6", "decision": "escalated", "rationale": "r"},
                tok, self.store_root, "  ")

    def test_gate_with_wrong_gate_id_refused(self):
        tok = actions.propose(
            "request_release", {"gate": "G1", "decision": "escalated", "rationale": "r"}, "s1"
        )["confirm_token"]
        with self.assertRaises(PermissionError):
            actions.execute(
                "request_release",
                {"gate": "G1", "decision": "escalated", "rationale": "r"},
                tok, self.store_root, "Amr")

    def test_gate_with_unknown_decision_raises(self):
        tok = actions.propose(
            "request_release", {"gate": "G6", "decision": "auto_approved", "rationale": "r"}, "s1"
        )["confirm_token"]
        with self.assertRaises(ValueError):
            actions.execute(
                "request_release",
                {"gate": "G6", "decision": "auto_approved", "rationale": "r"},
                tok, self.store_root, "Amr")

    def test_gate_records_human_as_decision_maker(self):
        params = {
            "gate": "G6", "decision": "escalated",
            "rationale": "release blocked pending domain review",
        }
        tok = actions.propose("request_release", params, "s1")["confirm_token"]
        out = actions.execute("request_release", params, tok, self.store_root, "Amr")
        self.assertEqual(out["decision_maker"], "Amr")
        self.assertEqual(out["executor"], "susie-assistant")
        gates = Store(self.store_root).all("gate")
        self.assertTrue(any(
            g["gate"] == "G6" and g["reviewer"] == "Amr" and g["decision"] == "escalated"
            for g in gates))

    def test_record_review_state_allows_g4_and_g5_only(self):
        for gate in ("G4", "G5"):
            params = {"gate": gate, "decision": "approved", "rationale": "ok"}
            tok = actions.propose("record_review_state", params, "s1")["confirm_token"]
            out = actions.execute("record_review_state", params, tok, self.store_root, "Amr")
            self.assertEqual(out["decision_maker"], "Amr")
        params = {"gate": "G6", "decision": "approved", "rationale": "ok"}
        tok = actions.propose("record_review_state", params, "s1")["confirm_token"]
        with self.assertRaises(PermissionError):
            actions.execute("record_review_state", params, tok, self.store_root, "Amr")

    # -- run_comparison (lazy demo import) -------------------------------------------

    def test_run_comparison_runs_offline_demo(self):
        tok = actions.propose("run_comparison", {}, "s1")["confirm_token"]
        out = actions.execute("run_comparison", {}, tok, self.store_root, "Amr")
        self.assertEqual(out, {"executed": True, "mode": "server"})
        store = Store(self.store_root)
        self.assertTrue(store.all("report"))
        self.assertTrue(store.events())


if __name__ == "__main__":
    unittest.main()
