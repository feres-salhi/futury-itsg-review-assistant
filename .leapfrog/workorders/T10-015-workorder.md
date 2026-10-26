# Work Order — T10-015 (internal architecture skeleton)

**STATUS: ISSUED — 2026-10-26.** Issued by the human owner via direct session directive ("working solo on this branch … deliver this project prototype asap … start creating internal architecture and skeleton files"). Operates under the solo-delivery mode recorded in `.leapfrog/log.md`: the formal T10-003 review remains open, and §9 leans of `ingestion-pipeline.md` are adopted as **provisional implementation defaults**, revisitable at review.

**Coordination note:** task IDs T10-007 (skill vendoring batch 1), T10-008 and T10-009 (obra/superpowers vendoring) were concurrently claimed by another active session while this task was being registered — three consecutive ID collisions. This task takes T10-015; IDs T10-010–T10-014 are intentionally left unclaimed as a collision buffer and should not be silently reused. File scopes do not overlap with any active owner.

```text
Task ID and human owner:
  T10-015 — Team 10 product facilitator (solo mode: repo owner is the
  acting human owner; G0 owner provisionally the same person until the
  team designates otherwise)

Goal and user-visible outcome:
  A compiling, importable Python skeleton of the whole prototype: the
  deterministic ingestion pipeline (stages A–C per ingestion-pipeline.md)
  and the typed record/gate/store/comparator layer for the MVP vertical
  slice (plan.md minimal data contract, architecture.md §5/§7/§9), plus
  stdlib-only tests that pass and a map of what is stubbed.

Allowed files/directories:
  pipeline/**, itsg/**, tests/**, fixtures/**, data/** (runtime, gitignored),
  requirements.txt, .gitignore, prototype-map.md, .leapfrog/**

Files or behavior explicitly out of scope:
  architecture.md, agent-governance.md, plan.md, ingestion-pipeline.md,
  ITSG Files/ (read-only), README.md / HANDOFF.md (teammate bootstrap),
  .agents/skills/** and .zcode/skills/** (T10-007/T10-009, other owner),
  no commit/push (not authorized), no network fetching implemented.

Approved spec/source IDs:
  architecture.md §3 (components), §4 (source fields), §5 (records/citations),
  §7 (gates G0–G6), §9 (state machine), §10 (MVP)
  ingestion-pipeline.md §3–§8 (pipeline stages, purity, verification hooks)
  plan.md (minimal data contract, acceptance criteria, scope cuts)
  agent-governance.md §3 (audit envelope), §5 (gates), §6 (this contract)

Acceptance criteria:
  1. `python3 -m compileall pipeline itsg tests` passes.
  2. `python3 -m unittest discover -s tests` passes with zero failures
     using the standard library only (no pymupdf/docx required to test).
  3. Fail-closed behaviors are tested, not just claimed: comparator never
     returns PASS on missing expected value/basis/execution output; gate
     decisions without a reviewer raise; URL policy rejects loopback/
     private/reserved targets and non-http(s) schemes.
  4. Unimplemented behavior raises NotImplementedError with a pointer to
     the owning task (T10-004/T10-005/T10-006), never a silent default.
  5. Every module docstring cites the spec section it implements; the map
     file lists every stub and the build order.

Required verification (commands and expected result):
  python3 -m compileall -q pipeline itsg tests        # no output, exit 0
  python3 -m unittest discover -s tests -v            # all tests OK
  FTS5 availability probe via stdlib sqlite3          # observed OK 2026-10-26

Dependencies / interfaces:
  T10-003 §9 leans as provisional defaults (#1 FTS5-only, #2 JSONL
  canonical, #3 tables inside section chunks, #4 full corpus, #5 no
  auto-fetch, #6 vectors/embeddings deferred, #7 G0 owner provisional).
  pipeline.ids and pipeline.audit are the shared interface for T10-004–006.
  itsg.records mirrors plan.md's minimal data contract 1:1.

Handoff format and reviewer:
  DELIVERY.md handoff appended to .leapfrog/log.md at completion;
  reviewer: MSc integration lead (solo mode: human owner self-review).
```
