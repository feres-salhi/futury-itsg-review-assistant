# Team 10 Hot Cache | Updated: 2026-10-26

## Story showcase: 10 formal PDFs (T10-037) — 2026-10-26

- `python3 -m itsg.story_pdfs` → `reports/story-showcase/`: 10 formal PDFs (S1-001, S1-011,
  S1-021, S1-031, S3-051, S3-076, S4-081, S4-101, S6-141, S6-170) + artifacts + index.json.
- Layered deterministic evaluation per case: DBVO/flow field compare → versioned §3.12 rule
  (itsg.vorerkrankung) → story-4 61-reply field rules / story-6 flow rules (per generator
  taxonomy, testCase-stories.md) → ground-truth agreement row vs must_flag. No ad-hoc legal
  logic; NOT_EVALUATED for out-of-scope kinds; compliance NEIN everywhere.
- Demo-ready highlights: S1-021 (41 sent although <30 days — caught), S1-031 (PKV outside
  procedure), S3-076 (non-seamless days reported), S4-101 (period order §3.12.7), S6-170 (88
  references the wrong message); clean flows all-PASS. 250/250 shared suite.
- report_pdf gained additive artifact `context` rows (Story/Kategorie/Tag) in the Kopfdaten.

## Formal report PDF (T10-036) — 2026-10-26

- `itsg/report_pdf.py` renders the deterministic report artifact as a formal German-style PDF:
  client (Prüfobjekt) name + logo placeholder in the header, every-page footer "Maschinell
  erzeugt von SÜSIE" + SÜSIE logo + timestamp + SHA-256 (of the artifact content, timestamp-
  independent), Helvetica formal layout — presentation only, NO official-form/DIN claim
  (T10-035 finding). `compliance_claim` stays False, release-blocked notice in the PDF.
- Optional GLM summary ("glm 5.3 routing with deterministic data"): role `report_explainer`
  (recommendation-only) drafts from deterministic results only, marked "KI-Entwurf – ungeprüft";
  offline/gateway failure → PDF without summary + honest note + recorded error agent_run.
- Surfaces: CLI `python3 -m itsg.report_pdf --store data/demo [--live]`; bridge
  `GET|POST /api/report/pdf`; frontend report-view download button. Verified live: real
  gateway call returned a grounded summary (correct counts/case IDs), run recorded.
- Frontend browser smoke NOT RUN this session (no Playwright on this machine) — additive
  button/handler/i18n only, `node --check` PASS; next frontend session should re-run smoke.

## Legal-basis finding: no statutory report template — 2026-10-26 (T10-035)

- **Verified (agent research, human gate applies):** § 95b SGB IV (official text saved as
  G0-candidate **SRCV-2-A**) mandates the Systemprüfung but prescribes **no** report
  template/form/format (5 Absätze; only duty: version-identifiable software, Abs. 2). Procedure
  detail (Pflichtenheft, Prüfmitteilung, SP-Richtlinien) = GKV/ITSG administrative rules, not law.
- The client pitch deck (saved as G0-candidate **SRCV-1-A**, 13 pp., 23.10.2026) never claims a
  legally mandated report format — pp. 8/10/11 quote only the mandate and ask for "comprehensible
  test reports". Client corpus contains no official report form either.
- **Consequence:** synthetic-template + `compliance_claim=False` posture is evidence-backed — do
  not build against a "legal template", do not treat the empty template registry as a gap. Full
  note: [findings/2026-10-26-report-template-legal-basis.md](findings/2026-10-26-report-template-legal-basis.md).
  If a format was described verbally, ask ITSG (G. Friedrich) for the SP-Richtlinien reference —
  human action, then register as `form_template` + G0 + template gate.

## SÜSIE backend demo slice — 2026-10-26 (cp-007)

- **T10-018 implemented, IN_REVIEW.** The app is **SÜSIE — Systemüberprüfung
  sozialversicherungsrechtlicher IT-Ergebnisse** (human naming directive, 2026-10-26). The
  approach-A vertical slice runs from a clean start: `python3 -m itsg.demo --fresh` (offline,
  deterministic) or `--live` (real gateway calls).
- **Stories/cases wiring (2026-10-26 late night, human directive, cp-013):** expert subagent
  team wired the new backend surfaces into the UI: bridge /api/state + stories (200 cases)/
  reviews/harness + POST /api/review/run; 5th view "Story-Suiten" and "Prüfläufe (Backend)" in
  the report view; full DE/EN i18n; unittest 215/215, smoke PASS vs the live bridge.
- **Frontend feature pass + backend bridge (2026-10-26 night, human directive, 7 requirements,
  cp-011):** settings menu (theme/mode/language/API config), theme-cycle icon, EN/DE full chrome
  i18n, subtle reduced-motion-aware motion, elevated sidebar, stdlib HTTP bridge
  (`itsg/webserver.py`: /api/state, /api/run, /api/health) serving the frontend and the itsg
  store with honest synthetic fallback. unittest 124/124; smoke rewritten, PASS vs bridge.
  themes.js merged into the main script. NOTE task-ID collision: two sessions both used
  "T10-031" (frontend pass vs corpus integration); cp-010 = corpus session, cp-011 = frontend
  pass — lead to disambiguate at review.
- **Fixtures (cited, fabricated data):** BP §3.1 pp. 9–11 (normal, official DSLW/DBAL/DBAE
  expected record), §3.2.1.4 p. 12 (boundary), incomplete-input case (→ NOT_EVALUATED by design),
  official Vorerkrankung constellation (25+10=35 days ≥ 30), synthetic template profile. Citation
  objects carry section/pages/V13.3/effective 01.01.2027/SHA-256 of the source PDF.
- **itsg/ chain:** store → criteria (G3) → cases → fail-closed comparator (PASS / MISMATCH with
  both values / NOT_EVALUATED) → renderer on the labeled synthetic template (`compliance_claim`
  always False) → deterministic conformance (blocked never passes) → evidence-chain trace.
  `vorerkrankung.py` implements the VB DTA EEL §3.12 trigger rule (versioned, unit-tested).
- **AI candidate roles (governance §3/§8):** requirement_extractor + independent_test_challenger
  on `vllm/GLM-Flash:Latest`, test_case_designer on `vllm/Kolibri-1` (different model than the
  case author). Candidates only: `review_required=true` forced, cite-or-abstain (uncited extractor
  output → needs_review), author ≠ reviewer enforced, challenger recommendation-only. Proven live:
  citable candidate on VB §3.12; legitimate abstention on fragmentary input.
- **Secrets:** the disposable gateway token from root `api.py` now lives ONLY in the encrypted
  store `data/secrets/` (Fernet + PBKDF2, 0600, gitignored); never copied into source, fixtures,
  tests, or logs. `api.py` itself still holds the plaintext literal — owner should delete the key
  server-side and strip the literal (outside T10-018 scope).
- **Verified:** `python3 -m compileall -q pipeline itsg tests` PASS; `python3 -m unittest discover
  -s tests` **117/117 OK** (64 prior + 53 new); clean-start demo PASS offline AND live;
  `git diff --check` PASS. LLM endpoint policy is SSRF-hardened (DNS-resolved public hosts only,
  redirects refused) and unit-tested.
- **Boundaries kept:** Beispielpapier expected records = payroll transmit side; no benefit-amount
  claims; synthetic template only; fabricated data only. Deterministic work (comparator,
  conformance, Vorerkrankung) has no LLM in the loop (governance §1.6).
- **Next:** reviewer/self-review acceptance; then B upgrade (T10-004 importer → T10-005 segmenter,
  one document → T10-006 index) and typed-record integration with the cp-008 frontend.

## Frontend handoff correction — 2026-10-26 (cp-008)

- **Canonical UI:** `frontend/` in this repo. T10-030 IN_REVIEW. Previously only in Codex visualization workspace; that delivery omission is now corrected. All 12 selected imported files SHA-256 matched; source retained.
- **Product/design:** SÜSIE — Systemüberprüfung sozialversicherungsrechtlicher IT-Ergebnisse; ITSG reviewers; user-selected Prüfakte. Casual/High Contrast × light/dark. Generated transparent logo plus exact prompt in `frontend/assets/`; dark CSS white. Stable explicit Arial UI; no false claim that Calibri loaded.
- **Run:** `python3 -m http.server 8766 --bind 127.0.0.1 --directory frontend`; open local port 8766. Port 8765 is the older external preview.
- **Verified:** fresh repo-served Chromium checks PASS; 12 theme/viewport screenshots, filters/evidence/notes/reload/export, 320–2560px, 200% root text, reduced motion, forced colors, print, storage denial, logo failure. Reports in `frontend/verification/`. No Safari/physical-device/screen-reader claim.
- **Boundaries:** synthetic UI data, no backend endpoints, no legal approval or certification; export `compliance_claim:false`, release blocked. T10-018 remains backend-owned IN_PROGRESS per board; no backend files edited or tests rerun. Preserve peer updates. cp-007 reserved for that backend session.
- **Do not repeat:** preview-only delivery; separate pages instead of requested impeccable live variants; rejected green/blue-gray skin; index-redirect assertion without awaiting URL. Future edits and handoffs use `frontend/` plus repo records.
- **Next:** human accepts packaging, integration owner agrees API/typed-record adapter with T10-018, then run integrated backend/UI checks. No commit/push/deployment performed.
- Session: [SÜSIE frontend handoff](sessions/2026-10-26-susie-frontend-handoff.md). Earlier backend snapshots below are historical; active state comes from current board/log.


## What this project is

Futury Team 10 is preparing an ITSG AI review-assistant prototype for payroll software in the *Entgeltersatzleistungen* scope. The prototype is a traceable testing workflow, not a legal decision-maker or benefits calculator.

## What just happened

- First pipeline design brainstorm (2026-10-26): how to ingest the `ITSG Files/` corpus, chunk it, and index it for RAG without VLM cost.
- Corpus survey with PyMuPDF showed: all PDFs have text layers (no OCR needed) and every core document is a tagged PDF with real H1–H6 structure; verification baselines recorded in `ingestion-pipeline.md` §2.
- General-purpose converters (MarkItDown, Marker, Docling) were evaluated and set aside for PDFs: they infer headings probabilistically and normalize text, violating the Segmenter contract.

## What changed

- T10-030 fix pass (2026-10-26 evening, ZCode took over from Codex per human directive): all 5 impeccable-critique priority issues fixed (desktop scroll-to-detail, notes visible in report view, note delete + draft markers, Klärungspunkte filter toggle, live trace-path) + minor cleanups (logo srcset with derived 380/760 variants — original untouched, favicon, dead elements removed). Smoke suite PASS (2 assertions updated: density-corrected srcset naturalWidth, broken-image route widened to susie-logo*.png); detector unchanged. cp-009 written. Details in .leapfrog/log.md.
- New `ingestion-pipeline.md` (T10-003): proposed three-stage design — registry/inbox (stage A), deterministic segmenter (stage B), FTS5 index builder (stage C); `data/sources/` is truth, `data/index/` is a rebuildable cache; G0 gate filters what enters retrieval.
- `architecture.md` §12 added, linking the proposal as **proposed, not accepted**.
- Board: T10-003 `IN_REVIEW` (deliverable complete, reviewer acceptance pending); T10-004–T10-006 added as `READY` implementation rows (no work orders issued yet).
- Checkpoint pair cp-004 written; tracks red and black updated.
- T10-007: third-party agent skills vendored under `.agents/skills/` (impeccable, taste-skill, 7 code-review-graph skills) from SHA-pinned upstream tarballs, with provenance/security notes in `.agents/skills/README.md` and a `.claude/skills` symlink.
- T10-016 (human-approved follow-ons): impeccable design hooks ENABLED (config + consent + manifests for Claude Code/Codex; engine 0.1.17 checksum-verified; verified end-to-end with a real PostToolUse payload) and code-review-graph CLI v2.2.2 installed with MCP wiring (`.mcp.json` pinned to the installed CLI, graph-update hooks in `.claude/settings.json`), initial graph built (62 files, 1417 nodes, 11487 edges). CRG's installer overreach (AGENTS.md injection, GEMINI.md/.cursorrules/.windsurfrules, loose generated skills) was removed immediately — details in `.agents/skills/README.md` security notes and the T10-016 log entry.
- T10-015 (solo directive): internal architecture skeleton implemented — `pipeline/` (ingestion stages A–C) + `itsg/` (typed records, G0–G6 gates, state machine, JSON store, fail-closed comparator); 64 stdlib tests pass; fail-closed behaviors enforced (comparator, G0 human-only, accepted-only retrieval, fetch URL policy, blocked-by-default conformance). Map + stub inventory: `prototype-map.md`. Heavy lifting (importer, extractors, index build, verify hooks, renderer) is stubbed with NotImplementedError pointing at owning tasks.
- T10-017: corpus content deep-dive folded into `ingestion-pipeline.md` §2 + `architecture.md` §10/§12. Verdict: Beispielpapier DTA EEL V13.3 = official expected-value ground truth (~62 worked examples, field-level records incl. negative results); Anlagen = Gemeinsame Rundschreiben (normative rules, no numeric expected values); official multi-step test constellation DOCX + TEEL0 wire-format fixture. Boundary: transmit-side only.
- Brainstorm completed (2026-10-26 evening): client deck read; staged-autonomy framing adopted; three build approaches laid out; **human owner approved A-then-B**. Design doc: `docs/superpowers/specs/2026-10-26-prototype-build-design.md`. Board: T10-018 (approach-A demo slice) `READY`; next-session prompt delivered in chat; cp-006 pair written.

## Verification snapshot

- Corpus measurements (§2 of `ingestion-pipeline.md`) were taken by read-only scripts on branch `amourification/pdf-chunking`; re-runnable.
- T10-015 skeleton: `python3 -m compileall -q pipeline itsg tests` PASS; `python3 -m unittest discover -s tests` 64/64 OK (stdlib only); CLI entry points smoke-tested (`python -m pipeline.registry|segmenter|index` exit 2 with owning-task notices); nothing committed/pushed.
- T10-016: impeccable engine probe OK (sha256-verified download); hook smoke test returned the expected `[gradient-text]` finding; CRG `--version` → 2.2.2; MCP `initialize` handshake OK; graph `status` → 1354 nodes / 10774 edges post-build; `git diff --check` passed; AGENTS.md restored to HEAD after CRG injection.
- T10-017 + cp-006 handoff: `git diff --check` PASS (docs-only edits: ingestion-pipeline.md, architecture.md, board, log, design doc, cp-006 pair, index/hot/track-1-red). Corpus evidence re-runnable (PyMuPDF text extraction + stdlib zipfile).
- Documentation-only change: no application code touched; `git diff --check` run at T10-003 completion (see log).

## Already tried / avoid repeating

- The `agile-delivery` skill was never found; `DELIVERY.md` is the local protocol. Do not claim it was applied.
- Do not retry VLM or docling/marker-based chunking for this corpus before the deterministic segmenter is attempted and its reconciliation results are recorded.

## Active focus

- **Implement T10-018 (approach-A demo slice)** per `docs/superpowers/specs/2026-10-26-prototype-build-design.md`: cited fixtures (BP §3.1 normal + one Abwandlung boundary + invalid-input) → Vorerkrankung 30/12 deterministic function → `itsg/` chain → comparator → renderer/conformance (`compliance_claim=False`) → AI candidate roles → plan.md 3-min demo.
- B upgrade (only if slice stable + clock allows): T10-004 importer → T10-005 segmenter (one document, not Anl3) → T10-006 index + verify hooks.
- Integration lead review of `ingestion-pipeline.md` still pending; §9 leans remain PROVISIONAL. Reviewer brief: `.leapfrog/reviews/t10-003-review-brief.md`; T10-004 work order DRAFT (not issued): `.leapfrog/workorders/T10-004-workorder-draft.md`.
- T10-002 remains `IN_REVIEW` (reviewer acknowledgment pending).

## Open questions

- §9 decisions of `ingestion-pipeline.md`: index stack, MD export view, table handling, demo corpus scope, fetch policy, embedding model.
- Human G0 owner for the real ITSG documents and the qualified domain/legal reviewer are still unnamed.

## T10-039 report review — cp-017 (2026-10-26)
PDF visual acceptance failed: staircase rows, long-token overflow, long-row truncation. Targeted tests 18/18 pass but do not test geometry. Client identity/logo web wiring and PDF evidence references incomplete; malformed summary JSON bypasses degradation. Owner fix and human acceptance pending.

## T10-040 PDF redesign — cp-018
Renderer 0.2.0 fixes measured wrapping, long finding continuation, missing evidence and malformed-summary fallback; result overview, letterhead, readable footer, technical appendix. Showcase regenerated from unchanged artifacts: 8 two-page + 2 three-page reports. 255/255 tests, all-page bounds/hash checks and visual inspection pass. Human acceptance pending; client profile/logo web integration remains separate.
