"""SÜSIE action registry — the fail-closed whitelist of operations the chat
layer may propose and execute (task 3, SÜSIE assistant backend).

The assistant never gets free rein: every action must be in one of three
explicit sets, and anything that changes state needs a fresh, single-use,
unexpired confirmation token; anything that records a human gate decision
additionally needs a non-blank human reviewer and a gate id inside that
action's allowed set. Every refusal raises ``PermissionError`` with a plain
reason string (the web server maps it to HTTP 403). Unknown action ids at
propose time raise ``ValueError``.

`GateDecision` itself validates reviewer/rationale (itsg.gates) — this
module's job is the access control *before* that delegation, plus stamping
the result with ``decision_maker: <reviewer>`` and
``executor: "susie-assistant"`` so the store never shows an agent as the
decision maker.
"""
from __future__ import annotations

import secrets
import threading
import time
from pathlib import Path
from uuid import uuid4

from . import gates
from .store import Store
from .timeutil import utc_now

# -- whitelists (verbatim from the task brief) --------------------------------

READ_ONLY_ACTIONS = (
    "select_case", "open_evidence", "filter_cases", "jump_to_source",
    "show_comparison", "switch_mode",
)
MUTATING_ACTIONS = (
    "save_note", "export_report", "run_comparison", "initiate_review_flow",
)
DECISION_GATE_ACTIONS: dict[str, set[str]] = {
    "record_review_state": {"G4", "G5"},
    "record_conformance": {"G5"},
    "request_release": {"G6"},
}

CONFIRM_TTL_S = 300  # a confirmation token lives five minutes, then it is dead

# token -> (expiry, session_id, payload {"action_id": ..., "params": ...}),
# guarded by _LOCK so concurrent proposals can never race the pending map.
_PENDING: dict[str, tuple[float, str, dict]] = {}
_LOCK = threading.Lock()


def _now() -> float:
    """Clock seam: tests monkeypatch this to simulate expiry."""
    return time.time()


def _all_actions() -> set[str]:
    return set(READ_ONLY_ACTIONS) | set(MUTATING_ACTIONS) | set(DECISION_GATE_ACTIONS)


def _purge_expired(pending: dict, now: float) -> None:
    for token in [t for t, (expiry, _s, _p) in pending.items() if expiry <= now]:
        del pending[token]


def propose(action_id: str, params: dict, session_id: str) -> dict:
    """Whitelist check + confirmation-token issue for one proposed action."""
    if action_id not in _all_actions():
        raise ValueError(f"unknown action id: {action_id!r}")
    proposed = {"id": action_id, "params": params}
    if action_id in READ_ONLY_ACTIONS:
        return {"action": proposed, "confirm_token": None}
    token = secrets.token_urlsafe(16)
    with _LOCK:
        _purge_expired(_PENDING, _now())
        _PENDING[token] = (_now() + CONFIRM_TTL_S, session_id,
                           {"action_id": action_id, "params": params})
    return {"action": proposed, "confirm_token": token}


def _consume_token(action_id: str, confirm_token: str | None,
                   session_id: str | None) -> dict:
    """Fail-closed token check; on success removes the token (single use)."""
    if not confirm_token:
        raise PermissionError(f"{action_id} requires a confirmation token")
    with _LOCK:
        entry = _PENDING.get(confirm_token)
        if entry is None:
            raise PermissionError("unknown or already used confirmation token")
        expiry, entry_session, payload = entry
        if expiry <= _now():
            del _PENDING[confirm_token]
            raise PermissionError("confirmation token expired — propose the action again")
        if payload["action_id"] != action_id:
            raise PermissionError("confirmation token was issued for a different action")
        if session_id is not None and entry_session != session_id:
            raise PermissionError("confirmation token was issued for a different session")
        del _PENDING[confirm_token]
    return payload


def execute(action_id: str, params: dict, confirm_token: str | None,
            store_root: Path, reviewer: str, session_id: str | None = None) -> dict:
    """Execute a whitelisted action — fail closed on every missing credential."""
    if action_id in READ_ONLY_ACTIONS:
        # The frontend action bus performs it; the caller audit-logs this call.
        return {"executed": True, "mode": "client"}

    _consume_token(action_id, confirm_token, session_id)

    if action_id in MUTATING_ACTIONS:
        return _execute_mutating(action_id, params, store_root, reviewer)

    if action_id in DECISION_GATE_ACTIONS:
        return _execute_gate(action_id, params, store_root, reviewer,
                             DECISION_GATE_ACTIONS[action_id])

    raise PermissionError(f"action {action_id!r} is not executable")  # unreachable


def _execute_mutating(action_id: str, params: dict, store_root: Path, reviewer: str) -> dict:
    store = Store(store_root)
    if action_id == "save_note":
        store.put("note", {
            "id": f"NOTE-{uuid4().hex[:8]}",
            "text": params.get("text", ""),
            "case_id": params.get("case_id", ""),
            "author": reviewer,
            "created_at": utc_now(),
        })
        return {"executed": True, "mode": "server"}
    if action_id == "export_report":
        return {
            "report": store.all("report"),
            "cases": store.all("test_case"),
            "notes": store.all("note"),
            "gates": store.all("gate"),
            "generated_by": reviewer,
            "executed_by": "susie-assistant",
        }
    if action_id == "run_comparison":
        from . import demo  # lazy: keeps the heavy demo stack out of chat imports
        demo.run_demo(store_root, live=False, fresh=False)
        return {"executed": True, "mode": "server"}
    # initiate_review_flow opens the review dialog client-side; nothing to record here.
    return {"executed": True, "mode": "client"}


def _execute_gate(action_id: str, params: dict, store_root: Path, reviewer: str,
                  allowed_gates: set[str]) -> dict:
    if not reviewer or not reviewer.strip():
        raise PermissionError(f"{action_id} requires a named human reviewer")
    gate_id = params.get("gate")
    if gate_id not in allowed_gates:
        raise PermissionError(
            f"gate {gate_id!r} is not allowed for {action_id} (allowed: {sorted(allowed_gates)})")
    decision = gates.GateDecision(
        gate_id, reviewer, params.get("decision", ""),
        params.get("rationale", ""),
        affected_ids=params.get("affected_ids", []),
        conditions=params.get("conditions", []),
    )
    record = {"id": f"GATE-{gate_id}-{decision.decided_at}", **decision.to_dict()}
    Store(store_root).put("gate", record)
    return {
        "executed": True,
        "mode": "server",
        "record_id": record["id"],
        "decision_maker": reviewer,
        "executor": "susie-assistant",
    }
