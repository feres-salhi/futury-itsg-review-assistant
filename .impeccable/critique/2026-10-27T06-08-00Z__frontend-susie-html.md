---
target: SÜSIE assistant demo surface
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:/Users/amour/Downloads/FUTURY-Team 10/frontend/susie.html"
target_fingerprint: "sha256:2d7f44511a636440ab09b0e923f0bfa2f97b0402f62dafad8c1378b76f9058b6"
target_path: /Users/amour/Downloads/FUTURY-Team 10/frontend/susie.html
timestamp: 2026-10-27T06-08-00Z
slug: frontend-susie-html
---
# Critique — SÜSIE assistant (frontend/susie.html), 2026-10-27

Method: dual-agent (A: design review agent · B: detector/browser agent). Assessments ran isolated; synthesized below.

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Live-run card has step labels but lacked duration/elapsed (fixed this run); raw "server" token in result line (fixed) |
| 2 | Match System / Real World | 3 | Confirm card used internal title "Vergleich neu ausführen · live: live" (fixed); Protokoll/Prüfbericht drift (partly fixed) |
| 3 | User Control and Freedom | 2 | Live run unabortable (bounded 60 s/role instead); "Nein" copy promised a manual walkthrough that never came (fixed) |
| 4 | Consistency and Standards | 3 | Native window.confirm() for PDF export; terminology drift |
| 5 | Error Prevention | 4 | Confirm cards, four-eyes result lines, fail-closed semantics explained |
| 6 | Recognition Rather Than Recall | 3 | All tooltip knowledge is title-attr only — hover-only, unreachable for keyboard/AT |
| 7 | Flexibility and Efficiency | 2 | No URL state, no shortcuts, case filter chat-only |
| 8 | Aesthetic and Minimalist Design | 4 | Restrained crimson system; repeated criterion paragraph across cards |
| 9 | Error Recognition and Recovery | 3 | Honest degraded/timeout copy; errors are dead-end red lines |
| 10 | Help and Documentation | 3 | Excellent inline explainers; "Prüfakte · Experten" unexplained; gate count not click-through |
| **Total** | | **30/40** | Good — address weak areas |

## Design Specificity Verdict

Authored for this product (8.5/10). Belegkette with real store IDs, German legal register with Notencode tooltips, trust strip with verifiable numbers (300/300, 0 Fehlalarme), governance-framed demo buttons, § 95b SGB IV citation in the template warning. Generic zone: the chat surface itself (2025 assistant pattern) and engineering mode names.

Deterministic scan (B): 14 findings, all warnings — 8× undersized-ui-text (10–10.5px nav sublabels, genuine; bumped to 11px this run), 1× tiny-text (same rules), 1× pulsing-dot (transient thinking indicator — acceptable intent), 2× cramped-padding on .paper (false positive, padding verified 24/16/12px), 3× side-tab (2 genuine accent rails: .chain-detail, .offline-banner; .side-adv borderline). Browser: no app console errors; live in-page scan found 8 anti-patterns on Prüfbericht (em-dash overuse ×9, undersized text ×4, stragglers).

## What's Working

1. Belegkette (RPT→RUN→TC→CRIT→REQ→SRC): real records, clickable plain-German detail, navigable — the traceability claim made visual in 3 seconds.
2. Trust strip + permanent disclaimers: pre-answers the legal experts' first questions with verifiable numbers.
3. Deterministic-vs-AI made visual: button subtitles encode the governance principle; collapsed MISMATCH cards show the decisive row without a click.

## Priority Issues

- [P0] Confirm-card vocabulary mismatch on demo path 1 — FIXED this run: card now reads "Testfälle aus dem Gesetz erstellen — Prüflauf der KI-Rollen · mode: mit KI-Rollen (live)"; offline variant reads "Abgleich mit der Softwareausgabe — deterministischer Feldvergleich".
- [P1] Live run reassurance — PARTIALLY FIXED: duration sentence in the proposal ("etwa 2–4 Minuten — ich zeige Ihnen jeden Schritt"), elapsed timer with total expectation in the progress card, 60 s/role server-side bound. Still open: no cancel; progress card invisible when chat is closed.
- [P1] All governance knowledge hover-only (title attributes) — OPEN. Fix: focusable tooltip carriers or inline first sentences for the trust pills/Notencodes.
- [P2] Broken "Nein" micro-promise + raw "server" token — FIXED (copy now "nichts wurde ausgeführt"; mode → "im Store neu gerechnet").
- [P2] Invisible case filter (empty-state references it) — FIXED copy-wise (hint now points to the chat command); a visible search field remains open.
- [P3] Terminology drift + native confirm() — PARTIALLY FIXED (exportConfirm wording); window.confirm replacement open.
- [P3] "Prüfakte · Experten" group eager and unexplained — OPEN (collapse behind a toggle + subtitle).

## Persona Red Flags

- Jordan (ITSG legal expert, non-technical): name gate on fresh localStorage — pre-seed the reviewer before the audience; native confirm() reads as an error; Notencode/Story-Suiten jargon unexplained on first paint.
- Sam (keyboard/screen reader): chat log now aria-live (fixed this run); still open — cards are role=button containing buttons (nested interactive), card accessible name is its whole content, no focus management on view/overlay switch, tooltips unreachable.
- Alex (power user): no URL state, no shortcuts, filter chat-only, audit log only in the legacy iframe.

## Questions to Consider

1. If the live run sits on "Schritt 1/4" for 90 s in front of the room, does SÜSIE's credibility survive the silence? (Elapsed timer + expectation sentence now mitigate this.)
2. The trust strip's boldest claim — the gate count — is the only number the audience cannot click. Should it link to the audit trail?
