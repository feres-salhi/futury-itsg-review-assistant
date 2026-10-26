# Track 1 — Red | Architecture and Decisions

## Current State

- ITSG workflow includes source/version provenance, human review, test cases, actual execution evidence, deterministic comparison, mandated-template rendering/conformance, and report approval.
- AI roles are bounded; no model decides legal meaning or approves a report.
- Proposed design for ingestion/segmentation/RAG-index exists in `ingestion-pipeline.md` (2026-10-26, corpus survey evidence included); `architecture.md` §12 links it as **proposed, not accepted**. T10-003 documents it; T10-004–T10-006 are `READY` implementation rows pending review and work orders.
- T10-015 skeleton implemented (2026-10-26, solo directive): `pipeline/` (stages A–C) + `itsg/` typed records/gates/store/comparator; 64 stdlib tests pass; §9 leans adopted as PROVISIONAL implementation defaults pending review — code treats them as defaults, not accepted design.
- Corpus content deep-dive folded in (T10-017): Beispielpapier = official expected-value ground truth; Anlagen = Gemeinsame Rundschreiben (rule source); boundary = transmit-side only, no benefit-amount claims.
- Brainstorm completed (2026-10-26): build approach **A-then-B** approved by human owner; design doc at `docs/superpowers/specs/2026-10-26-prototype-build-design.md`; staged-autonomy framing (AI expert-agents + human milestone gates) adopted as the demo narrative; T10-018 `READY`.

## Next Arc

- Integration lead reviews and accepts or amends the ingestion proposal; §9 leans already adopted as PROVISIONAL implementation defaults under the T10-015 solo directive — the review confirms or overrides each (index stack, MD export, tables, demo corpus scope, fetch policy, G0 owner).
- Keep architecture, agent governance, and task board in sync when interfaces or gates change.
- Record material decisions as ADRs or in `.leapfrog/log.md` with evidence and owner.


## Frontend packaging arc — 2026-10-26

T10-030: canonical selected static frontend is `frontend/`; mock comparison/evidence remains explicitly separate from backend T10-018. No schema/API/backend behavior changed; integrate through agreed typed records next. cp-008 records frontend truth; cp-007 remains reserved for backend.

## Legal-basis decision arc — 2026-10-26 (T10-035)

- Verified finding (human gate applies): § 95b SGB IV mandates the Systemprüfung but prescribes
  **no** report template/form (official text = SRCV-2-A, G0-candidate); the client pitch deck
  (SRCV-1-A, G0-candidate) never claims one; the provided corpus contains no official report form.
  Full note: `.leapfrog/wiki/findings/2026-10-26-report-template-legal-basis.md`.
- Architectural consequence: the synthetic-template + `compliance_claim=False` + blocked-by-default
  template gate (G6) posture is now evidence-backed, not provisional-by-absence. The empty
  `form_template` registry is the correct state until ITSG names an official form (human action).
- First two records now exist in the T10-004 layout (`data/sources/SRC-1`, `SRC-2`), manifests on
  the `pipeline.registry.manifest` schema with `status=candidate` — the human G0 decision (cp-012-v
  next-action #2) now has concrete rows to accept or reject.

## T10-039 independent review — 2026-10-26
Report renderer requires geometry/pagination fixes and branding/evidence integration before acceptance. cp-017 records source-grounded review; no architecture or legal decision changed.

## T10-040 report rendering — 2026-10-26
Presentation redesigned without changing deterministic findings or source artifacts. Demo ground-truth validation appears in documentation appendix; full evidence references retained. Renderer/tests/showcase only; 255/255 tests and visual/geometry/hash verification. cp-018; human acceptance pending.
