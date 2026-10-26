# Team 10 Shared Work Board

Update this board before starting work and at each status transition. Keep one row per task; do not delete completed work. Append a progress/handoff event to `.leapfrog/log.md` when a row changes.

| Task ID | Outcome | Human owner | Agent owner | Reviewer | File scope | Dependencies | Acceptance | Status | Next update | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| T10-001 | Publish architecture, plan, agent role governance, and workflow SVG | Team 10 product facilitator | Codex / OpenAI | MSc integration lead | `architecture.md`, `plan.md`, `agent-governance.md`, `itsg-workflow.svg` | Official challenge deck and team notes | Docs describe bounded ITSG workflow, form conformance, agent controls, human gates | DONE | 2026-10-26 | Commit `45472d8` pushed to `origin/main`; follow-up coordination rules in progress |
| T10-002 | Establish shared agent progress and checkpoint controls | Team 10 product facilitator | Codex / OpenAI | MSc integration lead | `AGENTS.md`, `CLAUDE.md`, `DELIVERY.md`, `.leapfrog/**`, `agent-governance.md`, `plan.md` | T10-001 | Chat marker, ownership, update cadence, checkpoints, logs, and handoff rules are documented | IN_REVIEW | Before first other-agent task | Commit `0929e65` pushed to `origin/main`; `git diff --check` passed; docs-only change; application tests not run; reviewer acknowledgment pending |

