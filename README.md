# SÜSIE – AI review assistant for ITSG system review

Team project from **Futury Build Days #3 – AI Edition** (Frankfurt, 26–27 Oct 2026), ITSG challenge.
Forked from the team repository [gracelee087/futury_team_10](https://github.com/gracelee087/futury_team_10) – built by Team 10.

**The challenge:** under § 95b SGB IV, payroll software must pass ITSG's system review before it may send data to the social insurance institutions. SÜSIE supports that review for income replacement benefits (Entgeltersatzleistungen): rules from the official specifications become checks, the software's output is compared against them, AI helps with the documents, and humans approve at recorded gates.

> All data is synthetic. No legal, compliance or certification claim.

## My part: the security and trust layer (Fares Salhi)

| Component | Folder | What it does |
|---|---|---|
| Deterministic checker + input guard | `checker/` | Rule checks on the DTA EEL message flow (41 → 61 → 01 → 61 → 88 → 01 → 62); allowlist guard blocks unknown fields, invalid formats and broken input |
| Verified retrieval | `retrieval/` | Searches 1,219 rulebook sections; the AI must quote its sources and every quote is checked word for word – unproven answers become NEEDS_REVIEW |
| Receipt office (seal) | `seal/` | Fingerprint (SHA-256) + HMAC receipt + hash-chained ledger: an edited report shows TAMPERED, a hidden test run shows NEVER SUBMITTED |
| Datenschutz-Schleuse (privacy airlock) | `privacy/` | Pseudonymizes personal data (VSNR, names, IBAN, email, phone, birth dates, addresses) before any AI call; blocks if anything is left; also guards Langfuse tracing and the agents (`orchestrator/llm.py`) |

## Verified results (measured on this repository, 27 Oct 2026)

| Test | Result |
|---|---|
| Security test suites (`privacy`, `retrieval`, `seal`, `checker`) | 167 passed |
| Attack suite (10 software bugs + 4 malicious inputs) | 14/14 stopped, 0 false alarms |
| Privacy leak test | 224 planted personal values, 0 leaked |
| Independent privacy review sets | 34 of 34 values removed (19 + 15) |
| False positives on the rulebook | 0 of 1,219 chunks (public specimen values allowed) |
| Seal demo | GENUINE → TAMPERED → NEVER SUBMITTED |

## Run it

    pip install -r requirements.txt
    python -m pytest privacy retrieval seal checker -q
    python checker/attacks.py
    python privacy/leak_test.py
    python seal/demo.py

SÜSIE web app (AI key only via environment, never in files):

    $env:SUSIE_LLM_TOKEN = "<your hessian.AI key>"
    python -m itsg.webserver --port 8766

Then open http://127.0.0.1:8766

## Honest limits

- The seal proves a report was not changed after submission – not that the software output was correct; ITSG spot checks stay necessary.
- Regex-based privacy detection does not find names in free text without a cue word (e.g. "Herr", "Name:").
- Pseudonymized data is still personal data under GDPR. This is engineering, not legal advice.
- Prototype on synthetic data only.