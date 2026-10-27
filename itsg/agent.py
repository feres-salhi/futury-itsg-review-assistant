"""SÜSIE native agent loop — Claude Sonnet brain with server-side tools
(T10-046 §5.1–5.2, spec approved 2026-10-27; owner directive: wire Anthropic).

Design (verbatim intent from the spec):
- Sonnet via ``ANTHROPIC_API_KEY``; model id from env ``SUSIE_MODEL``,
  default ``claude-sonnet-5-5``.
- Fallback to the hessian gateway on a missing key or any per-call transport
  error, then the rehearsed degraded utterance — the fallback chain lives in
  ``itsg.chat`` (thin dispatcher); this module raises ``AgentUnavailable``.
- Max 8 tool steps, ≤90 s wall clock shared across the fallback chain.
- The final utterance passes today's deterministic enforcement in chat.py
  (cite-or-abstain, action whitelist + confirm tokens, disclaimer, gate
  handback) — this module NEVER has the final word.
- Privacy: every outbound call through the Datenschutz-Schleuse with the
  ``anthropic`` policy (pseudonymize-then-block, fail closed).
- Tools never accept a model-supplied path — server-issued ids only.
  This slice carries the read-only + proposal tools with real backing
  (search_regulations, get_status, search_cases, fetch_case, propose_action);
  the job tools (ingest/evaluate/generate) land with the T10-050 job table.
"""
from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request

from . import actions, retrieval
from .llm import LLMError

try:   # T10-043: Datenschutz-Schleuse — same import guard as chat.py
    from privacy.schleuse import PrivacyBlocked, apply_policy
except ImportError:   # pragma: no cover — repo-layout regression, fail closed below
    apply_policy = None
    PrivacyBlocked = Exception

ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"
DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5-5"
AGENT_MAX_STEPS = 8
AGENT_WALL_CLOCK_S = 90
PER_CALL_TIMEOUT_S = 30


class AgentUnavailable(Exception):
    """Missing key, transport failure, or privacy block — chat.py falls back."""


def api_key() -> str:
    return os.environ.get("ANTHROPIC_API_KEY", "").strip()


def model_id() -> str:
    return os.environ.get("SUSIE_MODEL", "").strip() or DEFAULT_ANTHROPIC_MODEL


def available() -> bool:
    return bool(api_key()) and apply_policy is not None


# ---------------------------------------------------------------------------
# Tool registry (spec §5.2 — read-only + proposal slice)
# ---------------------------------------------------------------------------

TOOL_SCHEMAS = [
    {
        "name": "search_regulations",
        "description": "Volltextsuche in den G0-freigegebenen Regelwerken (Gesetz, "
                       "Verfahrensbeschreibung). Liefert Treffer mit Quellen-ID und Fundstelle.",
        "input_schema": {"type": "object",
                         "properties": {"query": {"type": "string", "description": "Suchtext"}},
                         "required": ["query"]},
    },
    {
        "name": "get_status",
        "description": "Aktueller Prüfstand: Fallzahlen je Status (PASS/MISMATCH/nicht bewertet), "
                       "Bericht- und Quellen-IDs.",
        "input_schema": {"type": "object", "properties": {}},
    },
    {
        "name": "search_cases",
        "description": "Prüffälle durchsuchen; optional nach Status filtern.",
        "input_schema": {"type": "object",
                         "properties": {"query": {"type": "string"},
                                        "status": {"type": "string",
                                                   "enum": ["PASS", "MISMATCH", "NOT_EVALUATED"]}},
                         "required": []},
    },
    {
        "name": "fetch_case",
        "description": "Einen Prüffall vollständig abrufen: Soll/Ist, Grundlage, Befund.",
        "input_schema": {"type": "object",
                         "properties": {"case_id": {"type": "string"}},
                         "required": ["case_id"]},
    },
    {
        "name": "propose_action",
        "description": "Dem Menschen eine Aktion aus der Whitelist vorschlagen (nur Vorschlag — "
                       "der Mensch bestätigt mit Ja/Nein; mutierende Aktionen brauchen das).",
        "input_schema": {"type": "object",
                         "properties": {"action_id": {"type": "string"},
                                        "params": {"type": "object"}},
                         "required": ["action_id"]},
    },
]


def _tool_search_regulations(args, ctx):
    query = str(args.get("query", "")).strip()
    if not query:
        return {"error": "search_regulations requires a query"}
    hits = retrieval.corpus_search(ctx["store_root"], ctx["index_path"], query, limit=5)
    ctx["corpus_refs"].extend(
        {"kind": "corpus", "ref": h.get("source_version_id", ""),
         "locator": h.get("heading_path", "")} for h in hits)
    return {"hits": hits}


def _tool_get_status(_args, ctx):
    state = ctx["state_context"]
    cases = state.get("cases") or []
    counts = {}
    for c in cases:
        counts[c.get("status", "?")] = counts.get(c.get("status", "?"), 0) + 1
    report = state.get("report") or {}
    source = state.get("source") or {}
    ctx["state_refs"].append({"kind": "state", "ref": report["id"]}) if report.get("id") else None
    return {"cases_total": len(cases), "by_status": counts,
            "report_id": report.get("id"), "source_id": source.get("id")}


def _tool_search_cases(args, ctx):
    query = str(args.get("query", "")).lower()
    status = args.get("status")
    out = []
    for c in ctx["state_context"].get("cases") or []:
        if status and c.get("status") != status:
            continue
        blob = json.dumps(c, ensure_ascii=False).lower()
        if query and query not in blob:
            continue
        out.append({"id": c.get("id"), "status": c.get("status"),
                    "case_type": c.get("case_type"), "reason": c.get("reason", "")})
        if len(out) >= 20:
            break
    return {"cases": out}


def _tool_fetch_case(args, ctx):
    case_id = str(args.get("case_id", "")).strip()
    for c in ctx["state_context"].get("cases") or []:
        if str(c.get("id", "")).upper() == case_id.upper():
            ctx["state_refs"].append({"kind": "state", "ref": c.get("id")})
            return c
    return {"error": f"unknown case id: {case_id}"}


def _tool_propose_action(args, ctx):
    action_id = str(args.get("action_id", ""))
    params = args.get("params") or {}
    try:
        proposal = actions.propose(action_id, params, ctx["session_id"])
    except ValueError as exc:
        return {"error": f"action not allowed: {exc}"}
    ctx["last_proposal"] = {"id": proposal["action"]["id"],
                            "params": proposal["action"].get("params", {})}
    return {"proposed": proposal["action"]["id"],
            "needs_confirmation": proposal["confirm_token"] is not None}


TOOLS = {
    "search_regulations": _tool_search_regulations,
    "get_status": _tool_get_status,
    "search_cases": _tool_search_cases,
    "fetch_case": _tool_fetch_case,
    "propose_action": _tool_propose_action,
}


# ---------------------------------------------------------------------------
# Transport (stdlib, same posture as itsg.llm)
# ---------------------------------------------------------------------------

def _messages_post(payload: dict, timeout: float) -> dict:
    """One POST to the Anthropic messages API; any failure raises AgentUnavailable."""
    body = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(
        ANTHROPIC_ENDPOINT, data=body, method="POST",
        headers={"x-api-key": api_key(), "anthropic-version": ANTHROPIC_VERSION,
                 "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError,
            ValueError, KeyError, IndexError, TypeError) as exc:
        raise AgentUnavailable(f"anthropic transport failure: {exc}") from exc


# ---------------------------------------------------------------------------
# The loop
# ---------------------------------------------------------------------------

AGENT_SYSTEM_ADDENDUM = (
    "TOOLS: Für jede sachliche Aussage über die Prüfung: nutze zuerst die Werkzeuge "
    "(search_regulations, get_status, search_cases, fetch_case) und belege die Antwort mit den "
    "erhaltenen IDs/Fundstellen; ohne Werkzeugbeleg antworte nach den CITATIONS-Regeln. "
    "Aktionen schlägst Du ausschließlich über propose_action vor — nie frei im Text versprechen."
)


def run_turn(message: str, state_context: dict, corpus_hits: list[dict], history: list[dict],
             system_prompt: str, task_id: str, session_id: str, lang: str = "",
             store_root=None, index_path=None,
             wall_clock_s: float = AGENT_WALL_CLOCK_S) -> dict:
    """One full agent turn; returns the reply pieces for chat.turn's enforcement:
    {"reply": {utterance, citations, action, confidence}, "model", "privacy",
    "validation_errors"}. Raises AgentUnavailable on key/transport/privacy failure."""
    if not available():
        raise AgentUnavailable("no ANTHROPIC_API_KEY (or airlock module missing)")

    deadline = time.monotonic() + wall_clock_s
    ctx = {"state_context": state_context, "store_root": store_root,
           "index_path": index_path, "session_id": session_id,
           "corpus_refs": list(corpus_hits and [
               {"kind": "corpus", "ref": h.get("source_version_id", ""),
                "locator": h.get("heading_path", "")} for h in corpus_hits] or []),
           "state_refs": [], "last_proposal": None, "steps": 0}

    # initial user content: same shape as the hessian path (message + state +
    # action catalog + corpus hits) so both brains see identical context
    from .chat import build_user_content
    messages = []
    for turn in (history or [])[-12:]:
        role = "assistant" if turn.get("role") == "susie" else "user"
        content = str(turn.get("content", "")).strip()
        if content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": build_user_content(message, state_context, corpus_hits)})

    # privacy airlock: pseudonymize-then-block over the ENTIRE outbound payload
    try:
        messages = apply_policy("anthropic", messages)[0]
    except PrivacyBlocked as exc:
        raise AgentUnavailable(f"privacy airlock blocked the outbound call: {exc}") from exc

    final_text = ""
    validation_errors: list[str] = []
    for _step in range(AGENT_MAX_STEPS):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            validation_errors.append("agent wall clock exhausted")
            break
        payload = {"model": model_id(), "max_tokens": 2048,
                   "system": system_prompt + "\n" + AGENT_SYSTEM_ADDENDUM,
                   "messages": messages, "tools": TOOL_SCHEMAS}
        response = _messages_post(payload, timeout=min(PER_CALL_TIMEOUT_S, remaining))
        blocks = response.get("content") or []
        tool_uses = [b for b in blocks if isinstance(b, dict) and b.get("type") == "tool_use"]
        text = "\n".join(b.get("text", "") for b in blocks
                         if isinstance(b, dict) and b.get("type") == "text").strip()
        if text:
            final_text = text
        if response.get("stop_reason") != "tool_use" or not tool_uses:
            break
        messages.append({"role": "assistant", "content": blocks})
        results = []
        for call in tool_uses:
            ctx["steps"] += 1
            handler = TOOLS.get(str(call.get("name")))
            if handler is None:
                out = {"error": f"unknown tool: {call.get('name')}"}
            else:
                try:
                    out = handler(call.get("input") or {}, ctx)
                except Exception as exc:  # a failing tool must never kill the turn
                    out = {"error": f"tool failed: {exc}"}
            results.append({"type": "tool_result", "tool_use_id": call.get("id"),
                            "content": json.dumps(out, ensure_ascii=False)[:6000]})
        messages.append({"role": "user", "content": results})
    else:
        validation_errors.append(f"tool-step cap reached ({AGENT_MAX_STEPS})")

    if not final_text:
        raise AgentUnavailable("agent produced no final text")

    proposal = ctx["last_proposal"]
    return {
        "reply": {
            "utterance": final_text,
            "citations": _dedupe(ctx["corpus_refs"] + ctx["state_refs"]),
            "action": proposal,
            # grounded only when tools actually returned review data
            "confidence": "grounded" if (ctx["corpus_refs"] or ctx["state_refs"]) else "general",
        },
        "model": model_id(),
        "privacy": {"destination": "anthropic", "mode": "pseudonymize"},
        "validation_errors": validation_errors,
    }


def _dedupe(citations: list[dict]) -> list[dict]:
    seen, out = set(), []
    for c in citations:
        key = (c.get("kind"), c.get("ref"), c.get("locator", ""))
        if c.get("ref") and key not in seen:
            seen.add(key)
            out.append(c)
    return out
