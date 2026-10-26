# ITSG Hackathon — 24-Hour Team Plan

## Goal

Build a small, credible demonstrator of the ITSG review loop: take one technical requirement, turn it into reviewed test cases, compare a fabricated payroll-software output, and produce a traceable report. The presentation's focus is reviewing payroll software for *Entgeltersatzleistungen*. The prototype demonstrates **how evidence is organized and checked**; it does not certify software or calculate a real person's benefit.

## What the team will show

One end-to-end path:

`technical source excerpt → cited requirement → human-approved criterion → synthetic test case → fabricated execution output → deterministic comparison → evidence-backed report`

The core slice must work before any optional AI features. Use the provided presentation as challenge context, not as a source of benefit formulas. If the team does not have a current authoritative specification and approved expected result, demonstrate the workflow with a clearly labeled synthetic technical fixture. No real payroll or personal data.

## Team roles

| Person | Primary ownership | Concrete deliverables |
|---|---|---|
| MSc 1 — SWE/data science | Workflow, data model, source provenance, orchestration | Source/requirement/test/execution records; stable IDs and citations; workflow state and event log; integration lead |
| MSc 2 — SWE/data science | Deterministic comparator and quality | Input/output schema; comparator; reproducible finding format; test design and independent review of the comparator |
| Bachelor 1 — IT/SWE specialization | Source intake and evidence display | Upload/import one text or JSON fixture; page/section locators; requirement and source view |
| Bachelor 2 — IT/SWE specialization | Test-case workflow and user interface | Test-case list/detail; expected-vs-actual display; clear statuses and report screen |
| Bachelor 3 — IT/SWE specialization | Vendor output and report integration | Synthetic CSV/JSON output importer; validation/errors; evidence-backed summary/report |
| You — product/domain facilitator and presenter | Scope, source checks, human gates, acceptance, demo narrative | Choose the bounded example with the team; keep claims honest; review citations and labels; track decisions/blockers; rehearse and present |

The three Bachelor roles can shift based on their strengths. Keep one owner per deliverable and agree on shared record formats early. You do not need to write the legal rules or the core engine to contribute: protect the scope, make sure evidence is visible, and stop the demo from claiming more than it proves.

## Schedule and decision gates

These are elapsed-time blocks, not a requirement for everyone to work continuously. Take breaks and use short handoffs; a tired final integration is a bigger risk than one fewer stretch feature.

| Time | Milestone | Exit check / decision |
|---|---|---|
| 0:00–0:45 | Align on demo story, inspect available source material, choose one example | Write one sentence describing the demo. Confirm whether there is a current specification and a reviewed expected result. If not, choose a synthetic fixture and label it clearly. |
| 0:45–2:00 | Define record formats and screen/report sketch | Agree on IDs, required citation fields, execution-output schema, comparison status, and `BLOCKED / NEEDS_REVIEW` behavior. A sample record exists before parallel coding. |
| 2:00–5:00 | Build source/requirement intake and comparator foundation | Source can be recorded with version/citation metadata; comparator can read a small fixture and return a structured result. |
| 5:00–8:00 | Build test case, execution-output, and evidence views | User can see the requirement, expected result, fabricated observed output, and where each came from. |
| 8:00–11:00 | Connect the vertical slice | At least one case runs from source record through report with no manually edited hidden state. Fix integration/schema issues before adding AI. |
| 11:00–14:00 | Add review events, edge cases, and failure paths | Missing citation/expected value becomes blocked; malformed output is reported; mismatch is visible; audit history is retained. |
| 14:00–17:00 | Add optional AI assistance only if core path is stable | AI may draft requirement candidates or extra test ideas with citations and a visible “needs human review” status. No AI-generated formula or auto-approval. |
| 17:00–20:00 | Freeze features, rehearse, improve report clarity | Run demo from a clean start. Prepare backup screenshots/fixtures and a short explanation of limitations. |
| 20:00–24:00 | Demo window / buffer / final polish | Present the working vertical slice, show one mismatch and its evidence chain, then explain what would need expert validation for real use. |

## Acceptance criteria

The MVP is ready to demonstrate when all of these are true:

- One source document or excerpt is stored with issuer/origin, version/date, checksum or stable file ID, and a page/section citation.
- A requirement is shown as a candidate until a human approves it; its source passage is one click or one visible panel away.
- At least three synthetic test cases cover a normal case, a boundary/edge case, and an invalid or missing-input case. Expected results are manually reviewed and tied to the fixture/criterion.
- Vendor documentation and observed execution output are represented separately. A manual or claim cannot masquerade as a test run.
- A deterministic comparator returns `PASS`, `MISMATCH`, or `NOT EVALUATED` with the reason and linked evidence. Missing source, expected value, or execution output never produces a pass.
- The report identifies the source version, criterion, test ID, software/build label if known, observed result, reviewer state, and unresolved limitations.
- A human review event and a second independent check are visible for the high-impact criterion or comparator logic.
- The demo contains only fabricated data and makes no zero-error, legal-compliance, or real-benefit calculation claim.

## Minimal data contract

Use JSON or database records with these fields; do not over-design the schema during the first two hours.

```json
{
  "source": {"id": "SRC-1", "title": "Demo fixture", "issuer": "...", "version": "...", "valid_from": null, "checksum": "..."},
  "requirement": {"id": "REQ-1", "text": "...", "source_id": "SRC-1", "citation": "page/section", "status": "needs_review"},
  "test_case": {"id": "TC-1", "criterion_id": "CRIT-1", "inputs": {}, "expected": {}, "expected_basis": "...", "review_status": "approved"},
  "execution": {"id": "RUN-1", "vendor": "Demo only", "software_version": "unknown", "test_case_id": "TC-1", "observed": {}, "evidence_ref": "..."},
  "finding": {"status": "NOT EVALUATED", "reason": "...", "links": ["SRC-1", "REQ-1", "TC-1", "RUN-1"]},
  "review": {"reviewer": "...", "decision": "...", "timestamp": "..."}
}
```

`valid_from` may remain null when the source does not establish it. Do not fill unknown metadata with guesses.

## Test and review checklist

Keep this as a short manual checklist or automated checks if time permits:

1. **Traceability:** every reported result links to a test, criterion, requirement, source version, and exact locator.
2. **Missing evidence:** remove the expected value or source link; verify the result becomes `NOT EVALUATED` or blocked.
3. **Mismatch:** change one observed output; verify the report highlights the exact field and both values.
4. **Boundary and invalid input:** verify the case is labeled and the comparator handles it without crashing or inventing an expected legal result.
5. **Version change:** update the source version; verify the old run remains reproducible and the new version does not silently overwrite it.
6. **Review separation:** verify a generated candidate is not approved until a person records a decision; reviewer/author are visible.
7. **Input separation:** verify vendor documentation and execution output have different types and are displayed distinctly.
8. **Privacy:** inspect all demo data and logs; confirm there are no real employee identifiers or payroll records.

## Scope cuts and stretch goals

Cut in this order if time slips:

1. Remove vector search and graph database; retain stable IDs and explicit links in a small relational store or JSON.
2. Remove automatic PDF parsing; manually enter one excerpt and retain its page citation.
3. Remove AI extraction and translation; use human-entered candidates.
4. Reduce the number of cases, but keep one pass, one mismatch, and one blocked/not-evaluated example.

Only after the vertical slice works, consider:

- AI requirement suggestions that quote the source and always require approval.
- AI-generated extra edge cases with a separate reviewer check.
- A graph visualization of the citation-to-result chain.
- A working translation with independent bilingual review.

Do not stretch into a benefit calculator unless the team has a verified current source, an explicitly scoped formula, qualified review, and time for independent mathematical validation. Otherwise the calculator is an unsafe distraction from the challenge's review workflow.

## Risks and responses

| Risk | Response |
|---|---|
| No authoritative current technical specification or formula is available during the event | Use a conspicuously synthetic technical fixture. Demonstrate provenance and comparisons; state that no legal result is being validated. |
| Unclear source version or effective date | Mark the requirement blocked and show the review handoff. Never guess which version applies. |
| AI fabricates a citation or expected value | Require locator validation against the stored source; keep AI output as a candidate; compare only against a human-reviewed expected value. |
| Team builds infrastructure before it has a working user path | Start with JSON/SQLite, one page, and one deterministic comparator. Add graph/vector services only after the path works. |
| Vendor manual gets confused with actual software behavior | Keep document and execution schemas separate; report only observed outputs as execution evidence. |
| Parser or integration work overruns | Allow manual entry of a small excerpt and a fixed CSV/JSON fixture; preserve the same evidence chain. |
| Sensitive data enters a demo or external model | Use fabricated data only; do not upload payroll data; remove any accidental sensitive content from demo fixtures and logs. |
| The team is exhausted before presenting | Freeze features by hour 17, rotate breaks, rehearse from a clean start, and keep a backup recording/screenshots. |

## Demo script (about 3 minutes)

1. **Frame the problem:** ITSG reviews payroll software for *Entgeltersatzleistungen*. The prototype supports review; it does not replace the legal expert.
2. **Show the source:** open one excerpt and its version/citation metadata.
3. **Show the requirement:** point to the exact passage and its human-review status.
4. **Show test cases:** explain one normal and one edge case, with expected values from the clearly identified demo fixture.
5. **Run the comparison:** import fabricated output and show a pass plus a deliberate mismatch or missing-evidence result.
6. **Open the report:** follow the chain from finding back to execution, case, criterion, requirement, and source; show review history.
7. **State the boundary:** actual legal rules, effective-date applicability, translations, and calculations require authoritative current material and qualified review before real use.

## Finish-line message

“This prototype demonstrates a traceable way to turn reviewed technical requirements into test cases and compare payroll-software output. It uses fabricated data. It does not establish that a real payroll result is legally correct; that requires current authoritative sources, expert approval, and much broader validation.”

