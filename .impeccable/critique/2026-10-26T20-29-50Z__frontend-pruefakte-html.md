---
target: frontend/pruefakte.html
total_score: 29
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/amour/Downloads/FUTURY-Team 10/frontend/pruefakte.html"
target_fingerprint: "sha256:c31dfafb637b2db736bf009557c55d7f05eeb20117418a84191fdf48df4c74be"
target_path: /Users/amour/Downloads/FUTURY-Team 10/frontend/pruefakte.html
timestamp: 2026-10-26T20-29-50Z
slug: frontend-pruefakte-html
---
# SÜSIE Prüfakte — Combined Audit + Critique Snapshot (2026-10-26)

Method: dual-agent (A: design review · B: detector + browser overlay)

## Audit Health Score (technical)

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 3 | Desktop case selection moves focus without scrolling (WCAG 2.4.7 concern at 200% zoom); contrast verified 5.6–11.9:1 |
| 2 | Performance | 3 | 480KB 2115×743 logo PNG rendered at 190px, no srcset/sizing; otherwise lean static site |
| 3 | Theming | 4 | Full four-variant token system; no hard-coded colors outside print reset |
| 4 | Responsive Design | 4 | 320–2560px verified, 44px targets, mobile card table, safe-area handling |
| 5 | Implementation Integrity | 4 | Detector: 3 findings = 2 verified false positives + 1 declared intentional |
| **Total** | | **18/20** | **Excellent (minor polish)** |

## Design Health Score (Nielsen heuristics)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Draft autosave silent; desktop case selection updates detail below the fold with no cue |
| 2 | Match System / Real World | 4 | Soll/Ist, § citations, "Fachprüfung offen", "Build unbekannt" — excellent domain language |
| 3 | User Control and Freedom | 2 | Saved notes cannot be edited or deleted; no undo anywhere |
| 4 | Consistency and Standards | 3 | Whole row mouse-clickable, only .case-link keyboard-reachable |
| 5 | Error Prevention | 3 | maxlength, inline role=alert errors, disabled release with explanation |
| 6 | Recognition Rather Than Recall | 3 | No "Entwurf vorhanden" marker forces recall of which case holds a draft |
| 7 | Flexibility and Efficiency | 3 | Deep links/sort/search good; Ctrl+Enter undiscoverable; no case stepping |
| 8 | Aesthetic and Minimalist Design | 3 | Dead .scroll-hint element and decorative trace-path are the leaks |
| 9 | Error Recovery | 3 | Inline errors with focus management, empty-filter reset, export-failure reassurance |
| 10 | Help and Documentation | 2 | No glossary for DTA EEL/BRUTTO-1; "Klärungspunkte" unexplained for new reviewers |
| **Total** | | **29/40** | **Good (upper band; craftsmanlike, short of excellent)** |

## Design Specificity Verdict

The evidence core is genuinely authored for this domain: the Soll/Ist paired-value composition with per-value citations, German comparison vocabulary, and honesty baked into every state (compliance_claim:false in the export, disabled release with aria-describedby explanation). The chrome is category-standard admin dashboard: 240px rail + 4-item nav + paper cards + search/filter/sortable table would survive unchanged under a logistics or CRM product. The trace-path strip looks like product character but is a static, non-interactive, identical-for-all-cases diagram — a missed opportunity that pretends to be the signature element. Net: specific where it counts (the evidence pair), interchangeable everywhere around it.

## Deterministic Scan (Assessment B)

3 findings on pruefakte.html, 0 on index.html: 2× cramped-padding (verified false positives — static view skewed by the print `border:0;padding:0` reset; screen CSS has 24px inset; live overlay showed no padding warning), 1× overused-font Arial (real by detector, declared intentional in DESIGN.md as operational stability, no font distribution). Browser overlay injection succeeded; console reported only overused-font.

## Overall Impression

A craftsmanlike Operate surface whose soul is the Soll/Ist evidence pair and whose honesty is systemic. The biggest opportunity: the review flow's seams — selection that doesn't move the viewport, notes that vanish at the report finish line, and a trace-path that gestures at the product's core loop without being it.

## What's Working

1. Soll/Ist evidence pair with citations at each value's feet incl. run ID and "Build unbekannt" — composition in service of the audit.
2. Honest-state design as a system: disabled release tied to #release-blocker, unapproved-Sollgrundlage badge on the source itself, noscript/storage-denial copy.
3. High Contrast as a real rendering mode (radius/weight/line-height/borders/outlines), verified 5.6–11.9:1 minima.

## Priority Issues

1. [P1] Desktop case selection doesn't move the viewport — selectCase() focuses with preventScroll and only scrollIntoView below 700px; at 1440px the updated detail stays below the fold; sighted keyboard users at 200% zoom get invisible focus movement. Fix: scroll .detail into view when out of viewport; drop preventScroll for keyboard activation. Suggested: $impeccable polish (or layout).
2. [P1] Notes are invisible in the report view — the review journey ends at a report that lists findings but not one word of the reviewer's own notes. Peak-end violation. Fix: render saved notes + draft indicators in the report paper. Suggested: $impeccable polish.
3. [P2] No note lifecycle — saved notes cannot be edited/deleted; an unremovable mistaken note in an audit tool is a credibility problem. Fix: per-note delete with confirm; "Entwurf" marker on case rows. Suggested: $impeccable harden.
4. [P2] Mismatch priority under-designed — "2 Klärungspunkte" is dead text; default order doesn't route the one thing requiring judgment. Fix: make it a filter shortcut; consider open-findings-first ordering. Suggested: $impeccable clarify.
5. [P2] Trace-path is a false affordance — static, identical for all cases, non-clickable. Fix: make stages reflect actual state or cut it. Suggested: $impeccable polish.

## Persona Red Flags

- Alex (power user): row click feels broken on desktop (P1#1); Ctrl+Enter undiscoverable; no next/previous case stepping.
- Sam (a11y): Enter on case-link moves focus without scrolling at >700px; table-wrap tabindex=0 region is a keyboard stop with nothing to scroll at desktop width. Otherwise strong: skip link, focus outlines, aria-sort, role=status.
- Riley (stress): storage denial degrades correctly; junk notes are permanent; sorting Soll with "Erforderlich" falls back to odd localeCompare order; middle-click on href="#" data-source opens blank tab.
- Dr. Weber (derived, German legal/ITSG reviewer): citation chain dead-ends at a view admitting the original must be checked elsewhere; reason line gives "Differenz: −0,36 €" with no tolerance/rounding/materiality context — the reviewer's first question is unanswerable in-tool. Values "Build unbekannt" traceability.

## Minor Observations

- Dead .scroll-hint element (permanently display:none).
- Inline style="margin:0" on detail h2.
- <time>Demo</time> misuses the time element.
- button{overflow-wrap:anywhere} can break German compounds mid-word.
- 480KB logo PNG for 190px display (no sizing variants).
- No favicon/meta description (prototype-acceptable).

## Questions to Consider

1. If the Soll/Ist pair is the product's soul, why does the mismatch case open below a generic filterable table instead of the tool leading with "1 Abweichung — hier prüfen"?
2. Is the fivefold "keine fachliche Freigabe" legal honesty — or the interface confessing it won't do the clerical part (note trails, tolerance context) that would earn trust?
3. Would this design survive 300 Prüffälle — search/filter/sort imply scale; nothing else (pagination, saved views) does?
