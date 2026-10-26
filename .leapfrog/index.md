# Leapfrog Index — Team 10

Updated: 2026-10-26

## Current state

- Latest checkpoint pair: [cp-018-x](checkpoints/cp-018-x.md) + [cp-018-v](checkpoints/cp-018-v.md) — T10-040 PDF redesign and rendering fixes, 255/255 tests, IN_REVIEW
- Hot cache: [wiki/hot.md](wiki/hot.md)
- Live board: [board.md](board.md)
- Append-only event log: [log.md](log.md)

## Tracks

- [Red — architecture and decisions](tracks/track-1-red.md)
- [Blue — interface and demo](tracks/track-2-blue.md)
- [Black — backend and workflow](tracks/track-3-black.md)
- [Purple — QA and evidence](tracks/track-4-purple.md)
- [Green — docs and delivery operations](tracks/track-5-green.md)

## Checkpoint catalog

| Pair | Date | State |
|---|---|---|
| cp-001 | 2026-10-26 | Initial shared checkpoint and delivery-protocol setup |
| cp-002 | 2026-10-26 | Chat marker, async delivery cadence, agent boot rules, and checkpoint spine ready for review |
| cp-003 | 2026-10-26 | Shared controls pushed to GitHub; reviewer acknowledgment pending |
| cp-004 | 2026-10-26 | Ingestion/segmentation/index proposal documented (T10-003); T10-004–T10-006 READY; awaiting design review |
| cp-005 | 2026-10-26 | Internal architecture skeleton implemented (T10-015): pipeline/ + itsg/ packages, 64 stdlib tests pass, fail-closed behaviors enforced; implementation stubs mapped in prototype-map.md |
| cp-006 | 2026-10-26 | Corpus content deep-dive folded in (T10-017); brainstorm completed; build approach A-then-B approved; design doc written; T10-018 READY for next session |
| cp-007 | 2026-10-26 | T10-018 approach-A demo slice implemented (SÜSIE backend): cited fixtures, Vorerkrankung trigger rule, itsg/ chain end-to-end (renderer/conformance implemented), AI candidate roles on Kolibri-1/GLM-Flash with encrypted secrets; 117/117 tests; offline+live clean-start rehearsals; IN_REVIEW |
| cp-009 | 2026-10-26 | T10-030 fix pass (impeccable audit+critique): all 5 priority issues fixed, smoke PASS, detector unchanged; ownership ZCode took over from Codex per human directive |
| cp-008 | 2026-10-26 | T10-030 frontend/logo copied into repo with SHA-256 verification and fresh repo browser evidence; backend integration and human acceptance pending |
| cp-010 | 2026-10-26 | T10-031 audit+integration of teammates' main snapshot: adopted segmenter/chunks/TEEL0 reviewer/harness verbatim with provenance; pipeline stubs (importer/segmenter/index/verify hooks) wired via adapters; 140/140 tests; harness 300/300 with 0 false alarms; IN_REVIEW |
| cp-011 | 2026-10-26 | Frontend feature pass + backend bridge (human directive, 7 requirements): settings menu, theme-cycle + EN/DE selectors, full chrome i18n, subtle motion, elevated sidebar, stdlib /api over the itsg store with honest synthetic fallback; unittest 124/124, smoke PASS vs bridge. ID-collision note inside (two sessions used "T10-031") |
| cp-012 | 2026-10-26 | T10-034 seal adoption (branch member2-seal): ITSG receipt office adopted byte-identical; gaps fixed — stdlib unittest port (tests/test_seal.py) + itsg/demo --seal receipt wiring with honest degradation; 215/215 shared suite; IN_REVIEW |
| cp-013 | 2026-10-26 | Stories/cases frontend wiring via expert subagent team: bridge /api/state + stories/reviews/harness + POST /api/review/run; 5th view "Story-Suiten" (200 cases, filters, detail) + "Prüfläufe (Backend)" in the report view; full i18n; unittest 215/215, smoke PASS vs live bridge |
| cp-014 | 2026-10-26 | T10-035 legal-basis research capture: verified finding (no statute prescribes a Systemprüfung report template; § 95b SGB IV 5 Absätze, no form) in wiki/findings/; pitch deck (SRCV-1-A) + § 95b SGB IV official text (SRCV-2-A) registered as first data/sources records, G0-candidate, manifests schema-validated; IN_REVIEW |
| cp-015 | 2026-10-26 | T10-036 formal report PDF: itsg/report_pdf.py (client header, machine-generated footer with SÜSIE logo + timestamp + content SHA-256, formal Helvetica layout, no DIN/official claim) + GET/POST /api/report/pdf + report_explainer GLM role (marked draft, fail-closed); 232/232 tests; live gateway path verified; IN_REVIEW |
| cp-016 | 2026-10-26 | T10-037 story showcase: 10 curated story cases evaluated through layered deterministic evaluation (DBVO compare, versioned §3.12 rule, 61-reply + flow rules per generator taxonomy, ground-truth agreement) → 10 formal PDFs in reports/story-showcase/; 250/250 tests; IN_REVIEW |

| cp-017 | 2026-10-26 | T10-039 independent PDF review: reproduced layout, truncation, branding, evidence and malformed-summary defects; 18 targeted tests pass; implementation untouched; IN_REVIEW |

| cp-018 | 2026-10-26 | T10-040 redesigned report rendering; 10 regenerated PDFs, content/geometry and visual QA; 255/255 tests; IN_REVIEW |
