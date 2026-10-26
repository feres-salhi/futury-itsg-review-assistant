# Track 3 — Black | Backend and Workflow

## Current State

- Architecture defines source, requirement, case, execution, report-template, and conformance records.
- **T10-018 demo slice implemented (cp-007, 2026-10-26, IN_REVIEW):** the app is SÜSIE — the
  `itsg/` chain runs end-to-end from a clean start (`python3 -m itsg.demo --fresh [--live]`):
  store → criteria (G3) → cases → fail-closed comparator → renderer/conformance on the labeled
  synthetic template (`compliance_claim=False`) → evidence-chain trace; 117/117 stdlib tests.
- Cited fixtures in `fixtures/` ground expected values in the official corpus (BP §3.1 normal,
  §3.2.1.4 boundary, invalid-input → NOT_EVALUATED, Vorerkrankung constellation); Vorerkrankung
  trigger implemented per VB DTA EEL §3.12 (versioned, unit-tested, official numbers reproduced).
- AI candidate roles per governance §3/§8 on the api.py gateway models (GLM-Flash: extractor +
  challenger; Kolibri-1: designer), candidates only, author≠reviewer, SSRF-hardened client,
  encrypted secrets store for the disposable token (`data/secrets/`, gitignored).
- `ingestion-pipeline.md` (proposed, not accepted) defines the first ingestion slices: stage A
  registry/inbox (`pipeline/registry/**`), stage B deterministic segmenter (`pipeline/segmenter/**`),
  stage C FTS5 index builder + verification harness (`pipeline/index/**`), as board rows
  T10-004–T10-006 (`READY`, no work orders issued yet). T10-015 skeleton modules remain in place;
  importer/extractors/chunker/build_index/verify hooks are still stubs.
- Concurrent frontend delivery T10-030 (cp-008) put the SÜSIE UI in `frontend/`; backend files
  were untouched by that session, and backend files did not touch it. Typed-record integration
  is the agreed next step.

## Next Arc

- Reviewer/self-review acceptance of T10-018, then B upgrade in order (see `prototype-map.md`):
  T10-004 importer (stdlib-only, dedupe hook §8.5) → T10-005 segmenter (needs pymupdf/python-docx
  owner confirmation; reconcile §2 baselines; ONE document, not Anl3) → T10-006 build_index +
  verify hooks (round-trip purity, gate filtering, rebuild determinism).
- Integrate the cp-008 frontend with the SÜSIE typed records (store kinds, findings, report
  artifact) — schema changes require the human owner.
- Keep LLM output separate from deterministic calculation and conformance code (governance §1.6);
  candidates stay behind human gates.

