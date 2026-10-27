"""T10-044 + T10-051 — canned help & support layer in the SÜSIE chat.

Owner directive 2026-10-27 (T10-051): help topics, the capability overview
and the troubleshooting checklist are no longer interceptors in front of the
model — with a live gateway the model answers these questions (it has the
state context). The canned texts live in ``chat.canned_turn`` as the
gateway-down fallback; ``chat.deterministic_turn`` returns None for them.
Facts only, no legal interpretation; the model's answers still go through
cite-or-abstain.
"""
from __future__ import annotations

import unittest

from itsg import chat

STATE = {
    "cases": [
        {"id": "TC-2", "case_type": "boundary", "status": "MISMATCH",
         "reason": "EAZ-BEGINN-1: expected '20260101', observed '20260401'"},
    ],
    "report": {"id": "RPT-1"},
}


def turn(message: str, state=STATE):
    return chat.canned_turn(message, state, "T10-044", "s1")


def cmd(reply) -> str:
    return reply.agent_run["result"]["deterministic_command"]


class HelpFallsThroughToModelTests(unittest.TestCase):
    def test_help_and_topics_are_not_interceptors_anymore(self) -> None:
        for msg in ("Hilfe", "Was kannst du?", "Was ist der Abgleich?",
                    "wie funktioniert das Siegel", "Der Abgleich funktioniert nicht"):
            with self.subTest(msg=msg):
                self.assertIsNone(chat.deterministic_turn(msg, STATE, "T10-051", "s1"), msg)


class HelpCommandTests(unittest.TestCase):
    def test_german_and_english_help(self) -> None:
        for msg in ("Hilfe", "hilfe", "Was kannst du?", "hilfe bitte", "help", "support"):
            with self.subTest(msg=msg):
                reply = turn(msg)
                self.assertIsNotNone(reply, msg)
                self.assertEqual(cmd(reply), "help")
                self.assertEqual(reply.agent_run["status"], "candidate")
                ut = reply.utterance
                self.assertIn("\n", ut)  # structured multi-line overview

    def test_help_lists_capabilities_and_whats_this_pointer(self) -> None:
        ut = turn("Hilfe").utterance
        self.assertIn("Wo stehe ich", ut)
        self.assertIn("Datenschutz-Schleuse", ut)
        self.assertIn("?", ut)  # points at the explain-mode icon

    def test_explanation_questions_reach_topics_not_actions(self) -> None:
        cases = {
            "Was ist der Abgleich?": "help_topic:abgleich",
            "Was ist die Datenschutz-Schleuse?": "help_topic:schleuse",
            "wie funktioniert das Siegel": "help_topic:siegel",
            "Erkläre die Belegkette": "help_topic:belegkette",
            "Was ist das Vier-Augen-Prinzip?": "help_topic:vier_augen",
            "explain the seal": "help_topic:siegel",
            "Was sind die Quellen?": "help_topic:quellen",
            "Was ist der Prüfbericht?": "help_topic:bericht",
        }
        for msg, expected in cases.items():
            with self.subTest(msg=msg):
                reply = turn(msg)
                self.assertIsNotNone(reply, msg)
                self.assertEqual(cmd(reply), expected)
                # a topic answer must never propose an action
                self.assertIsNone(reply.action)

    def test_unknown_explanation_matches_nothing(self) -> None:
        self.assertIsNone(turn("Was ist eine Kiwi?"))


class TroubleshootTests(unittest.TestCase):
    def test_checklist_for_failure_phrasings(self) -> None:
        for msg in ("Der Abgleich funktioniert nicht", "SÜSIE hängt", "es geht nicht",
                    "something is not working", "troubleshooting"):
            with self.subTest(msg=msg):
                reply = turn(msg)
                self.assertIsNotNone(reply, msg)
                self.assertEqual(cmd(reply), "troubleshoot")
                self.assertIn("Bridge", reply.utterance)  # first checklist item

    def test_case_questions_stay_case_answers(self) -> None:
        # "Fehler" in a case context must still open the deviating case (fallback)
        reply = turn("Zeig mir den Fehler")
        self.assertIsNotNone(reply)
        self.assertEqual(reply.action["id"], "open_evidence")


if __name__ == "__main__":
    unittest.main()
