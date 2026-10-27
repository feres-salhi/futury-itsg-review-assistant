"""T10-048/049 follow-up — single-case report PDF (owner request 2026-10-27).

build_report_pdf(case_id=...) filters the store artifact to one case, renders
an explicit Einzelfall note, and fails with a clean error for unknown cases.
"""
from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from itsg.webserver import build_report_pdf


def _store(store_root: Path) -> None:
    artifact = {
        "report_id": "RPT-TEST-1",
        "template_id": "TPL-SYNTH-1",
        "template_version": "synthetic-0.1",
        "template_warning": "SYNTHETIC TEMPLATE PROFILE.",
        "official_form_id": None,
        "renderer_version": "itsg.renderer/0.1.0",
        "field_map_version": "itsg.fieldmap/synth-1",
        "generated_at": "2026-10-27T10:00:00+00:00",
        "compliance_claim": False,
        "compliance_claim_reason": "synthetic template",
        "results": [
            {"case_id": "EAZ-001", "criterion_id": "CRIT-EAZ-1", "result_status": "PASS",
             "reason": "observed output matches expected value", "evidence_links": ["EAZ-001"]},
            {"case_id": "EAZ-003", "criterion_id": "CRIT-EAZ-1", "result_status": "MISMATCH",
             "reason": "EAZ-BEGINN-1: expected '20260501', observed '20260601'",
             "evidence_links": ["EAZ-003"]},
        ],
    }
    (store_root / "report.artifact.json").write_text(
        json.dumps(artifact, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


class SingleCaseReportTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.store = Path(self.tmp.name)
        _store(self.store)

    def _text(self, pdf: bytes) -> str:
        import fitz
        import io
        doc = fitz.open(stream=pdf, filetype="pdf")
        text = "\n".join(doc[i].get_text() for i in range(doc.page_count))
        doc.close()
        return text

    def test_single_case_report_contains_only_that_case(self) -> None:
        pdf = build_report_pdf(self.store, case_id="EAZ-003")
        text = self._text(pdf)
        self.assertIn("EAZ-003", text)
        self.assertNotIn("EAZ-001", text)
        self.assertIn("Einzelfallbericht EAZ-003", text)

    def test_single_case_report_respects_language(self) -> None:
        pdf = build_report_pdf(self.store, case_id="EAZ-003", lang="en")
        self.assertIn("Single-case report EAZ-003", self._text(pdf))

    def test_unknown_case_is_a_clean_error(self) -> None:
        with self.assertRaises(ValueError):
            build_report_pdf(self.store, case_id="EAZ-999")

    def test_full_report_unchanged_without_case_id(self) -> None:
        pdf = build_report_pdf(self.store)
        text = self._text(pdf)
        self.assertIn("EAZ-001", text)
        self.assertIn("EAZ-003", text)


if __name__ == "__main__":
    unittest.main()
