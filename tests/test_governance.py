"""T10-049 Task 1 — governance payload endpoint (`itsg/governance.py`).

Wave R backend: one view payload for the native Freigaben queue, the Verlauf
timeline, and the human-label mapping for gates (copy rule: gate IDs are
storage identifiers, never UI copy — spec §5.6).
"""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from itsg import governance
from itsg.store import Store


class GovernanceTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.root = Path(self._tmp.name)
        self.addCleanup(self._tmp.cleanup)

    def put(self, kind: str, record: dict) -> None:
        Store(self.root).put(kind, record)

    def test_pending_groups_pending_items(self) -> None:
        self.put("source", {"id": "SRC-BP", "status": "needs_review", "title": "Beispielpapier"})
        self.put("source", {"id": "SRC-OK", "status": "approved"})
        self.put("criterion", {"id": "CRIT-1", "review_status": "draft"})
        self.put("criterion", {"id": "CRIT-OK", "review_status": "approved"})
        self.put("test_case", {"id": "TC-1", "review_status": "draft"})
        self.put("finding", {"id": "F-1", "status": "MISMATCH"})

        payload = governance.collect_governance(self.root)

        pending = {(item["kind"], item["id"]) for item in payload["pending"]}
        self.assertIn(("source", "SRC-BP"), pending)
        self.assertIn(("criterion", "CRIT-1"), pending)
        self.assertIn(("test_case", "TC-1"), pending)
        self.assertNotIn(("source", "SRC-OK"), pending)
        self.assertNotIn(("criterion", "CRIT-OK"), pending)
        self.assertNotIn(("finding", "F-1"), pending)
        by_id = {item["id"]: item for item in payload["pending"]}
        self.assertEqual(by_id["SRC-BP"]["label_key"], "pendingSource")
        self.assertEqual(by_id["CRIT-1"]["label_key"], "pendingDraft")
        self.assertEqual(by_id["SRC-BP"]["proposed_action"], "record_g0")

    def test_gates_carry_label_keys(self) -> None:
        self.put("gate", {"id": "GATE-G0-x", "gate": "G0", "reviewer": "Amr",
                          "decision": "approve", "rationale": "stimmt mit Papieer überein",
                          "affected_ids": ["SRC-BP"], "conditions": [], "decided_at": "2026-10-27T10:00:00Z"})

        payload = governance.collect_governance(self.root)

        self.assertEqual(len(payload["gates"]), 1)
        self.assertEqual(payload["gates"][0]["label_key"], "actSource")
        self.assertEqual(payload["gates"][0]["reviewer"], "Amr")

    def test_events_capped_to_newest_500(self) -> None:
        store = Store(self.root)
        for n in range(3000):
            store.put("note", {"id": f"N-{n}"})

        payload = governance.collect_governance(self.root)

        events = payload["events"]
        self.assertEqual(len(events), 500)
        seqs = [event["seq"] for event in events]
        self.assertEqual(seqs, sorted(seqs))
        self.assertEqual(seqs[-1], 3000)

    def test_empty_store_ok(self) -> None:
        payload = governance.collect_governance(self.root)

        self.assertTrue(payload["ok"])
        self.assertEqual(payload, {"ok": True, "pending": [], "gates": [], "events": []})

    def test_label_keys_complete(self) -> None:
        from itsg.gates import GATE_IDS

        for gate_id in GATE_IDS:
            self.assertIn(gate_id, governance.GATE_LABELS)


if __name__ == "__main__":
    unittest.main()
