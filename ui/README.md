# Task 4 — Test-Case Workflow & Report UI (skeleton)

Your part of the Team 10 hackathon plan: the screens the judges see.
All data is **fabricated**. No legal compliance claim.

## Run it

Double-click `index.html` — it opens in your browser. That's it.
(No server, no install. Everything is plain HTML/CSS/JavaScript.)

## What each file does

| File | What it is | You will edit it to… |
|---|---|---|
| `index.html` | The page shell: two tabs (Test Cases / Report) and empty containers | Add new tabs or sections |
| `js/data.js` | Sample records in the team's data contract (`test_case`, `execution`, `finding`, `report`, …) | Replace with teammates' real records; add fields |
| `js/app.js` | All the logic: renders the list, the detail view, the comparison table, the report | Add features: review buttons, filters, evidence links |
| `css/styles.css` | Looks: tables, status badges (green/red/gray) | Make it presentation-ready |

## What the skeleton already shows

- **Test-case list** with a result summary (1 × PASS, 1 × MISMATCH, 1 × NOT EVALUATED)
  and three cases: normal (`PASS`), edge (`MISMATCH`),
  invalid (`NOT EVALUATED` — no execution output exists, so it can never look like a pass).
- **Detail view** with inputs, expected-vs-observed side by side (the mismatch
  row is highlighted red), finding status and a **clickable evidence chain**:
  `RPT-1 → RUN-2 → TC-2 → CRIT-1 → REQ-1 → SRC-1` (requirement and source are buttons).
- **Report tab** with template version, conformance checks (one deliberately failing,
  with a sign-off block), findings, the **human review event table**, and the
  synthetic-template disclaimer.
- **Sources & Requirements tab** showing the source record (issuer, version, citation),
  the requirement as a `needs_review` candidate, and the human-approved criteria;
  cross-links jump between the cards with a highlight animation.

## Your next steps (build these yourself, in order)

1. Open `js/data.js`, read it next to the "Minimal data contract" section of
   `plan (1).md` — see how the records map.
2. In `js/app.js`, find `renderTestCaseList()`: add a column showing the test case's
   `expected_basis`.
3. Add a click on an evidence link that jumps to the source/requirement
   (`DATA.sources`, `DATA.requirements` are already there, just not rendered yet).
4. Add a "review" panel on the report tab that shows reviewer name + decision +
   timestamp (a `review` record exists per test case).
5. Ask Member 1 for the real record formats, then swap `js/data.js`.

## Demo-script mapping (why this UI wins points)

- Plan step 5 "Run the comparison" → the expected-vs-observed table.
- Plan step 6 "Open the report… follow a finding back" → the Report tab + evidence chain line.
- Acceptance criterion "missing evidence never produces a pass" → TC-3 shows `NOT EVALUATED`.
- Acceptance criterion "synthetic template is conspicuously labeled" → the Report tab banner.
