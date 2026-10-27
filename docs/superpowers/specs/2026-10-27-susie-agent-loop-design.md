# SÜSIE Final Sprint — Design (Agent Loop, Uploads, Native Shell Restructure)

**Status:** Approved by owner (Amr) 2026-10-27. Draft v2 covered the full sprint; v1 the agent loop only.
**Human owner:** Amr (solo mode — self-review, human acceptance pending).
**Agent owner:** ZCode / GLM-Flash.
**Why now:** the prototype passed initial owner testing and the ITSG social-law expert walkthrough. The pitch is the next gate. Owner directives: SÜSIE performs **fully live** on stage; the Expertenmodus as an embedded second frontend ("vibe-coded slop") dies; every real capability of the repo becomes visible and drivable; copy speaks the reviewer's language, never the database's.

## 1. Intent and why

Today the product is two frontends stapled together. Simple mode (Prüffälle, Prüfbericht, Quellen, Regelwerke) renders real store data but has no generation flows and no cross-links: the report view cannot generate or even guide to generation, cases don't drill into reports, sources never show the criteria/gate records the payload already carries, nothing links into the regulation browser. Expertenmodus is a 1,311-line second frontend (`frontend/pruefakte.js`) embedded via iframe with zero message passing, three near-total duplicate panels, hardcoded fake-data flashes, and its own tokens/i18n/health — while the genuinely expert capabilities (gate recording G1–G6, reviewer notes, conformance, release request) have **no UI anywhere** and only surface if the chat model happens to propose them.

Target state:

- **One shell.** Simple mode is the complete working surface; Expertenmodus becomes a native **governance workspace** (Freigaben queue, Verlauf, Story-Suiten). The Prüfakte app is formally retired from the product.
- **Three upload flows, fully live:** regulation/law → the real ingestion pipeline (registry → segmenter → FTS → searchable); software report (TEEL0) → the real evaluator → findings in the store; case instruction or filled case → drafts in the approval queue.
- **SÜSIE as native tool-calling agent** (v1 scope, unchanged): she owns nothing; tools call the repo's machinery; humans decide at gates.
- **Copy discipline:** gate IDs (`G0`, `needs_review`, `NOT_EVALUATED`) are storage/audit identifiers, never UI copy.

## 2. Goals / non-goals / anti-goals

**Goals**
1. Native shell restructure: iframe and duplicate panels deleted; approvals queue, Verlauf, Story-Suiten rebuilt natively; formal retirement of pruefakte with zero dead references.
2. Upload flows (backend + UI + SÜSIE tools) at full pipeline depth, with honest degradation labels.
3. Governance surfaces for every existing gate/action: G0 on fresh uploads *and* the record gates, notes, conformance, release — all through the existing confirm-token action whitelist.
4. Cross-linking finished: failed case → report section, report row → case, source → law text in Regelwerke, finding → its expected-basis chunk.
5. SÜSIE agent loop with real tools (§5.1–5.2), G0 surface-and-glue (§5.3 bridge), async jobs (§5.4), chat rendering fix (§5.5).
6. Copy pass over the whole shell (DE first): plain-language gate labels, "KI-Rollen entwerfen, Sie geben frei" division-of-labor wording.
7. Rehearsal harness as the pitch gate (§5.7).

**Non-goals:** no login (owner decision stands); no vector search; no auto-crawl; no changes inside the orchestrator graphs (called, not modified); no gate automation; no new legal claims; no rewrite of pruefakte as a maintained standalone (it is retired, not demoted); no perfect structure detection for arbitrary PDFs beyond what the pipeline genuinely extracts — honest "grob segmentiert" labeling instead.

**Anti-goals (failure even if it works):** a gate recorded by the assistant; an uncited legal statement; a plaintext key anywhere new; fake data rendered anywhere in the shell; the demo pretending AI did what code did; a silent store wipe; zombie files or dead nav links left behind by the retirement.

## 3. Constraints

- Governance: cite-or-abstain (§1), recommendation-only (§4), deterministic work stays deterministic (§1.6), gates human-only with skip protection (`itsg/actions.py:_check_gate_ordering`).
- Privacy: every outbound model call through the Datenschutz-Schleuse (`privacy/schleuse.py`, fail closed) — **including the orchestrator's own LLM transport** (`orchestrator/llm.py`), which today bypasses it; only its Langfuse payloads are guarded. Routing that transport through the Schleuse is in scope (the non-goal protects the graphs' logic, not the transport). Anthropic is a new destination → new policy entry with the `hessian_ai` mode (pseudonymize-then-block), same detector set. Envelopes record categories/counts only.
- Webserver is stdlib `http.server` — in fact a `ThreadingHTTPServer` with ad-hoc per-feature locks (`_run_lock`, `_pdf_lock`, whole-turn chat lock), JSON-body POST only today; uploads need a new multipart/raw handler with size cap and type allowlist. **Store concurrency is a real hazard:** `itsg/store.py` does whole-file read-modify-write with no lock, so concurrent request threads + background jobs invite lost updates (the "silent store wipe" class). A single store/job write lock is part of this design (§5.4).
- No `.gitignore` by owner directive; secrets via `.git/info/exclude`; new key handling = env vars only.
- Rendering discipline: no `innerHTML` (the two existing guarded uses stay the exception); escaped-first markdown (`mdToSafeHtml`) is the only rich-text path.
- Team: pruefakte is another member's deliverable — retirement is an explicit, logged owner decision (authorized 2026-10-27), recorded on the board and in `.leapfrog/log.md`; the published snapshot 667d161 preserves it in history.

## 4. Approaches considered and decided

**Fork 1 — Expertenmodus future.**
- **A. Kill the iframe, rebuild natively — CHOSEN.** One codebase, real consistency (tokens/themes/i18n/health), browser behaviors work (find-in-page, print, focus, scroll), trivial state truth, demo risk shrinks. Cons and their handling: (a) bigger one-time build → its own board ID and wave, port notes/filters behavior carefully; (b) no iframe isolation → per-panel render guards with honest error cards + retry so one failing view can never take down the shell; rendering discipline unchanged; no new mutation paths.
- **B. Keep iframe, fix wiring.** Rejected: cheaper day one, but two frontends/two token sets/two i18n/bridge protocols remain a permanent tax on every new feature (the uploads and approvals queue are shell-side), and the find-in-page/print/focus/sizing ceiling stays. Manages the slop instead of removing it.

**Fork 2 — upload indexing depth.** Owner decision: **as deep as the pipeline goes.** Upload traverses registry → segmenter → FTS → retrieval/Regelwerke. Segmentation uses the pipeline's real structure extraction (heading/§ heuristics generalized beyond the six hardcoded PDFs, `src/chunking.py:41-67`); when structure detection had to guess, the document indexes with a visible honest note. DOCX extraction (`pipeline/segmenter/docx_extractor.py` stub; python-docx already in requirements) gets implemented for law and case documents.

**Case upload semantics.** One governance rule, two entry points, nothing lands un-approved: instruction document → SÜSIE's `generate_cases` tool → design graph drafts → approval queue; filled case file → `import_case` tool → draft directly into the same queue. `import_case` is the designated scope-cut if the sprint tightens.

**Agent-loop approach (v1, unchanged):** native Anthropic tool-use loop inside the existing enforcement shell; bigger deterministic layer rejected (phone tree); LangGraph orchestrator as engine rejected (specialized, CLI-bound) — it stays a callable tool.

## 5. The decided how

### 5.0 Wave R — native shell restructure (first; everything else lands in the new IA)

- **Sidebar IA.** Simple mode: Prüffälle, Prüfbericht, Quellen, Regelwerke. Expertenmodus group → **Governance** group: *Freigaben* (approvals queue), *Verlauf*, *Story-Suiten*. SÜSIE entry, footer tools unchanged.
- **Freigaben (approvals queue).** One view, all pending human decisions from the store: sources awaiting G0 ("Quelle freigeben"), draft requirements/criteria/cases awaiting sign-off, review-state (G4/G5) and release (G6) proposals. Each card: what is being decided, plain-language act ("Quelle freigeben", "Prüfkriterien freigeben", "Bericht zur Freigabe vorlegen"), typed reviewer name + rationale (consistent with the no-login decision). **Solo-mode rule:** a named human reviewer is always required; self-approval (uploader = reviewer) is permitted and every such record is labeled "Selbstfreigabe" in the audit trail with the pitch line "im Produkt: zweite Person" — the demo never blocks on a missing second human. Where author ≠ reviewer is available, four-eyes applies unchanged. Actions go through the existing whitelist + confirm tokens; the chat can propose, never record.
- **Verlauf.** Store event/gate/AgentRun timeline, human-readable labels over exact records, filter by kind. Replaces the audit panel; the 3 hardcoded seed events die.
- **Story-Suiten.** Port of the working stories filter/sort/detail behavior, native components, store-driven only. The sessionStorage notes concept ports to the store as reviewer notes (or is cut, builder's call with evidence).
- **Retirement.** Delete `frontend/pruefakte.html/js/css`, the iframe view, and all wiring (`susie.js:1883-1897`); scrub help center, `data-help` registry, i18n keys, CSS; board + log record the retirement with pointer to 667d161. `node --check` + full suite + a scripted nav audit prove zero dead references.
- **Render guards.** Every view body renders inside a guard: caught error → honest error card ("Diese Ansicht konnte nicht geladen werden") + retry; shell and other views unaffected. Global error handler logs; never a blank screen.
- **Cross-links (finished here, fed by later waves):** report row → case; failed case → its report section; source card → law text in Regelwerke (`/api/regulations` deep link); finding expected-basis → chunk view. The one-way source-chip jump stops being the only link.

### 5.1 Agent core (`itsg/agent.py`, new; `itsg/chat.py` thin dispatcher) — v1 unchanged

Sonnet via `ANTHROPIC_API_KEY` — model id from env `SUSIE_MODEL`, default `claude-sonnet-5-5` (aligned with `orchestrator/llm.py`'s default); fallback to hessian GLM-Flash on **either** missing key **or** per-call transport error, then the rehearsed degraded utterance. Max 8 tool steps, ≤90 s wall clock shared across the fallback chain; final utterance passes today's deterministic enforcement (cite-or-abstain, action whitelist + confirm tokens, disclaimer, gate handback). Deterministic command layer stays first for rehearsed demo-critical navigation. Envelope records which model actually answered.

### 5.2 Tool registry (`itsg/tools.py`, new)

| Tool | Backing code | Class |
|---|---|---|
| `search_regulations(query)` | pipeline FTS / `itsg.retrieval` | read-only |
| `fetch_regulation_chunk(source_version_id, locator)` | chunk reader | read-only |
| `ingest_regulation(file_id)` | upload → registry → segmenter → FTS (§5.4 job) | job |
| `list_ingest_status(file_id)` | job/manifest state | read-only |
| `request_g0_approval(source_version_id)` | pending-approval record | proposal |
| `search_cases(query, status)` / `fetch_case(case_id)` | store | read-only |
| `evaluate_report(file_id, case_id)` | TEEL0 upload → `run_review.parse_teel0`/`dbvo_findings` → execution + finding records → report artifact (§5.4 job) | job |
| `generate_cases(instruction, source_scope)` | orchestrator design graph (mock flag respected) → draft cases | job |
| `import_case(file_id)` | parsed case doc → draft test case record | proposal |
| `export_report()` / `seal_report()` | existing actions | proposal |

Uploads arrive via **`POST /api/upload`** (multipart/raw; size cap; allowlist pdf/md/docx/txt for laws and cases, txt for TEEL0-shaped report files) → `data/inbox/` with checksum + manifest candidate. Tools never accept a model-supplied path — server-issued file ids only (path containment).

### 5.3 Upload flows (the three, end to end)

- **Regulation.** UI: Regelwerke header button "Gesetz hochladen" (also SÜSIE tool). Flow: `POST /api/upload` → `register_inbox` (`pipeline/registry/importer.py`, checksum dedupe, manifest `candidate`) → **Freigaben** card "Quelle freigeben" (reviewer + rationale) → accept triggers the bridge: generalize chunker beyond the hardcoded `DOCS` dict (heading/§ segmentation; docx via implemented extractor) → FTS rebuild → store record `status="approved"` → searchable in `/api/regulations` and SÜSIE retrieval. Reject/supersede preserved. Honest label when segmentation is coarse.
- **Software report.** UI: Prüffälle header button "Softwareausgabe hochladen" (+ case selection, defaults to the current comparison basis). Flow: upload → `run_review.parse_teel0` + `dbvo_findings` (fixed-width latin-1; malformed → BLOCKED finding, never PASS) → write execution + finding records into the store (the glue `/api/review/run` lacks today) → report artifact regenerates → Prüfbericht export works. Prüfbericht gains "Bericht erzeugen", which runs the evaluation when the store is stale and says so.
- **Case.** UI: Prüffälle header button "Prüffälle aus Vorlage erstellen" (+ chat). Instruction doc (docx/pdf/md/chat) → `generate_cases` job (design graph) → drafts into Freigaben; or filled case file → `import_case` → draft. Both surface identically in the approvals queue.
  **Graph-internal gates inside a server-side job — decided: mid-job approvals.** The design graph pauses at its human gates (G1/G3) via CLI interrupts today; in the product the job pauses and the pending decision appears as a Freigaben card ("Anforderungen bestätigen" / "Prüfkriterien freigeben"); the human decides with reviewer name + rationale; the job resumes. Resumable state comes from LangGraph's own SQLite checkpointer — no hand-rolled serialization; the orchestrator's graphs stay unmodified (the checkpointer wraps invocation, not graph logic). **Failure paths, not alternative modes:** a pending approval that exceeds its expiry fails the job honestly; a resume error completes the job non-interactively and lands all outputs in Freigaben as drafts labeled "ohne Zwischenfreigabe abgeschlossen". Every intermediate step is recorded (AgentRun envelope, graph run log, labeled un-approved machine proposal); store gate records are created only at the human moment — full traceability in all paths. Expected-value computation stays DTA-EEL-scoped (`generate_cases.decide`); cases generated from an arbitrary uploaded law are honestly labeled "ohne berechnete Sollwerte".

### 5.4 Async jobs and store concurrency

In-memory job table (`{job_id, kind, status, steps[], started_at, ended_at, result_ref}`); kinds `ingest`, `evaluate`, `generate`; a `generate` job can enter status `awaiting_approval` (graph paused on a human gate, Freigaben card linked) until decided or expired (§5.3). Jobs run as **in-process worker threads**, and all store mutations — request handlers and jobs alike — serialize behind **one global store write lock** (replacing reliance on the ad-hoc per-feature locks for store safety). Progress card in chat; Freigaben and the owning view also reflect job state. Graph extraction inside ingest only if `GRAPH_ENABLED=1` and Neo4j reachable, else honestly `skipped`; artifacts always hit disk. Memory-only persistence is fine for the demo; the limitation is documented.

**Index strategy (regulation uploads):** new chunks live per source version (`data/sources/SRC-*/SRCV-*/chunks/`), not in the shared `chunks/` dir; the retrieval layer indexes shared corpus + all accepted per-SRCV chunk sets (one index rebuild command, append-friendly). The existing six-`DOCS` outputs stay byte-identical so the demo corpus cannot regress; a scripted check asserts that.

### 5.5 Chat rendering fix — v1 unchanged

One message container (bubble + extras + action card + result inside); markdown-lite gains numbered lists/headings; citation markers → chips; raw-JSON detector → code block or re-parse; text-node based.

### 5.6 Copy rules (whole shell, DE first)

- Gate IDs are never UI copy. Mapping (internal → surface): G0 → "Quelle freigeben"; G1 → "Anforderungen bestätigen"; G3 → "Prüfkriterien freigeben"; G4/G5 → "Prüfschritt festhalten" / "Konformität bewerten"; G6 → "Bericht zur Freigabe vorlegen"; `needs_review` → "Wartet auf Freigabe"; `NOT_EVALUATED` → "Nicht bewertbar — Grundlage fehlt". Internal IDs may appear as secondary reference metadata (like RPT- IDs today), never as the label.
- Division-of-labor wording: "SÜSIE stößt … an — die KI-Rollen entwerfen, Sie geben frei." Never "SÜSIE erstellt/entscheidet".
- Audit trail keeps exact machine records underneath the human labels; copy translates, it does not replace the record.
- Inline `LANG === "de" ? … : …` ternaries in renderReport/renderSources/reg views migrate to I18N keys during this pass.

### 5.7 Rehearsal harness — v1 unchanged, extended

`tests/rehearsal/`: the four live flows (regulation upload→gate→searchable; report upload→findings→report; case instruction→drafts; lookup) plus hostile inputs (prompt injection in an upload, personal data planted, model down mid-flow, oversized file, malformed TEEL0) asserting final state + audit + privacy envelopes; mock CI mode + `--live` pre-pitch mode; stage-mode preflight command (keys, ports, Neo4j, store state → go/no-go).

## 6. What's left to the builder

Exact CSS/i18n strings; job-table persistence (memory-only fine for demo, document the limitation); test layout; exact tool JSON schemas; whether `record_g0` needs a decision-log entry (check conventions); render-guard granularity (per view vs per card); whether sessionStorage notes port to store notes or get cut (with evidence); the chunker's exact heading heuristics per document type.

## 7. Verification posture

Every wave: stdlib suite + pytest scopes touched, `node --check`, browser-verified on a live bridge, evidence in `.leapfrog/log.md`. The restructure wave additionally proves zero dead references by scripted nav audit. The rehearsal suite is the pitch gate: all scenarios green on the live stack (or honestly degraded) before stage.

## 8. Board plan (IDs confirmed at claim time)

- **T10-046** SÜSIE agent loop + chat rendering fix + rehearsal harness core (v1 scope).
- **T10-047** G0 surface-and-glue (registry↔store bridge, Freigaben G0 cards, endpoints).
- **T10-049** Wave R: native restructure, governance workspace, retirement, render guards, cross-links.
- **T10-050** Upload flows end to end (endpoint, pipeline depth, evaluator glue, case paths).
- **T10-048** residual polish (report grouping, cases toolbar residuals) lands *inside* the new IA after T10-049.
