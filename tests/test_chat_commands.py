"""T10-042 + T10-051 — deterministic chat layers.

Two layers, one contract:
- ``deterministic_turn`` matches ONLY true navigation commands (start over,
  go back, next/prev case) before the gateway call — demo-critical, works
  with the gateway down.
- ``canned_turn`` holds every other canned answer (status, sources, case
  selection, comparison/export proposals, …). With a live gateway these fall
  through to the model (deterministic_turn → None); the canned text is the
  gateway-down fallback (chat._fallback).

Every reply carries the AgentRun envelope; mutating proposals carry
confirmation tokens.
"""
from __future__ import annotations

import unittest

from itsg import chat

STATE = {
    "cases": [
        {"id": "TC-1", "case_type": "normal", "status": "PASS", "reason": ""},
        {"id": "TC-2", "case_type": "boundary", "status": "MISMATCH",
         "reason": "EAZ-BEGINN-1: expected '20XX0101', observed '20XX0401'"},
        {"id": "TC-3", "case_type": "invalid", "status": "NOT_EVALUATED",
         "reason": "missing expected value"},
    ],
    "report": {"id": "RPT-1"},
}


class NavigationCommandTests(unittest.TestCase):
    """The pre-gateway layer: true navigation commands only."""

    def _turn(self, message: str):
        return chat.deterministic_turn(message, STATE, "T10-042", "s1")

    def test_start_over_proposes_read_only_action(self) -> None:
        for msg in ("Start over", "Neu starten", "fangen wir neu an", "reset"):
            with self.subTest(msg=msg):
                reply = self._turn(msg)
                self.assertIsNotNone(reply, msg)
                self.assertEqual(reply.action["id"], "start_over")
                self.assertFalse(reply.needs_confirmation)
                self.assertTrue(reply.agent_run.get("run_id"))

    def test_go_back(self) -> None:
        reply = self._turn("zurück")
        self.assertIsNotNone(reply)
        self.assertEqual(reply.action["id"], "go_back")

    def test_next_and_previous_case_stepping(self) -> None:
        for msg, expected in (("nächster Fall", "next_case"), ("next case", "next_case"),
                              ("weiter", "next_case"), ("vorheriger Fall", "prev_case"),
                              ("previous case", "prev_case")):
            with self.subTest(msg=msg):
                reply = self._turn(msg)
                self.assertIsNotNone(reply, msg)
                self.assertEqual(reply.action["id"], expected)

    def test_every_deterministic_reply_carries_envelope(self) -> None:
        for msg in ("Start over", "zurück", "nächster Fall", "vorheriger Fall"):
            with self.subTest(msg=msg):
                reply = self._turn(msg)
                self.assertTrue(reply.agent_run.get("run_id"))
                self.assertEqual(reply.agent_run.get("role"), chat.ROLE_SUSIE_ASSISTANT)
                self.assertTrue(reply.agent_run.get("result", {}).get("deterministic_command"))


class FallThroughToModelTests(unittest.TestCase):
    """Non-navigation intents reach the model; the canned text is fallback only."""

    def _deterministic(self, message: str):
        return chat.deterministic_turn(message, STATE, "T10-051", "s1")

    def _canned(self, message: str):
        return chat.canned_turn(message, STATE, "T10-051", "s1")

    def test_status_sources_cases_and_commands_fall_through(self) -> None:
        for msg in ("Wo stehe ich?", "Welche Quellen liegen zugrunde?",
                    "öffne fall tc-2", "zeig mir die abweichung",
                    "generiere testfälle aus dem gesetz",
                    "Starte den Abgleich mit der Softwareausgabe",
                    "Erstelle mir den Bericht als PDF"):
            with self.subTest(msg=msg):
                self.assertIsNone(self._deterministic(msg), msg)

    def test_canned_layer_still_answers_them_for_the_fallback(self) -> None:
        state = dict(STATE, source={
            "id": "SRC-BP", "title": "Beispielpapier DTA EEL",
            "issuer": "GKV-Spitzenverband", "version": "V13.3",
            "valid_from": "01.01.2027"})
        sources = chat.canned_turn("Welche Quellen liegen zugrunde?", state, "T10-051", "s1")
        self.assertIsNotNone(sources)
        self.assertIn("SRC-BP", sources.utterance)
        self.assertIn("Beispielpapier", sources.utterance)

        status = self._canned("Wo stehe ich?")
        self.assertIsNotNone(status)
        self.assertIsNone(status.action)
        self.assertIn("1 MISMATCH", status.utterance)
        self.assertIn("TC-2", status.utterance)
        self.assertIn("Beginn der Entgeltersatzleistung", status.utterance)

    def test_canned_select_case_with_human_reason(self) -> None:
        reply = self._canned("öffne fall tc-2")
        self.assertIsNotNone(reply)
        self.assertEqual(reply.action["id"], "open_evidence")
        self.assertEqual(reply.action["params"], {"case_id": "TC-2"})
        self.assertIn("erwartet 20XX0101", reply.utterance)

    def test_canned_deviation_without_case_id_selects_first_mismatch(self) -> None:
        reply = self._canned("zeig mir die abweichung")
        self.assertIsNotNone(reply)
        self.assertEqual(reply.action["params"], {"case_id": "TC-2"})

    def test_canned_run_comparison_and_export_need_confirmation(self) -> None:
        run = self._canned("generiere testfälle aus dem gesetz")
        self.assertIsNotNone(run)
        self.assertEqual(run.action["id"], "run_comparison")
        self.assertTrue(run.needs_confirmation)
        self.assertEqual(run.action["params"], {"live": True})
        export = self._canned("Erstelle mir den Bericht als PDF")
        self.assertIsNotNone(export)
        self.assertEqual(export.action["id"], "export_report")
        self.assertTrue(export.needs_confirmation)

    def test_canned_software_abgleich_proposes_offline_comparison(self) -> None:
        for msg in ("Starte den Abgleich mit der Softwareausgabe",
                    "Führe den Abgleich durch",
                    "Run the field comparison against the software output"):
            with self.subTest(msg=msg):
                reply = self._canned(msg)
                self.assertIsNotNone(reply, msg)
                self.assertEqual(reply.action["id"], "run_comparison")
                self.assertTrue(reply.needs_confirmation)
                self.assertEqual(reply.action["params"], {"live": False})
                self.assertRegex(reply.utterance.lower(), r"deterministisch|deterministic")

    def test_free_form_questions_match_neither_layer(self) -> None:
        for msg in ("Was ist eine Vorerkrankung?", "Warum ist der Himmel blau?"):
            with self.subTest(msg=msg):
                self.assertIsNone(self._deterministic(msg), msg)
                self.assertIsNone(self._canned(msg), msg)


if __name__ == "__main__":
    unittest.main()
