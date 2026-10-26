# Work Order DRAFT — T10-004 (source registry and inbox import)

**STATUS: DRAFT — NOT ISSUED.** Per `agent-governance.md` §6 and §7, this work order takes effect only when the human coordinator issues it, which requires T10-003 (`ingestion-pipeline.md`) to be accepted first. Do not start implementation from this draft. Items marked `[CONFIRM AT ISSUANCE]` or `[PROPOSED]` need the human owner's decision before work begins.

```text
Task ID and human owner:
  T10-004 — Team 10 product facilitator [CONFIRM AT ISSUANCE: owner and
  agent-owner assignment; board currently lists agent owner "Unassigned —
  proposed: ZCode / GLM-5.3Flash"]

Goal and user-visible outcome:
  A registry/import stage that turns files dropped into data/inbox/ into
  registered source versions under data/sources/<SRC>/<SRCV>/: immutable
  original, manifest with architecture §4 provenance fields, G0 status
  `candidate` by default. Duplicate files (identical checksum) link to the
  existing SRCV instead of creating a copy — the GG_EEL corpus duplicate
  (`Laws/` + `Rules Input part 1/`) must resolve to one SRCV with two
  recorded intake paths.

Allowed files/directories:
  pipeline/registry/**
  data/inbox/**
  data/sources/**
  .leapfrog/board.md and .leapfrog/log.md (status/evidence updates only)
  [CONFIRM AT ISSUANCE] test file location convention (colocated vs tests/)

Files or behavior explicitly out of scope:
  pipeline/segmenter/** and pipeline/index/** (T10-005 / T10-006)
  architecture.md, agent-governance.md, ingestion-pipeline.md — changes to
    accepted design go through the human owner, not this task
  ITSG Files/ — read-only input
  No new third-party dependencies without human approval (stage A is
    intended to need the standard library only: hashlib, json, shutil)
  No network fetching unless the §9 #5 ruling explicitly includes the
    fetch helper in T10-004; any fetch defaults to `candidate` (fetch is
    not accept)

Approved spec/source IDs:
  ingestion-pipeline.md §4 (layout) and §5 (stage A) — effective only
    after T10-003 acceptance
  architecture.md §4 (source fields), §7 (gate G0), §9 (state machine)
  agent-governance.md §6 (this contract), §3 (audit-envelope pattern for
    the import record)
  ingestion-pipeline.md §2 (GG_EEL duplicate evidence, checksum basis)

Acceptance criteria:
  1. Every PDF/DOCX placed in data/inbox/ is registered under
     data/sources/<SRC>/<SRCV>/ with its original bytes stored immutable
     (registration never mutates the original).
  2. manifest.json carries all architecture §4 source fields; unknown
     values stay empty; filename-derived values (V13.1, gueltig_ab_...)
     are stored as candidate metadata, never verified facts; publication
     date and effective date stay separate.
  3. Registering the two GG_EEL copies yields exactly one SRCV with two
     recorded intake paths (verification hook §8.5).
  4. Every version enters with G0 status `candidate`; no code path in
     this stage can set `accepted` (human-only, gate G0).
  5. The import writes an audit record per the governance §3 pattern
     (inputs, checksums, counts, warnings).
  6. Board row T10-004 updated with evidence; handoff appended to
     .leapfrog/log.md per DELIVERY.md.

Required verification (commands and expected result):
  [PROPOSED — finalize command set at issuance once test tooling is chosen]
  - Unit/integration tests for registration, checksum dedupe, manifest
    schema completeness, and the `candidate` default; expected result:
    all pass, exact commands and output recorded in the handoff.
  - Dedupe integration check: run the import over fixtures of the two
    GG_EEL copies → expect 1 SRCV, 2 intake-path records, identical
    checksums.
  - Negative check: a version with status `candidate` is reported as
    excluded from retrieval candidates (full index-level enforcement
    lands with T10-006's gate-filtering hook §8.4).

Dependencies / interfaces:
  T10-003 accepted — this work order is not issuable before that.
  Shared SRC-*/SRCV-* identifier scheme with T10-005/T10-006; agree the
    scheme text at issuance so stage B does not block on stage A.
  State mapping: completed registration = `INGESTED → SOURCE_CHECKED`.

Handoff format and reviewer:
  DELIVERY.md handoff format appended to .leapfrog/log.md;
  reviewer: MSc integration lead.
```

## Open items for the human owner at issuance

1. Confirm the agent owner (proposed: ZCode / GLM-5.3Flash) and the next-update deadline for the board row.
2. Confirm the §9 #5 fetch-policy ruling so the fetch-helper lines are kept or struck from scope.
3. Decide whether `data/sources/**` originals are committed to git or gitignored — a repo-size/policy decision that affects the allowed paths and the dedupe fixture strategy.
4. Confirm the test location convention and the final verification command set.
