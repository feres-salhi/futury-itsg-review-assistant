# T10-003 Review Brief — `ingestion-pipeline.md`

**For:** MSc integration lead (reviewer of T10-003)
**From:** ZCode / GLM-5.3Flash (T10-003 agent owner)
**Date:** 2026-10-26
**Status:** Review requested. T10-003 is `IN_REVIEW`. Nothing in the proposal is accepted yet; only the corpus evidence in §2 is measured fact.

## What you are reviewing

`ingestion-pipeline.md` — the proposed design for source ingestion, segmentation, and the RAG index (stages A–C), built on the 2026-10-26 corpus survey of `ITSG Files/`.

Suggested reading order:

1. **§2 evidence table** — the measured baseline every later choice rests on (per-document tag counts, text layers everywhere → no OCR, the GG_EEL byte-identical duplicate, known quirks).
2. **§3–§5** — governing principle (`data/sources/` is truth, `data/index/` is a rebuildable cache), directory layout, intake/registry rules including "fetch is not accept".
3. **§6** — the two-level chunking scheme and purity rules. The Segmenter contract (exact text, no paraphrase or silent repair) is the load-bearing constraint; converter rejections in §2's tool conclusion follow from it.
4. **§8** — verification hooks; these become the acceptance criteria of T10-004–T10-006.
5. **§9** — the decision table, restated below.

## §9 decisions needing your ruling

| # | Question | Current lean in the doc | What it blocks if left open |
|---|---|---|---|
| 1 | MVP index stack | FTS5 only; vector search deferred **[PROPOSED]** | T10-006 acceptance criteria |
| 2 | Chunk storage format | JSONL canonical; optional read-only MD export as a review view **[PROPOSED]** | T10-005 output schema |
| 3 | Table handling for v1 | tables stay inside their section chunk **[PROPOSED]** | T10-005 warning/report design |
| 4 | Demo corpus scope | full corpus indexed as a credibility stress test (Anl3, 406 pp., is the stress case); demo slice needs only one excerpt **[PROPOSED]** | T10-006 acceptance criteria (flagged in cp-004-v) |
| 5 | Fetch policy during the hackathon | fetch helper into `inbox/` at most; auto-crawl stays "later" per architecture §10 **[PROPOSED]** | T10-004 scope boundary |
| 6 | Embedding model | defer (collapses into #1 while vectors stay deferred) | none while #1 stands |
| 7 | Human G0 owner for the real ITSG documents | not yet named (carried over from cp-003) | the G0 gate cannot operate on real sources without a named human |

For #1–#5, "accept the lean" or an override naming your preferred option is a sufficient ruling — each lean is already written in the doc. #7 needs a name and a designation recorded in the log.

## What acceptance means here

Per `DELIVERY.md` (definition of done) and `agent-governance.md` §6/§7:

1. You check the deliverable against the T10-003 board row's acceptance criteria and approve or return findings to the agent owner (ZCode / GLM-5.3Flash). Your approval is what moves T10-003 `IN_REVIEW → DONE`; per governance, an agent cannot author and approve the same artifact, so this step is yours.
2. Your §9 rulings are recorded as a decision entry in `.leapfrog/log.md`.
3. A human then issues the first work order — recommended: T10-004 — using the pre-filled draft at [../workorders/T10-004-workorder-draft.md](../workorders/T10-004-workorder-draft.md). Per governance §6/§7 the work order is issued by a human; the draft only pre-fills it and lists the items needing your confirmation at issuance.

## Notes for your review

- The §2 measurements were produced by read-only scripts on branch `amourification/pdf-chunking` and are re-runnable; you do not need to re-measure to review, but you can.
- No application code exists yet; nothing needs a test run for this review. The change set is documentation-only and uncommitted (no commit/push authorization was given).
- Treat every **[PROPOSED]** label (§4–§7) as awaiting your ruling, not as agreed design; **[OPEN]** items cannot be resolved by an agent.
- Known process context: T10-002 (shared controls) is separately still `IN_REVIEW` with you; this brief covers T10-003 only.
