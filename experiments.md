# Experiments — AI helpers on the 300 harness cases

Setup for all experiments: `python orchestrator/harness_agents.py` on `data/testcases.json` (300 synthetic cases).
Code verdict first; the Double-check AI (findings_critic, Haiku 5.5) and the Explainer AI run on a sample:
every case the code flags + 10% of the clean ones (seed 7). The Double-check AI can only send a check to a
person (NEEDS_REVIEW); it can never turn a check into PASS. Score = same as the harness (`run_harness.score`).

## Experiment 1 — prompt agents-v1 (2026-10-26)
- Run: `AGENTS-HARNESS-20261026-223252`, report `reports/AGENTS-HARNESS-20261026-223252.json`
- Double-check prompt: "If a check's status looks doubtful, name it." (no evidence required)
- Double-check runs: 188, explanations: 175

| | Result |
|---|---|
| Code only | 300 / 300 |
| After Double-check AI | 183 / 300 |
| Cases where the AI sent checks to a person | 147 |
| Found error → "only person review" | 108 |
| Clean case → unnecessary person review | 9 |
| Missed errors (error turned into PASS) | 0 |

- Checks sent to a person most often: C12 (30-day sum) 101, F1 32, C11 30, F3 26, C9 23, F2 22, F7 20.
- Langfuse export partly failed during the run (timeouts / DNS errors to cloud.langfuse.com); the Langfuse record
  of this run may be incomplete. The local report is complete.
- Reading: the Double-check AI is too cautious. People get more work (opposite of H3). No error was missed.

## Experiment 2 — prompt agents-v2 (evidence required)
- Change: the Double-check AI may flag a check only with concrete evidence (field, value it saw, value it expects);
  code drops any flag without evidence. Everything else unchanged (same cases, same sample seed).
- Result: (pending)
