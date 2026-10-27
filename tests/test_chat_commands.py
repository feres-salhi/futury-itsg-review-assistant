"""T10-042 + T10-051/052 — deterministic chat layers.

Three layers, one contract:
- ``deterministic_turn`` (pre-gateway): navigation commands AND action jobs —
  fetch a NAMED case, run the comparison (offline/live), generate the report.
  The owner gets exactly what she asked for, model-independent; mutating
  proposals still carry the Ja/Nein confirm token (four-eyes intact).
- ``canned_turn``: everything above PLUS status/sources/help/topics/
  troubleshooting — the gateway-down fallback only; with a live gateway
  those questions reach the model (deterministic_turn → None).
- free-form questions match neither layer.
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


class ActionJobTests(unittest.TestCase):
    """T10-052: fetch a named case / run the comparison / generate the report
    work pre-gateway, reliably, on the owner's explicit request."""

    def _turn(self, message: str):
        return chat.deterministic_turn(message, STATE, "T10-052", "s1")

    def test_fetch_a_named_case(self) -> None:
        for msg, expected in (("öffne fall tc-2", "TC-2"), ("open case TC-2", "TC-2"),
                              ("zeig mir TC-3", "TC-3"), ("hol mir fall 2", "TC-2")):
            with self.subTest(msg=msg):
                reply = self._turn(msg)
                self.assertIsNotNone(reply, msg)
                self.assertEqual(reply.action["id"], "open_evidence")
                self.assertEqual(reply.action["params"], {"case_id": expected})
                self.assertFalse(reply.needs_confirmation)  # read-only: executes at once
        # the fetch names the deviation, not role trivia
        ut = self._turn("öffne fall tc-2").utterance
        self.assertIn("erwartet 20XX0101", ut)
        self.assertNotIn("GLM-Flash", ut)
        self.assertNotIn("Kolibri", ut)

    def test_topic_word_without_id_falls_through_to_model(self) -> None:
        # "die Abweichung"/"der Fehler" without a named case is a QUESTION —
        # SÜSIE must not guess which case to open (T10-052)
        for msg in ("zeig mir die abweichung", "gibt es fehler?", "was ist mit den fällen los?"):
            with self.subTest(msg=msg):
                self.assertIsNone(self._turn(msg), msg)

    def test_run_comparison_offline_deterministic(self) -> None:
        for msg in ("Starte den Abgleich mit der Softwareausgabe",
                    "Führe den Abgleich durch",
                    "Run the field comparison against the software output"):
            with self.subTest(msg=msg):
                reply = self._turn(msg)
                self.assertIsNotNone(reply, msg)
                self.assertEqual(reply.action["id"], "run_comparison")
                self.assertTrue(reply.needs_confirmation)
                self.assertEqual(reply.action["params"], {"live": False})
                self.assertRegex(reply.utterance.lower(), r"deterministisch|deterministic")
                self.assertNotIn("GLM-Flash", reply.utterance)

    def test_generate_test_cases_deterministic(self) -> None:
        reply = self._turn("generiere testfälle aus dem gesetz")
        self.assertIsNotNone(reply)
        self.assertEqual(reply.action["id"], "run_comparison")
        self.assertTrue(reply.needs_confirmation)
        self.assertEqual(reply.action["params"], {"live": True})
        self.assertNotIn("Kolibri", reply.utterance)  # no role narration

    def test_generate_report_deterministic(self) -> None:
        reply = self._turn("Erstelle mir den Bericht als PDF")
        self.assertIsNotNone(reply)
        self.assertEqual(reply.action["id"], "export_report")
        self.assertTrue(reply.needs_confirmation)
        self.assertIn("Konformitätsaussage", reply.utterance)

    def test_every_action_job_reply_carries_envelope(self) -> None:
        for msg in ("öffne fall tc-2", "Starte den Abgleich", "generiere testfälle",
                    "Erstelle den Bericht"):
            with self.subTest(msg=msg):
                reply = self._turn(msg)
                self.assertTrue(reply.agent_run.get("run_id"))
                self.assertEqual(reply.agent_run.get("role"), chat.ROLE_SUSIE_ASSISTANT)
                self.assertTrue(reply.agent_run.get("result", {}).get("deterministic_command"))


class FallThroughToModelTests(unittest.TestCase):
    """Explanations reach the model; the canned text is fallback only."""

    def _deterministic(self, message: str):
        return chat.deterministic_turn(message, STATE, "T10-051", "s1")

    def _canned(self, message: str):
        return chat.canned_turn(message, STATE, "T10-051", "s1")

    def test_status_and_sources_fall_through(self) -> None:
        for msg in ("Wo stehe ich?", "Welche Quellen liegen zugrunde?", "Hilfe"):
            with self.subTest(msg=msg):
                self.assertIsNone(self._deterministic(msg), msg)

    def test_canned_layer_still_answers_for_the_fallback(self) -> None:
        status = self._canned("Wo stehe ich?")
        self.assertIsNotNone(status)
        self.assertIsNone(status.action)
        self.assertIn("1 MISMATCH", status.utterance)
        self.assertIn("TC-2", status.utterance)
        self.assertIn("Beginn der Entgeltersatzleistung", status.utterance)

    def test_canned_deviation_without_case_id_selects_first_mismatch(self) -> None:
        # offline fallback may pick the first mismatch; the pre-gateway layer may not
        reply = self._canned("zeig mir die abweichung")
        self.assertIsNotNone(reply)
        self.assertEqual(reply.action["params"], {"case_id": "TC-2"})

    def test_free_form_questions_match_neither_layer(self) -> None:
        for msg in ("Was ist eine Vorerkrankung?", "Warum ist der Himmel blau?"):
            with self.subTest(msg=msg):
                self.assertIsNone(self._deterministic(msg), msg)
                self.assertIsNone(self._canned(msg), msg)


if __name__ == "__main__":
    unittest.main()
