# Finding — 2026-10-26: No German statute prescribes a template for the system-review report

**Task:** T10-035 (human chat directive "u're cleared to do this 1-3").
**Claim (verified, not legally approved):** German law mandates *that* a Systemprüfung
happens, but prescribes **no** template, form, or format for the report it produces. The
client pitch deck does not claim otherwise. The prototype's honest
`"template": "SYNTHETIC – no official ITSG report form found; no compliance claim"` posture
is therefore evidence-backed, not a placeholder pending discovery of a legal form.

> Boundary (agent-governance §1): this is a sourced verification by a coding agent, **not**
> a legal determination. Final legal interpretation belongs to the human domain gate; the
> records below enter retrieval only after human G0 acceptance (status `candidate`).

## Evidence lines

1. **The statute — SRCV-2-A** (`data/sources/SRC-2/SRCV-2-A/`, official text from
   [gesetze-im-internet.de](https://www.gesetze-im-internet.de/sgb_4/__95b.html), retrieved
   2026-10-26): § 95b SGB IV has exactly five Absätze. It mandates that Meldungen/Beitragsnachweise
   come from system-tested programs (Abs. 1), defines the Systemprüfung's scope — advice plus
   professional/technical examination of the application software (Abs. 2), excludes hardware/OS
   (Abs. 3), names who carries it out (GKV-Spitzenverband with participation of
   Renten-/Unfallversicherung and BA, Abs. 4), and extends it to Einzugsstellen programs
   (Abs. 5). **No sentence prescribes a Prüfbericht/Testbericht/Zertifikat format.** The only
   formatting duty is that the software be identifiable as a closed application in a clearly
   identifiable version (Abs. 2 sentence 4). Procedure detail (Pflichtenheft, Prüfmitteilung,
   SP-Richtlinien) lives in GKV-Spitzenverband/ITSG administrative rules — quasi-binding for the
   review process, but not federal law.
2. **The pitch deck — SRCV-1-A** (`data/sources/SRC-1/SRCV-1-A/`, client-provided, 13 pages,
   dated 23.10.2026): p. 8 quotes § 95b SGB IV only as the legal mandate; p. 10 says the assistant
   "generates a test report for the ITSG system review"; p. 11 asks it to "deliver comprehensible
   test reports" and "create a traceable test record". **The deck nowhere claims a legally
   mandated report template.** If a specific format was described verbally in the session, it is
   not in the deck text.
3. **The corpus:** the client-provided `ITSG Files/` (DTA-EEL Beispielpapier V13.3,
   Verfahrensbeschreibung V13.4, Gemeinsame Rundschreiben Anl1–3, GG_EEL V13.1) contains **no
   official report form**. The rigidly structured artifacts in this domain are the DTA-EEL
   *data-exchange* record layouts (technical specification, not law) — a data format is not a
   report template. All generated reports already carry the honest synthetic-template label
   (e.g. `reports/RPT-20261026-222848.json`: `"template": "SYNTHETIC – no official ITSG report
   form found; no compliance claim"`).

## Consequences for the prototype

- Keep rendering on the labeled synthetic template with `compliance_claim=False`; do **not**
  build against a "legal report template" — none exists in statute or in the provided corpus.
- Gate G6 (report-template gate, agent-governance §5.6) stays blocked-by-default: without an
  approved official template record, conformance checks remain `blocked`/honest — exactly the
  current behavior.
- Governance note (§1.2) that "prescribed report forms/templates … must be linked to approved
  official source records" remains satisfiable: to date, zero such records exist, and that is
  the *correct* state, not a gap in the registry.
- If the client did describe a specific report structure verbally, the follow-up is a **human**
  request to ITSG (contacts on deck p. 13, e.g. Gerald Friedrich, System Examiner) for the
  concrete SP-Richtlinien/Pflichtenheft reference; it would then be registered as a
  `form_template`/`itsg_spec` source record and pass G0 + the template gate like any other.

## Research sources (web, 2026-10-26)

- § 95b SGB IV official text: https://www.gesetze-im-internet.de/sgb_4/__95b.html
  (also dejure.org/gesetze/SGB_IV/95b.html, juraforum.de/gesetze/sgb-4/95b-systempruefung)
- ITSG Systemuntersuchung (Pflichtenheft + test tasks description): https://www.itsg.de/produkte/systemuntersuchung
- GG §22 DEÜV (Systemuntersuchung / ITSG-Prüfmitteilung / Mod-ID, PDF):
  https://www.informationsportal.de/wp-content/uploads/document__3953__GG-%C2%A722-DE%C3%9CV-Systemuntersuchung..pdf
- Haufe/Jansen commentary on § 95b SGB IV:
  https://www.haufe.de/id/kommentar/jansen-sgb-iv-95b-systempruefung-HI14243185.html

## Verification recorded (T10-035, 2026-10-26)

- Both manifests load via `pipeline.registry.manifest.Manifest.from_json` (schema boundary,
  unknown fields would raise); `status == "candidate"`; checksums match the stored originals
  **and** the byte-identical corpus twin of the pitch PDF (dedupe case for the future importer).
- All 5 statute Absätze in the derived text are verbatim-faithful to the stripped original HTML;
  key pitch claim sentences verified present in the PDF text layer.
- `git diff --check` PASS. Docs/data-only change — no application code touched; unittest suite
  not affected (not run for this task, nothing it covers changed).
