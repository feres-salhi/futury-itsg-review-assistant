"""Governance payload — one view input for the native Freigaben queue and the
Verlauf timeline (T10-049 Wave R, spec §5.0).

Read-only assembly from the itsg store:

- ``pending``  — every record waiting on a named human decision (sources in
  ``needs_review``/``candidate``, criteria and test cases in ``draft``), each
  with the plain-language label key and the whitelist action that will record
  the decision (never executed here — gates stay human-only).
- ``gates``    — recorded gate decisions with their label keys.
- ``events``   — the newest store events, capped, ascending by ``seq``.

Copy rule (spec §5.6): gate IDs (``G0``…``G6``) are storage identifiers, never
UI copy. ``GATE_LABELS`` is the single source of truth for the human-readable
act per gate; the frontend renders label keys, never gate ids.
"""
from __future__ import annotations

from pathlib import Path

EVENT_CAP = 500

# Gate id → I18N label key of the human act (frontend: I18N.de[...] / I18N.en[...]).
GATE_LABELS = {
    "G0": "actSource",          # Quelle freigeben
    "G1": "actRequirements",    # Anforderungen bestätigen
    "G2": "actTranslation",     # Übersetzung freigeben
    "G3": "actCriteria",        # Prüfkriterien freigeben
    "G4": "actReviewStep",      # Prüfschritt festhalten
    "G5": "actConformance",     # Konformität bewerten
    "G6": "actRelease",         # Bericht zur Freigabe vorlegen
}

_PENDING_SOURCES = {"needs_review", "candidate"}


def pending_cards(records: dict) -> list[dict]:
    """Group the store records into pending human decisions.

    Pure helper so the shape contract is testable without a server.
    ``proposed_action`` names the existing whitelist action that records the
    decision; actions that land with later waves (``record_g0`` with T10-047,
    draft sign-off with T10-050) are still named so the UI can render the
    card read-only with an honest hint instead of a dead button.
    """
    pending: list[dict] = []
    for record in records.get("source", {}).values():
        if record.get("status") in _PENDING_SOURCES:
            pending.append({
                "kind": "source",
                "id": record["id"],
                "label_key": "pendingSource",
                "detail": record.get("title", ""),
                "proposed_action": "record_g0",
                "created_at": record.get("created_at", ""),
            })
    for kind in ("criterion", "test_case"):
        for record in records.get(kind, {}).values():
            if record.get("review_status") == "draft":
                pending.append({
                    "kind": kind,
                    "id": record["id"],
                    "label_key": "pendingDraft",
                    "detail": record.get("title", "") or record.get("name", ""),
                    # Draft sign-off needs a G1/G3 gate action that arrives with
                    # T10-050; until then the UI renders the card read-only.
                    "proposed_action": "record_draft_gate",
                    "created_at": record.get("created_at", ""),
                })
    pending.sort(key=lambda item: (item["created_at"], item["kind"], item["id"]))
    return pending


def collect_governance(store_root: Path) -> dict:
    """Assemble the Freigaben/Verlauf payload; empty store → empty ok state."""
    from .store import Store

    store = Store(store_root)
    records = store._load_records()  # noqa: SLF001 — single-process bridge (build_state precedent)

    gates = []
    for gate in records.get("gate", {}).values():
        gates.append({**gate, "label_key": GATE_LABELS.get(gate.get("gate", ""), "")})
    gates.sort(key=lambda gate: gate.get("decided_at", ""), reverse=True)

    events = store.events()[-EVENT_CAP:]

    return {
        "ok": True,
        "pending": pending_cards(records),
        "gates": gates,
        "events": events,
    }
