# Wave R — Native Shell Restructure Implementation Plan (T10-049)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Expertenmodus iframe with a native Governance group (Freigaben, Verlauf, Story-Suiten) in the SÜSIE shell, retire the Prüfakte app with zero dead references, add render guards and finished cross-links, and apply the copy rules (gate IDs never UI copy).

**Architecture:** One stdlib backend addition (`itsg/governance.py` + `GET /api/governance`) serves pending human decisions, gate records, and the event timeline from the existing store. The frontend gains three native views rendered from that payload plus the existing `/api/state`, wrapped in per-view render guards so a failing view never kills the shell. Deletion of `frontend/pruefakte.*` and its wiring happens only after the native replacements work.

**Tech Stack:** Python stdlib webserver (`http.server`), itsg JSON store, vanilla JS (createElement/textContent discipline, existing I18N dict, existing action bus with confirm tokens).

**Spec:** `docs/superpowers/specs/2026-10-27-susie-agent-loop-design.md` (§5.0 Wave R, §5.6 copy rules; §8 board plan)

## Global Constraints

- No `innerHTML` anywhere new; rich text only via the existing escaped-first `mdToSafeHtml` path; all store-sourced strings rendered with `textContent`.
- Copy: gate IDs (`G0`…`G6`), `needs_review`, `candidate`, `NOT_EVALUATED` never appear as UI labels — labels come from the `GATE_LABELS` map (Task 7). Division-of-labor wording: "SÜSIE stößt … an — die KI-Rollen entwerfen, Sie geben frei."
- Gates stay human-only: the UI only calls actions on the existing whitelist (`itsg/actions.py:49-55`) through the existing confirm-token `invoke()` bus; no new mutation path.
- No fake data: a missing/empty payload renders an honest empty state, never placeholder records.
- DE first: every new string exists in both `I18N.de` and `I18N.en` at creation time.
- Local commits per task on `amourification/susie-assistant` are allowed; **no push** — push needs explicit owner authorization (T10-045 precedent).
- Every task ends with: `node --check frontend/susie.js` (when touched), the stdlib suite green, and browser-verified evidence for UI tasks on a live bridge.

## Review Focus

1. **Empty/missing payloads** (fresh store, bridge down, `stories.ok === false`): new views must show honest empty states — pinned by Task 4/5/6 tests and browser step.
2. **Volume** (200+ stories, thousands of events): Verlauf caps initial render and filters server-free; stories sort/filter stay responsive — pinned by Task 5/6 browser steps at full demo store.
3. **XSS via store strings** (finding `reason`, gate `rationale`, reviewer names, story text): textContent-only rendering — pinned by Task 4 test asserting a planted `<img onerror>` string renders as text.
4. **Language/theme toggle mid-session:** every new view re-renders in the active language immediately (no cached DOM strings) — pinned by Task 7 browser step toggling DE/EN with Freigaben open.
5. **View stack integrity:** `go_back` and `view_changed` work with the three new views; back never lands on the deleted `advanced` view — pinned by Task 9 nav audit.

---

### Task 1: Governance payload endpoint

**Files:**
- Create: `itsg/governance.py`
- Modify: `itsg/webserver.py` (do_GET route table ~line 827-876)
- Test: `tests/test_governance.py`

**Interfaces:**
- Consumes: `itsg.store.Store` (`store.all(kind)`, `store.events()`), status vocabularies from `itsg/records.py` (`needs_review | candidate | approved | rejected | superseded`; `review_status: draft | approved | rejected`).
- Produces: `collect_governance(store_root: Path) -> dict` with exactly: `{"ok": bool, "pending": [ {"kind": str, "id": str, "label_key": str, "detail": str, "proposed_action": str|None, "created_at": str} ], "gates": [ {gate record + "label_key": str} ], "events": [ {event + "label_key": str} ]}` and route `GET /api/governance`.

- [ ] **Step 1: Write the failing test** — build a temp store, `put()` a source with `status="needs_review"`, a criterion with `review_status="draft"`, one `gate` record, then:
  - `test_pending_groups_pending_items`: source and draft criterion appear in `pending` with `label_key` values (`"pendingSource"`, `"pendingDraft"`), approved records do not.
  - `test_gates_carry_label_keys`: the gate record's `label_key` maps via the same table the frontend uses (imported from `itsg/governance.py:GATE_LABELS`).
  - `test_events_capped`: with 3,000 events, `events` returns at most the newest 500 and keeps ascending `seq`.
  - `test_empty_store_ok`: empty temp store → `{"ok": True, "pending": [], "gates": [], "events": []}` (no exception).
- [ ] **Step 2: Run** `python3 -m pytest tests/test_governance.py -v` → FAIL (module missing).
- [ ] **Step 3: Implement** `collect_governance` — pending = sources with status in `{needs_review, candidate}` + criteria/test_cases with `review_status == "draft"`; `GATE_LABELS` dict mapping gate id → label key (values per spec §5.6: G0→"actSource", G1→"actRequirements", G3→"actCriteria", G4/G5→"actReviewStep"/"actConformance", G6→"actRelease"); events capped to newest 500. Route `GET /api/governance` in the `do_GET` allowlist next to `/api/state`.
- [ ] **Step 4: Run** `python3 -m pytest tests/test_governance.py -v` → PASS; full suite `python3 -m pytest tests/ -q` → PASS.
- [ ] **Step 5: Commit** (local, no push): `feat(t10-049): governance payload endpoint`

### Task 2: Render guards

**Files:**
- Modify: `frontend/susie.js` (helpers region near `flash()` ~line 695)
- Test: `frontend/checks/` browser step only (JS-side; no unit framework in repo)

**Interfaces:**
- Produces: `withViewGuard(viewName: string, renderFn: () => void) => void` — wraps a view render in try/catch; on error renders an honest error card ("Diese Ansicht konnte nicht geladen werden." / EN) with a "Erneut versuchen" button re-invoking `renderFn`, logs to console; `window.addEventListener("error", …)` prevents a blank shell (shows a bottom toast, never replaces the DOM).

- [ ] **Step 1: Implement** the two functions per the signatures above; error card built with `el()`/`textContent` only.
- [ ] **Step 2: Verify:** `node --check frontend/susie.js` PASS; browser: temporarily throw inside `renderReport` (devtools override), confirm the report view shows the error card while cases view still works, remove the throw.
- [ ] **Step 3: Commit:** `feat(t10-049): per-view render guards`

### Task 3: Sidebar IA + view registration

**Files:**
- Modify: `frontend/susie.html` (sidebar `side-group` block lines 60-72; new view sections after line 136), `frontend/susie.js` (`showView` line 701-720, `I18N` lines 37-58)
- Test: browser step

**Interfaces:**
- Produces: view ids `freigaben`, `verlauf`, `stories` registered in `showView`'s id list (replacing `"advanced"` in Task 9, coexisting until then); sidebar group titled "Governance" with three `side-link`s using `data-view` (dropping the `data-adv` mechanism); I18N keys `governance`, `governanceSub`, `freigaben(Sub)`, `verlauf(Sub)`, `stories(Sub)` in DE and EN.

- [ ] **Step 1: Implement** the sidebar group and empty view sections (`#view-freigaben`, `#view-verlauf`, `#view-stories`), extend `showView`'s id array and `.side-link` handling (the old `.side-adv` toggle block dies here).
- [ ] **Step 2: Verify:** `node --check` PASS; browser: all three views toggle, topbar title/sub follow, old Expertenmodus items gone.
- [ ] **Step 3: Commit:** `feat(t10-049): governance sidebar group + view registration`

### Task 4: Freigaben view

**Files:**
- Modify: `frontend/susie.js` (new `renderFreigaben()`; fetch of `/api/governance` in `loadState()` chain), `frontend/susie.css`
- Test: `tests/test_governance_payload_shape.py` (shape contract the renderer relies on) + browser

**Interfaces:**
- Consumes: `collect_governance()` output (Task 1); `invoke(actionId, params, confirmToken)` (susie.js line 657) for `record_review_state`, `record_conformance`, `request_release`, `save_note`.
- Produces: `renderFreigaben(): void`; card schema: kind label, record title/id as secondary metadata, typed reviewer input, rationale input, confirm-token action buttons wired through `invoke()`.

- [ ] **Step 1: Write the shape-contract test** — feed `collect_governance()`'s documented output for a needs_review source + draft criterion through the same filtering the renderer does (extract a pure helper `pendingCards(payload) -> [{kind,id,label_key,detail,proposed_action}]` into `itsg/governance.py` so Python can test it): assert grouping and `proposed_action` values.
- [ ] **Step 2: Run** pytest → FAIL; implement `pendingCards`; pytest → PASS.
- [ ] **Step 3: Implement** `renderFreigaben()` — cards per pending item with plain-language act labels from `I18N` (no gate IDs), reviewer + rationale inputs (required before the confirm step, consistent with no-login), buttons only for actions on the existing whitelist; items whose action lands with T10-047/050 render read-only with the honest hint "Freigabe-Aktion folgt in Kürze" (never a dead button). Empty state: "Nichts offen — alle Entscheidungen sind getroffen."
- [ ] **Step 4: Verify:** suite PASS; `node --check` PASS; browser on live bridge with demo store: cards render, XSS probe string planted in a store `reason` renders as text, an existing-whitelist action (e.g. `save_note`) completes through the confirm flow and the card leaves `pending` after state refresh.
- [ ] **Step 5: Commit:** `feat(t10-049): Freigaben approvals queue (native)`

### Task 5: Verlauf view

**Files:**
- Modify: `frontend/susie.js` (new `renderVerlauf()`), `frontend/susie.css`
- Test: browser + the Task 1 cap test (500 events)

**Interfaces:**
- Consumes: `/api/governance` `events` + `gates`; `GATE_LABELS`-derived event labels.
- Produces: `renderVerlauf(): void`; filter segmented control by kind (Alle / Gates / KI-Läufe / Änderungen) mapping to `event.kind`.

- [ ] **Step 1: Implement** `renderVerlauf()` — newest-first timeline; each row: human label (e.g. "Quelle freigegeben durch <name>" from the gate record when present, else the event's kind/action via label map), exact timestamp, record id as secondary metadata; raw JSON visible only behind a "Details" toggle rendered as a `<code>` text block; initial render capped at 200 rows with "Weitere laden".
- [ ] **Step 2: Verify:** `node --check` PASS; browser at demo-store volume (304 findings, full event log): filter works, timeline scrolls smoothly, gate rows show reviewer names — never "G4" as the label.
- [ ] **Step 3: Commit:** `feat(t10-049): Verlauf timeline (native)`

### Task 6: Story-Suiten view (native port)

**Files:**
- Modify: `frontend/susie.js` (new `renderStories()` modeled on `pruefakte.js` `renderStories` 744-838 but store-driven only), `frontend/susie.css`
- Test: browser

**Interfaces:**
- Consumes: `/api/state` `stories` overlay (`{ok, cases: [...]}` — fail-soft already in `build_state`).
- Produces: `renderStories(): void` with persistent search input + sort select (no re-render focus loss — build controls once, rerender only the list node), story rows with expected-deviation badge, detail expansion.

- [ ] **Step 1: Implement** per the interfaces; no mock data in any branch; `stories.ok === false` → honest error card naming the cause.
- [ ] **Step 2: Verify:** `node --check` PASS; browser: all corpus stories render, search/sort behave like the old panel, focus stays in the search box while typing.
- [ ] **Step 3: Commit:** `feat(t10-049): Story-Suiten native view`

### Task 7: Copy pass

**Files:**
- Modify: `frontend/susie.js` (`I18N` + `renderReport` 926-1061, `renderSources` 1063-1140, `renderReg*` 1228-1456), `itsg/governance.py` (labels live here too)
- Test: `tests/test_copy_rules.py` + browser

**Interfaces:**
- Consumes: `GATE_LABELS` (Task 1).
- Produces: single `GATE_LABELS` source of truth (itsg/governance.py, mirrored into I18N by the endpoint payload — frontend never hardcodes gate strings); inline `LANG === "de" ? … : …` ternaries in the three render functions migrated to I18N keys.

- [ ] **Step 1: Write the failing test** — scan `frontend/susie.js` source text: assert no occurrence of the bare strings `"G0"`…`"G6"` inside label contexts (allowlist: comments and the audit secondary-metadata line) and no `LANG === "de" ?` ternary inside the render function line ranges.
- [ ] **Step 2: Run** → FAIL; migrate ternaries to I18N keys (`reportId`, `sealTitle`, `srcApproved`, `regOpen` etc. — name them as you migrate, both languages).
- [ ] **Step 3: Run** pytest PASS; `node --check` PASS; browser: toggle DE/EN with Prüfbericht, Quellen, Regelwerke, Freigaben open — every visible string switches instantly.
- [ ] **Step 4: Commit:** `refactor(t10-049): copy rules — gate labels mapped, i18n keys unified`

### Task 8: Cross-links

**Files:**
- Modify: `frontend/susie.js` (`renderReport` rows, `evidenceChain` 520-571, `renderSources`, `renderCases` finding rows, `clientExec`)
- Test: browser

**Interfaces:**
- Consumes: existing `clientExec.select_case/open_evidence`; regulations API (`GET /api/regulations/search`, `/chunk`).
- Produces: `clientExec.open_report_section({case_id})` (jumps to the report row and flashes it); `open_regulation({query})` (loads the regulations view with a pre-filled search for the source title or `expected_basis`); report rows and failed-case report links become buttons (keyboard reachable, focus style per 36px grid).

- [ ] **Step 1: Implement** the two executors + clickable rows per signatures; every link works in both directions (case↔report), source card gains "Im Regelwerk öffnen", finding `expected_basis` renders as a regulation-search chip.
- [ ] **Step 2: Verify:** `node --check` PASS; browser: click through failed case → report section → back → case; source → Regelwerke search results visible; keyboard-only pass (Tab reaches every new control, Enter activates).
- [ ] **Step 3: Commit:** `feat(t10-049): cross-view links`

### Task 9: Retirement + nav audit

**Files:**
- Delete: `frontend/pruefakte.html`, `frontend/pruefakte.js`, `frontend/pruefakte.css`
- Modify: `frontend/susie.html` (remove `#view-advanced`/`#advanced-frame`), `frontend/susie.js` (remove adv wiring 1883-1897, `S.advView/advTitle`, `data-help` pruefakte entries), `frontend/theme-init.js` (drop embed branch), `frontend/checks/nav-audit.mjs` (new)
- Test: `frontend/checks/nav-audit.mjs` + full suite

**Interfaces:**
- Produces: `nav-audit.mjs` — static scan over `frontend/*.html/js/css`: asserts zero references to `pruefakte`, `advanced-frame`, `data-adv`, `side-adv`, and that every `data-view` value has a matching `#view-<id>` section and I18N title key; exits non-zero otherwise.

- [ ] **Step 1: Write** `nav-audit.mjs`, run it against the pre-deletion tree → it FAILS (pruefakte references exist).
- [ ] **Step 2: Delete** the three pruefakte files and all wiring listed above; scrub help-center topics and `data-help` registry entries that reference the expert panels.
- [ ] **Step 3: Run** `node frontend/checks/nav-audit.mjs` → PASS; `node --check` PASS; full Python suite PASS.
- [ ] **Step 4: Browser:** walk every sidebar item + SÜSIE chat navigation commands ("Wo stehe ich?", "Zeig mir Fall …", back) on a live bridge — no dead link, no blank view, no console error.
- [ ] **Step 5: Log** the retirement in `.leapfrog/log.md` (owner-authorized 2026-10-27; preserved in history at 667d161) and commit: `feat(t10-049): retire Prüfakte — single-shell frontend`

### Task 10: Wave verification + evidence

- [ ] **Step 1:** full stdlib suite `python3 -m pytest tests/ -q` PASS; `node --check` PASS; `nav-audit` PASS.
- [ ] **Step 2:** scripted browser walkthrough of all views at demo volume (304 cases, full events, stories): empty states checked by booting against a stopped bridge (honest offline state, no fake data), DE/EN both.
- [ ] **Step 3:** append evidence entry to `.leapfrog/log.md` (T10-049 IN_REVIEW, files owned, verification evidence); update board row status.
- [ ] **Step 4:** commit any remaining evidence/docs: `chore(t10-049): wave evidence`
