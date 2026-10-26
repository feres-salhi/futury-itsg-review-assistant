# Team 10 Hot Cache | Updated: 2026-10-26

## What this project is

Futury Team 10 is preparing an ITSG AI review-assistant prototype for payroll software in the *Entgeltersatzleistungen* scope. The prototype is a traceable testing workflow, not a legal decision-maker or benefits calculator.

## What just happened

- Architecture, 24-hour plan, agent governance, and workflow SVG were pushed to `origin/main` in commit `45472d8`.
- The user asked for a shared coordination process because teammates may not communicate reliably.
- Added a chat marker rule, but it is only an instruction-following signal, not a truth/hallucination detector.
- The requested `agile-delivery` skill was not found in available skill or memory files; `DELIVERY.md` transparently defines a project-local cadence.

## What changed

- New root instructions: `AGENTS.md`, `CLAUDE.md`, `DELIVERY.md`.
- New `.leapfrog/` Layer 1 state, live board, event log, tracks, and hot cache.
- Updated `agent-governance.md` with response marker handling.
- Updated `plan.md` with async delivery and checkpoint cadence.

## Verification snapshot

- Before this change, local clone was clean and synchronized with `origin/main`.
- Coordination controls pushed to `origin/main` in commit `0929e65`; `git diff --check` passed. No application tests were run because this was documentation-only.

## Already tried / avoid repeating

- Searched installed skills and `/Users/amour/.codex/memories` for `agile-delivery`; no matching skill file or memory reference was found. Do not claim that skill was applied. Replace/extend the local protocol if the user supplies the skill.

## Active focus

Task T10-002 is published and waiting for independent reviewer acknowledgment. Before other agents begin, name the qualified domain reviewer and create task rows with non-overlapping ownership.

## Open questions

- Human integration lead and domain/legal reviewer identities are not yet named.
- The product code and tests have not started; current acceptance evidence is documentation/repo state only.

