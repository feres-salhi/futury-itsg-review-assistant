"""T10-046 — the Claude Sonnet agent loop (itsg/agent.py) and the dispatcher chain.

Contract under test (no network — the Anthropic transport is always mocked):
- available(): ANTHROPIC_API_KEY env + airlock module; run_turn raises
  AgentUnavailable without a key (fail closed);
- the loop executes server-side tools (search/fetch/propose), collects state
  and corpus citations, and proposes actions ONLY through the whitelist;
- hallucinated tools/actions are stripped or error'd honestly;
- the step cap and wall clock are bounded;
- chat.turn dispatches: agent first, hessian fallback (recorded on the
  envelope), deterministic commands and injected gateways unchanged.
"""
from __future__ import annotations

import json
import unittest
from unittest import mock

from itsg import agent, chat, llm

STATE = {
    "cases": [
        {"id": "TC-1", "case_type": "normal", "status": "PASS", "reason": ""},
        {"id": "TC-2", "case_type": "boundary", "status": "MISMATCH",
         "reason": "EAZ-BEGINN-1: expected '20XX0101', observed '20XX0401'"},
    ],
    "report": {"id": "RPT-1"},
    "source": {"id": "SRC-BP"},
}


def _resp(blocks, stop_reason="end_turn"):
    return {"content": blocks, "stop_reason": stop_reason}


def _text(t):
    return _resp([{"type": "text", "text": t}])


def _tool_use(name, input_args, call_id="call-1"):
    return _resp([{"type": "tool_use", "id": call_id, "name": name,
                   "input": input_args}], stop_reason="tool_use")


class AvailabilityTests(unittest.TestCase):
    def test_no_key_means_unavailable(self):
        with mock.patch.dict("os.environ", {"ANTHROPIC_API_KEY": ""}):
            self.assertFalse(agent.available())
            with self.assertRaises(agent.AgentUnavailable):
                agent.run_turn("m", STATE, [], [], "sys", "T", "s1")

    def test_model_from_env(self):
        with mock.patch.dict("os.environ", {"SUSIE_MODEL": "claude-sonnet-x"}):
            self.assertEqual(agent.model_id(), "claude-sonnet-x")
        with mock.patch.dict("os.environ", {"SUSIE_MODEL": ""}):
            self.assertEqual(agent.model_id(), agent.DEFAULT_ANTHROPIC_MODEL)


class AgentLoopTests(unittest.TestCase):
    def setUp(self):
        self.ctx_kwargs = dict(system_prompt="SYS", task_id="T10-046",
                               session_id="s1", lang="de")

    def _run(self, responses, **kw):
        with mock.patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}), \
                mock.patch.object(agent, "_messages_post", side_effect=responses):
            return agent.run_turn("Wo stehe ich?", STATE, [], [], **self.ctx_kwargs, **kw)

    def test_tool_loop_collects_citations_and_final_text(self):
        result = self._run([
            _tool_use("fetch_case", {"case_id": "TC-2"}),
            _text("TC-2 weicht ab: Beginn der Entgeltersatzleistung erwartet 20XX0101."),
        ])
        self.assertIn("TC-2 weicht ab", result["reply"]["utterance"])
        self.assertEqual(result["reply"]["confidence"], "grounded")
        self.assertIn({"kind": "state", "ref": "TC-2"}, result["reply"]["citations"])
        self.assertIsNone(result["reply"]["action"])
        self.assertEqual(result["model"], agent.DEFAULT_ANTHROPIC_MODEL)

    def test_propose_action_returns_whitelisted_proposal(self):
        result = self._run([
            _tool_use("propose_action", {"action_id": "open_evidence",
                                         "params": {"case_id": "TC-2"}}),
            _text("Soll ich Fall TC-2 öffnen?"),
        ])
        self.assertEqual(result["reply"]["action"], {"id": "open_evidence",
                                                     "params": {"case_id": "TC-2"}})

    def test_hallucinated_action_is_stripped(self):
        result = self._run([
            _tool_use("propose_action", {"action_id": "wipe_store", "params": {}}),
            _text("Erledigt."),
        ])
        self.assertIsNone(result["reply"]["action"])

    def test_unknown_tool_is_an_honest_tool_error(self):
        result = self._run([
            _tool_use("delete_everything", {}),
            _text("Das geht nicht."),
        ])
        self.assertIn("Das geht nicht", result["reply"]["utterance"])

    def test_failing_tool_never_kills_the_turn(self):
        with mock.patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}), \
                mock.patch.object(agent, "_messages_post",
                                  side_effect=[_tool_use("fetch_case", {}), _text("ok")]), \
                mock.patch.dict("os.environ", {"SUSIE_MODEL": ""}):
            # fetch_case with no case_id errors inside the handler, loop continues
            result = agent.run_turn("m", STATE, [], [], **self.ctx_kwargs)
        self.assertEqual(result["reply"]["utterance"], "ok")

    def test_search_regulations_collects_corpus_citations(self):
        hit = {"source_version_id": "SRCV-1", "heading_path": "§ 3.2",
               "text": "…", "segment_id": "S-1"}
        with mock.patch.object(agent.retrieval, "corpus_search", return_value=[hit]):
            result = self._run([
                _tool_use("search_regulations", {"query": "Entgeltersatzleistung"}),
                _text("Laut § 3.2 gilt …"),
            ])
        self.assertIn({"kind": "corpus", "ref": "SRCV-1", "locator": "§ 3.2"},
                      result["reply"]["citations"])

    def test_step_cap_is_bounded_and_recorded(self):
        responses = [_tool_use("get_status", {}, call_id=f"c{i}") for i in range(10)]
        with mock.patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}), \
                mock.patch.object(agent, "_messages_post", side_effect=responses):
            with self.assertRaises(agent.AgentUnavailable):
                agent.run_turn("m", STATE, [], [], **self.ctx_kwargs)

    def test_wall_clock_shared_budget_is_respected(self):
        # a budget already exhausted → one honest unavailable, no infinite loop
        with mock.patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}), \
                mock.patch.object(agent, "_messages_post") as post:
            with self.assertRaises(agent.AgentUnavailable):
                agent.run_turn("m", STATE, [], [], **self.ctx_kwargs, wall_clock_s=-1)
        post.assert_not_called()

    def test_transport_failure_raises_unavailable(self):
        import urllib.error
        with mock.patch.dict("os.environ", {"ANTHROPIC_API_KEY": "test-key"}), \
                mock.patch.object(agent, "_messages_post",
                                  side_effect=agent.AgentUnavailable("HTTP 500")):
            with self.assertRaises(agent.AgentUnavailable):
                agent.run_turn("m", STATE, [], [], **self.ctx_kwargs)


class DispatcherTests(unittest.TestCase):
    """chat.turn: agent first, hessian fallback recorded, injected gateway skips."""

    def test_agent_failure_falls_back_to_hessian_with_note(self):
        def fake_completion(endpoint, model, system_prompt, messages, token, timeout=25):
            return json.dumps({"utterance": "hessian antwortet", "confidence": "general",
                               "citations": [], "action": None})

        with mock.patch.object(chat.agent, "available", return_value=True), \
                mock.patch.object(chat.agent, "run_turn",
                                  side_effect=agent.AgentUnavailable("no key")), \
                mock.patch.object(chat, "resolve_token", return_value="t"), \
                mock.patch.object(chat, "chat_completion", side_effect=fake_completion):
            r = chat.turn("…", {}, [], [], store_path=":memory:")
        self.assertEqual(r.utterance, "hessian antwortet")
        self.assertEqual(r.agent_run["result"]["model"], llm.MODEL_ASSISTANT)
        self.assertTrue(any("claude agent unavailable" in e
                            for e in r.agent_run["validation_errors"]))

    def test_injected_gateway_skips_the_agent(self):
        with mock.patch.object(chat.agent, "available", return_value=True) as avail:
            r = chat.turn("…", {}, [], [], gateway=lambda *a, **k: json.dumps(
                {"utterance": "x", "confidence": "general", "citations": [],
                 "action": None}))
            avail.assert_not_called()
        self.assertEqual(r.utterance, "x")


if __name__ == "__main__":
    unittest.main()
