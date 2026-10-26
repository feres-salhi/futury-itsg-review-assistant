"""One Claude call = one Langfuse generation. Agents answer in JSON only; anything else raises AgentError,
and the caller marks the step BLOCKED (never PASS).

TEAM10_MOCK=1      canned answers from the agent's mock function (no API call, no cost)
TEAM10_MOCK=broken every agent answers garbage (tests the fail-closed path)
"""
import json
import os
import re

MODELS = {"author": "claude-sonnet-5-5", "light": "claude-haiku-5-5"}
PROMPT_VERSION = "agents-v1"
_client = None


class AgentError(Exception):
    pass


def lf_client():
    """Langfuse client if keys are set, else None (agents still run, nothing is recorded)."""
    if not os.environ.get("LANGFUSE_PUBLIC_KEY") or os.environ.get("TEAM10_MOCK"):   # mock runs are not recorded
        return None
    from langfuse import get_client
    return get_client()


def _claude():
    global _client
    if _client is None:
        import anthropic
        _client = anthropic.Anthropic()
    return _client


def parse_json(text):
    m = re.search(r"\{.*\}", text, re.S)
    if not m:
        raise AgentError("no JSON object in the answer")
    try:
        return json.loads(m.group(0))
    except json.JSONDecodeError as exc:
        raise AgentError(f"invalid JSON: {exc}") from None


def call(agent, role, system, user, mock, max_tokens=32000):
    """Run one agent. role: 'author' (Sonnet) or 'light' (Haiku). mock(user) -> dict for TEAM10_MOCK=1."""
    mode = os.environ.get("TEAM10_MOCK")
    model = "mock" if mode else MODELS[role]
    lf = lf_client()
    gen = (lf.start_as_current_generation(name=agent, model=model, input={"system": system, "user": user},
                                          metadata={"prompt_version": PROMPT_VERSION, "role": role})
           if lf else None)
    ctx = gen.__enter__() if gen else None
    try:
        usage = {"input": 0, "output": 0}
        if mode == "broken":
            text, stop = "sorry, no JSON here", "end_turn"
        elif mode:
            text, stop = json.dumps(mock(user)), "end_turn"
        else:
            with _claude().messages.stream(model=model, max_tokens=max_tokens, system=system,
                                           messages=[{"role": "user", "content": user}]) as stream:
                r = stream.get_final_message()
            stop = r.stop_reason
            text = "".join(b.text for b in r.content if b.type == "text")
            usage = {"input": r.usage.input_tokens, "output": r.usage.output_tokens}
        if stop in ("refusal", "max_tokens"):
            raise AgentError(f"stop_reason {stop}")
        out = parse_json(text)
        if ctx:
            ctx.update(output=out, usage_details=usage)
        return out
    except Exception as exc:
        if ctx:
            ctx.update(level="ERROR", status_message=f"{type(exc).__name__}: {exc}"[:300])
        raise AgentError(f"{agent}: {exc}") from None
    finally:
        if gen:
            gen.__exit__(None, None, None)
