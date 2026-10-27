/* SÜSIE wizard surfaces — chat controller, action bus, streaming reveal.
   Governance: this file renders; it never approves. Decisions go through
   POST /api/action with the human's explicit click, and the audit trail
   names the human. All model output is rendered as literal text. */
"use strict";

// Build marker (T10-049): makes a stale cached tab self-identifying — the
// console banner always names the loaded build; the footer carries data-build.
const SUSIE_BUILD = "2026-10-27.r2";
console.info(`[SÜSIE] frontend build ${SUSIE_BUILD}`);

(() => {
  // ---------- tiny DOM helpers (literal text only — no innerHTML for data) ----------
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const svgBtn = (cls, path) => {
    const b = el("button", cls);
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 20 20"); s.setAttribute("aria-hidden", "true");
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", path); p.setAttribute("fill", "none");
    p.setAttribute("stroke", "currentColor"); p.setAttribute("stroke-width", "1.7");
    p.setAttribute("stroke-linecap", "round"); p.setAttribute("stroke-linejoin", "round");
    s.appendChild(p); b.appendChild(s);
    return b;
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const store = {
    get(k, d) { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* non-fatal */ } },
  };

  // ---------- i18n: chrome labels DE/EN; SÜSIE herself mirrors the user ----------
  const I18N = {
    de: {
      cases: "Prüffälle", report: "Prüfbericht", sources: "Quellen",
      casesSub: "Ergebnisse je Fall: offizielle Erwartung gegen übermittelte Werte — Abweichungen sofort sichtbar",
      reportSub: "Der vollständige Prüfbericht: Befunde, empfohlene Maßnahmen, PDF-Export und Manipulationssiegel",
      sourcesSub: "Worauf die Prüfung beruht: Rechtsgrundlagen, Vorlage — und wer welche KI-Ausgabe freigegeben hat",
      governance: "Governance",
      freigaben: "Freigaben", freigabenSub: "Offene menschliche Entscheidungen: Quellen, Entwürfe und Berichtsschritte, die auf Ihre Freigabe warten",
      verlauf: "Verlauf", verlaufSub: "Das Prüfungsprotokoll: wer was wann entschieden hat — Freigaben mit Name und Begründung, KI-Läufe, Änderungen",
      technik: "Unter der Haube", technikSub: "Die Architektur der Prüfung: KI entwirft, Code rechnet und prüft, der Mensch entscheidet — vom Gesetz bis zum signierten Bericht",
      techHeadline: "Vom Gesetz zum signierten Bericht",
      techIntro: "Drei Bühnen, drei Rollen: Die KI entwirft, deterministischer Code rechnet und prüft — und an jeder Nahtstelle entscheidet ein Mensch. Fahren Sie mit der Maus über eine Bühne, um ihren Ablauf zu verfolgen.",
      techLaneRules: "Regeln", techLaneTests: "Tests", techLaneVerdict: "Befund",
      techLegendAi: "KI entwirft", techLegendCode: "Code rechnet und prüft", techLegendPerson: "Der Mensch entscheidet",
      techBrokenNote: "Beschädigte Datei → STOPP, an eine Person übergeben",
      techDisputeNote: "Einspruch → zurück zu Tests oder Regeln, max. 2-mal",
      techLoopRewrite: "Abgelehnt oder Problem gefunden → neu schreiben, max. 2 Runden",
      govOffline: "Verbindung zum Bridge-Server fehlt — Governance-Daten sind nur mit Backend verfügbar.",
      freigabenNone: "Nichts offen — alle Entscheidungen sind getroffen.",
      govRationalePh: "Begründung (Pflicht) …",
      govDecideBtn: "Entscheiden",
      govActionPending: "Freigabe folgt in Kürze",
      govActionPendingTitle: "Diese Freigabe-Aktion wird in Kürze aktiviert — der Beschluss wird dann hier mit Name und Begründung protokolliert.",
      govConfirmPrefix: "Freigabe bestätigen:",
      evGate: "Gate-Entscheidung",
      evAgentRun: "KI-Lauf",
      evChange: "Änderung",
      verlaufFilter: "Verlauf filtern",
      verlaufAll: "Alles",
      verlaufEmpty: "Noch keine Ereignisse protokolliert.",
      verlaufMore: "Weitere laden",
      verlaufDecisions: "Entscheidungen & KI-Läufe",
      evChangesGrouped: "{n} Store-Änderungen",
      caseViewReport: "Im Bericht zeigen",
      caseReportPdf: "Einzelfallbericht (PDF)",
      caseReportPrint: "Drucken",
      reportRegen: "Bericht neu erzeugen",
      reportRegenBusy: "Erzeuge Bericht …",
      reportRegenDone: "Bericht erzeugt",
      openCaseAria: "im Prüfbericht öffnen",
      basisSearch: "im Regelwerk öffnen",
      sourcesOpenReg: "Im Regelwerk öffnen",
      topTitle: "Prüffälle",
      topSub: "Systemüberprüfung sozialversicherungsrechtlicher IT-Ergebnisse",
      ask: "Fragen Sie SÜSIE …", yourName: "Ihr Name …", start: "Starten",
      onboard: () => `${timeGreeting()}. Ich bin SÜSIE — Ihre Assistentin für diese Systemprüfung. Mit wem arbeite ich?`,
      hello: (n) => `${timeGreeting()}, ${n}! Schön, dass Sie da sind. Ich bin SÜSIE, Ihre Assistentin für diese Prüfung — ich kenne jeden hinterlegten Prüffall, jede Quelle und jeden Beleg in dieser Prüfung. Ich erkläre Ihnen Befunde in klaren Worten, zeige den Feldvergleich, springe für Sie zu den Quellen, fasse den Prüfstand zusammen und führe Schritte nur auf Ihr ausdrückliches Wort aus. Fragen Sie mich zum Beispiel: „Wo stehe ich?“, „Zeig mir die Abweichung“ oder „Erstelle den Bericht“ — worauf möchten Sie zuerst schauen?`,
      greet: (n) => `${timeGreeting()}, ${n}! Schön, dass Sie wieder da sind. Ich kenne jeden hinterlegten Prüffall, jede Quelle und jeden Beleg in dieser Prüfung — fragen Sie mich z. B. „Wo stehe ich?“, „Zeig mir die Abweichung“ oder „Erstelle den Bericht als PDF“. Worauf möchten Sie zuerst schauen?`,
      bottomNote: "Synthetische Daten",
      bottomNoteTitle: "Synthetische Daten — ohne Konformitätsaussage und ohne Rechtsberatung",
      regulations: "Regelwerke",
      regulationsSub: "Indizierte Gesetzestexte durchsuchen und lesen — Abschnitt (Markdown) oder Original-PDF",
      regSearchPh: "Regelwerke durchsuchen (Thema, §, Datenbaustein) …",
      regAllDocs: "Alle Dokumente",
      regEmpty: "Suchbegriff eingeben — oder ein Dokument wählen und stöbern.",
      regNoResults: "Keine Treffer. Suchbegriff oder Dokumentfilter ändern.",
      regChunks: "Abschnitte",
      regOpenPdf: "Original-PDF",
      regBackToText: "Zurück zum Abschnitt",
      regPages: "Seiten",
      regIn: "in",
      searchCases: "Fälle durchsuchen (ID, Kategorie, Befund) …",
      sortDefault: "Sortierung: Status", sortId: "ID A–Z", sortIdDesc: "ID Z–A", sortGroup: "Kategorie",
      showCount: (n, total) => `${n} von ${total} Fällen`,
      noCaseHits: "Keine Treffer — Filter oder Suche anpassen.",
      allF: "Alle",
      loading: "Lade Prüffälle …",
      connecting: "Verbinde …", bridgeOk: "Bridge verbunden", bridgeBad: "Bridge gestört",
      bridgeOff: "Bridge offline — Frontend zeigt synthetischen Leerzustand",
      privacyOn: "Geschützt", privacyOff: "Ungeschützt", privacyUnknown: "Datenschutz …",
      privacyTitle: "Datenschutz-Schleuse aktiv",
      privacySub: "Personenbezogene Daten werden vor jedem externen Kanal erkannt, ersetzt und nachgeprüft — ein Restbefund blockiert den Versand (Fail-closed).",
      privacyPolicy: "Richtlinie", privacyKeyMode: "Pseudonymisierungsschlüssel",
      privacyChannels: "Externe Kanäle", privacyWiring: "Verdrahtet",
      privacyCategories: "Erkannte Kategorien", privacyMode: "Prinzip",
      privacyChatWired: "SÜSIE-Chat → Wissensdienst", privacyLangfuseWired: "Tracing (Langfuse)",
      privacyNone: "keine in dieser Sitzung",
      helpTitle: "Hilfe & Support",
      helpWhatsThisBtn: "Was ist das? — Erklärmodus starten",
      helpWhatsThisOn: "Erklärmodus ist aktiv — Klicken Sie ein Element. ESC beendet.",
      helpAsk: "SÜSIE fragen",
      helpClose: "Schließen",
      helpCapsTitle: "Das kann ich für Sie tun",
      helpCaps: [
        "Durch die Prüfung führen — „Wo stehe ich?“ liefert den Prüfstand mit jeder Abweichung",
        "Alles erklären — Prüffälle, Quellen, Abgleich, Belegkette, Siegel, Datenschutz-Schleuse",
        "Schritte auf Ihr Wort ausführen — Abgleich, Testfälle, Berichts-Export; nichts läuft ohne Ihre Bestätigung",
        "Belege öffnen und zu Fundstellen springen — jeder Befund ist zurückverfolgbar",
      ],
      helpTroubleTitle: "Fehlerbehebung",
      helpTrouble: [
        "Bridge: der Punkt unten rechts muss grün sein — sonst lokalen Dienst neu starten und neu laden",
        "Abgleich abgebrochen? Einfach erneut starten — die Prüfung bleibt immer in einem sauberen Zustand",
        "Chat ohne Antwort? Die Navigation läuft lokal und funktioniert weiter",
        "PDF-Export braucht zuerst einen abgeschlossenen Abgleich",
      ],
      helpTroubleAsk: "Das hat nicht geholfen — SÜSIE fragen",
      helpWhatsThisTitle: "Der Erklärmodus („Was ist das?“)",
      helpWhatsThisText: "Klicken Sie auf das Fragezeichen unten links, dann auf ein Element der Oberfläche — SÜSIE erklärt Ihnen in einem Flyover, wozu es dient. Auf „SÜSIE fragen“ können Sie direkt nachfragen.",
      helpStartWhatsThis: "Erklärmodus starten",
      whatsHint: "Erklärmodus: Klicken Sie ein Element — SÜSIE erklärt es. ESC beendet.",
      whatsNoInfo: "Zu diesem Element habe ich keine Details hinterlegt — fragen Sie mich direkt, ich schaue es mir mit Ihnen an.",
      whatsAskPrefix: "Was ist",
      footAuto: (c, n) => `${c}/${n}`,
      footAutoLabel: "Auto-Geprüft",
      footAutoTitle: "Regressionstest: Die gesamte Prüflogik läuft automatisch gegen eine unabhängige Vergleichsliste (offizielles Beispielpapier + generierte Fälle).",
      footLocal: "Lokal",
      footLocalTitle: "Prüfdaten, Store und Audit-Log bleiben auf diesem Rechner. Nach außen geht nur das Nötigste, geschützt durch die Datenschutz-Schleuse: dem Sprachmodell wird der benötigte Textkontext pseudonymisiert übergeben (nie Personaldaten), und beim Siegeln geht nur der SHA-256-Fingerabdruck des Berichts zur Bestätigungsstelle.",
      footFail: "Fail-closed",
      footFailTitle: "Ohne Beleg kein Bestand: Fehlt eine Grundlage, ein Erwartungswert oder die Software-Ausgabe, bleibt das Ergebnis „Nicht bewertet“ — ein stiller Durchwink ist ausgeschlossen.",
      footEyes: (n) => `4-Augen (${n})`,
      footEyesTitle: "Vier-Augen-Prinzip: KI schlägt vor, der Mensch entscheidet. Der Autor einer KI-Ausgabe darf sie nicht selbst freigeben; jede Gate-Entscheidung trägt Name, Zeitstempel und Begründung.",
      privacyOffline: "Offline", privacyRefused: "Fail-closed",
      privacyRefusedTitle: "Datenschutz-Modul nicht ladbar — alle externen Aufrufe werden verweigert (fail closed). Die Daten bleiben lokal.",
      fullscreenTag: "Vollbild-Modus", overlayBtn: "Overlay-Modus",
      toFullscreen: "Vollbild-Modus", openFab: "SÜSIE Assistentin öffnen",
      themeTitle: "Hell / Dunkel umschalten",
      emptyCases: "Keine Prüffälle. Lassen Sie SÜSIE filtern — sagen Sie z. B. „Zeig mir die Abweichung“.",
      emptyReport: "Keine Konformitätsprüfungen im Store.",
      emptySources: "Keine Quellen im Store.",
      reportWarn: "Synthetische Vorlage — ohne Konformitätsaussage und ohne Rechtsberatung. Freigabe bleibt gesperrt.",
      reportWarnBad: "Konformitätsanspruch aktiv — das darf im Prototyp nicht vorkommen.",
      yes: "Ja, ausführen", no: "Nein",
      done: (d) => `Ausgeführt — ${d}. (Entscheidung: ${S.reviewer}, Ausführung: SÜSIE)`,
      manual: "Verstanden — nichts wurde ausgeführt. Sie behalten die Kontrolle.",
      failed: (m) => `Nicht ausgeführt: ${m}`,
      expected: "Erwartet", observed: "Beobachtet", basis: "Erwartungsgrundlage",
      evidence: "Nachweis", execution: "Ausführung",
      exportBtn: "Protokoll exportieren", exportMsg: "Exportiere das Protokoll.",
      exportNote: "SÜSIE schlägt den Export vor — Ihre Bestätigung, ihre Ausführung.",
      exportDone: "Protokoll exportiert",
      exportConfirm: "Prüfbericht als PDF erstellen? (Synthetische Vorlage — keine Konformitätsaussage.)",
      cmpField: "Feld", cmpExpected: "Erwartet (offiziell)", cmpObserved: "Übermittelt (Software)",
      cmpMissing: "nicht übermittelt",
      passAll: "Alle geprüften Felder stimmen mit der offiziellen Erwartung überein.",
      mismatchIntro: "Abweichung — die Software weicht von der offiziellen Erwartung ab:",
      notEvalIntro: "Kein Vergleich möglich (Fail-closed: nie stillschweigend als bestanden durchgewunken):",
      chainTitle: "Belegkette",
      runAt: "Ausgeführt am",
      chips: ["Wo stehe ich?", "Zeig mir die Abweichung", "Generiere Testfälle aus dem Gesetz", "Erstelle den Bericht als PDF"],
      menuTitle: "Was kann ich für Sie tun?",
      menuUploadRegulation: "Neue Regeländerung hochladen",
      menuUploadReport: "Softwarebericht hochladen",
      menuUploadCase: "Neuen manuellen Fall hochladen",
      menuCaseReference: "Fall aus einer Fundstelle erstellen",
      menuCaseRandom: "Zufälligen Fall aus den Regelwerken erstellen",
      referenceAsk: "Nennen Sie mir die Fundstelle aus den Regelwerken (z. B. „BP §3.2 Abs. 1“), auf die sich der neue Fall beziehen soll — ich schlage Ihnen dann Fall-Entwürfe dazu vor.",
      tryAsk: "Oder fragen Sie direkt:",
      genCasesTitle: "Testfälle aus dem Gesetz erstellen",
      genCasesSub: "Gesetz → Anforderung → Testfälle, ausgeführt von den KI-Rollen — erst mit Ihrer Freigabe",
      runCompareTitle: "Abgleich mit Softwareausgabe starten",
      runCompareSub: "Deterministischer Feldvergleich gegen die offizielle Erwartung — Sekunden, ohne KI",
      runProgressTitle: "Live-Prüflauf läuft",
      runSteps: ["Anforderungsextraktion (GLM-Flash)", "Testfall-Entwurf (Kolibri-1)", "Unabhängige Challenger-Prüfung", "Deterministischer Vergleich"],
      runStarting: "Startet …",
      runStepLabel: (n, label) => `Schritt ${n}/4: ${label}`,
      runDoneLate: "Prüflauf abgeschlossen — die Ergebnisse sind im Store und die Ansicht ist aktualisiert.",
      runTimeout: "Zeitüberschreitung: der Prüflauf hat nicht rechtzeitig geantwortet. Bitte prüfen und erneut ausführen.",
    },
    en: {
      cases: "Cases", report: "Report", sources: "Sources",
      casesSub: "Results per case: official expectation vs. transmitted values — deviations visible at a glance",
      reportSub: "The full review report: findings, recommended actions, PDF export and tamper-evidence seal",
      sourcesSub: "What the review rests on: legal basis, template — and who approved which AI output",
      governance: "Governance",
      freigaben: "Approvals", freigabenSub: "Open human decisions: sources, drafts and report steps waiting for your approval",
      verlauf: "History", verlaufSub: "The review protocol: who decided what and when — approvals with name and rationale, AI runs, changes",
      technik: "Under the hood", technikSub: "The architecture of the review: AI drafts, code computes and checks, the human decides — from the law to the signed report",
      techHeadline: "From the law to the signed report",
      techIntro: "Three stages, three roles: the AI drafts, deterministic code computes and checks — and a human decides at every hand-off. Hover a stage to trace its flow.",
      techLaneRules: "Rules", techLaneTests: "Tests", techLaneVerdict: "Verdict",
      techLegendAi: "AI drafts", techLegendCode: "Code computes and checks", techLegendPerson: "The person decides",
      techBrokenNote: "Broken file → STOP, hand to a person",
      techDisputeNote: "Dispute → back to tests or rules, max 2 times",
      techLoopRewrite: "Rejected or problem found → rewrite, max 2 rounds",
      govOffline: "Connection to the bridge server is down — governance data is only available with the backend.",
      freigabenNone: "Nothing open — all decisions have been made.",
      govRationalePh: "Rationale (required) …",
      govDecideBtn: "Decide",
      govActionPending: "Approval coming soon",
      govActionPendingTitle: "This approval action is activated shortly — the decision will then be recorded here with name and rationale.",
      govConfirmPrefix: "Confirm approval:",
      evGate: "Gate decision",
      evAgentRun: "AI run",
      evChange: "Change",
      verlaufFilter: "Filter history",
      verlaufAll: "Everything",
      verlaufEmpty: "No events recorded yet.",
      verlaufMore: "Load more",
      verlaufDecisions: "Decisions & AI runs",
      evChangesGrouped: "{n} store changes",
      caseViewReport: "Show in report",
      caseReportPdf: "Single-case report (PDF)",
      caseReportPrint: "Print",
      reportRegen: "Regenerate report",
      reportRegenBusy: "Generating report …",
      reportRegenDone: "Report generated",
      openCaseAria: "open in the report",
      basisSearch: "open in the regulations",
      sourcesOpenReg: "Open in the regulations",
      topTitle: "Cases",
      topSub: "Systematic review of social-insurance IT results",
      ask: "Ask SÜSIE …", yourName: "Your name …", start: "Start",
      onboard: () => `${timeGreeting()}. I am SÜSIE — your assistant for this system review. Who am I working with?`,
      hello: (n) => `${timeGreeting()}, ${n}! Great to have you. I am SÜSIE, your assistant for this review — I know every case, every source and every piece of evidence in this review. I explain findings in plain words, show the field-by-field comparison, jump to the sources for you, summarize where the review stands, and only execute steps on your explicit word. Ask me, for example: “Where do I stand?”, “Show me the deviation” or “Create the report” — what would you like to look at first?`,
      greet: (n) => `${timeGreeting()}, ${n}! Good to see you again. I know every case, every source and every piece of evidence in this review — ask me e.g. “Where do I stand?”, “Show me the deviation” or “Create the report as PDF”. What would you like to look at first?`,
      bottomNote: "Synthetic data",
      bottomNoteTitle: "Synthetic data — no conformance claim, no legal advice",
      regulations: "Regulations",
      regulationsSub: "Search and read the indexed law texts — section (markdown) or the original PDF",
      regSearchPh: "Search the regulations (topic, §, data element) …",
      regAllDocs: "All documents",
      regEmpty: "Type a search term — or pick a document and browse.",
      regNoResults: "No hits. Change the search term or document filter.",
      regChunks: "sections",
      regOpenPdf: "Original PDF",
      regBackToText: "Back to the section",
      regPages: "pages",
      regIn: "in",
      searchCases: "Search cases (ID, category, finding) …",
      sortDefault: "Sort: status", sortId: "ID A–Z", sortIdDesc: "ID Z–A", sortGroup: "Category",
      showCount: (n, total) => `${n} of ${total} cases`,
      noCaseHits: "No hits — adjust the filters or search.",
      allF: "All",
      loading: "Loading cases …",
      connecting: "Connecting …", bridgeOk: "Bridge connected", bridgeBad: "Bridge impaired",
      bridgeOff: "Bridge offline — frontend shows synthetic empty state",
      privacyOn: "Protected", privacyOff: "Unprotected", privacyUnknown: "Privacy …",
      privacyTitle: "Privacy airlock active",
      privacySub: "Personal data is detected, replaced and re-checked before every external channel — any residual finding blocks the send (fail closed).",
      privacyPolicy: "Policy", privacyKeyMode: "Pseudonymization key",
      privacyChannels: "External channels", privacyWiring: "Wired in",
      privacyCategories: "Categories detected", privacyMode: "Mode",
      privacyChatWired: "SÜSIE chat → knowledge service", privacyLangfuseWired: "Tracing (Langfuse)",
      privacyNone: "none in this session",
      helpTitle: "Help & support",
      helpWhatsThisBtn: "What's this? — start explain mode",
      helpWhatsThisOn: "Explain mode is active — click any element. ESC to exit.",
      helpAsk: "Ask SÜSIE",
      helpClose: "Close",
      helpCapsTitle: "What I can do for you",
      helpCaps: [
        "Guide the review — “Where do I stand?” gives the current status with every deviation",
        "Explain everything — cases, sources, the comparison, evidence chain, seal, privacy airlock",
        "Run steps on your word — comparison, test cases, report export; nothing runs without your confirmation",
        "Open evidence and jump to sources — every finding is traceable",
      ],
      helpTroubleTitle: "Troubleshooting",
      helpTrouble: [
        "Bridge: the dot bottom-right must be green — otherwise restart the local service and reload",
        "Comparison aborted? Start it again — the review always stays in a clean state",
        "Chat without an answer? Navigation runs locally and keeps working",
        "The PDF export needs a completed comparison first",
      ],
      helpTroubleAsk: "That did not help — ask SÜSIE",
      helpWhatsThisTitle: "Explain mode (“What's this?”)",
      helpWhatsThisText: "Click the question mark bottom-left, then any element on the surface — SÜSIE explains what it is for in a flyover. “Ask SÜSIE” lets you follow up directly.",
      helpStartWhatsThis: "Start explain mode",
      whatsHint: "Explain mode: click an element — SÜSIE explains it. ESC to exit.",
      whatsNoInfo: "I have no details registered for this element — ask me directly and we will look at it together.",
      whatsAskPrefix: "What is",
      footAuto: (c, n) => `${c}/${n}`,
      footAutoLabel: "Auto-tested",
      footAutoTitle: "Regression test: the entire review logic runs automatically against an independent ground truth (official sample document + generated cases).",
      footLocal: "Local",
      footLocalTitle: "Review data, store and audit log stay on this machine. Only the necessary minimum ever leaves, protected by the privacy airlock: the LLM receives the required text context pseudonymized (never personal data), and sealing sends only the report's SHA-256 fingerprint to the confirmation office.",
      footFail: "Fail-closed",
      footFailTitle: "No evidence, no pass: a missing basis, expected value or software output keeps the result “not evaluated” — a silent pass is impossible.",
      footEyes: (n) => `4-eyes (${n})`,
      footEyesTitle: "Four-eyes principle: AI proposes, the human decides. The author of an AI output may not approve it; every gate decision carries name, timestamp and rationale.",
      privacyOffline: "Offline", privacyRefused: "Fail-closed",
      privacyRefusedTitle: "Privacy module not loadable — all external calls are refused (fail closed). Data stays local.",
      fullscreenTag: "Fullscreen mode", overlayBtn: "Overlay mode",
      toFullscreen: "Fullscreen mode", openFab: "Open SÜSIE assistant",
      themeTitle: "Toggle light / dark",
      emptyCases: "No cases. Ask SÜSIE to filter — say e.g. “Show me the deviation”.",
      emptyReport: "No conformance checks in the store.",
      emptySources: "No sources in the store.",
      reportWarn: "Synthetic template — no conformance claim, no legal advice. Release stays disabled.",
      reportWarnBad: "Conformance claim active — this must not happen in the prototype.",
      yes: "Yes, execute", no: "No",
      done: (d) => `Executed — ${d}. (Decision: ${S.reviewer}, executor: SÜSIE)`,
      manual: "Understood — nothing was executed. You stay in control.",
      failed: (m) => `Not executed: ${m}`,
      expected: "Expected", observed: "Observed", basis: "Expected basis",
      evidence: "Evidence", execution: "Execution",
      exportBtn: "Export report", exportMsg: "Export the report.",
      exportNote: "SÜSIE proposes the export — your confirmation, her execution.",
      exportDone: "Report exported",
      exportConfirm: "Generate the review report as a PDF? (Synthetic template — no conformance claim.)",
      cmpField: "Field", cmpExpected: "Expected (official)", cmpObserved: "Transmitted (software)",
      cmpMissing: "not transmitted",
      passAll: "All checked fields match the official expectation.",
      mismatchIntro: "Deviation — the software differs from the official expectation:",
      notEvalIntro: "No comparison possible (fail closed — never a silent pass):",
      chainTitle: "Evidence chain",
      runAt: "Executed at",
      chips: ["Where do I stand?", "Show me the deviation", "Generate test cases from the law", "Create the report as PDF"],
      menuTitle: "What can I do for you today?",
      menuUploadRegulation: "Upload a new regulatory amendment",
      menuUploadReport: "Upload a software report",
      menuUploadCase: "Upload a new manual case",
      menuCaseReference: "Create a case from a specific reference",
      menuCaseRandom: "Create a random case from the regulations",
      referenceAsk: "Name the reference in the regulations (e.g. \"BP §3.2 (1)\") the new case should cite — I will then propose draft cases for it.",
      tryAsk: "Or ask directly:",
      genCasesTitle: "Create test cases from the law",
      genCasesSub: "Law → requirement → test cases, run by the AI roles — only on your confirmation",
      runCompareTitle: "Run comparison against software output",
      runCompareSub: "Deterministic field comparison against the official expectation — seconds, no AI",
      runProgressTitle: "Live review run in progress",
      runSteps: ["Requirement extraction (GLM-Flash)", "Test-case design (Kolibri-1)", "Independent challenger review", "Deterministic comparison"],
      runStarting: "Starting …",
      runStepLabel: (n, label) => `Step ${n}/4: ${label}`,
      runDoneLate: "Review run completed — results are in the store and the views are refreshed.",
      runTimeout: "Timeout: the review run did not answer in time. Please check and run it again.",
    },
  };
  let LANG = store.get("susie-ui-lang", "de") === "en" ? "en" : "de";
  // values may be strings or (parameterized) functions
  const t = (k, ...a) => {
    const v = I18N[LANG][k];
    return typeof v === "function" ? v(...a) : v;
  };

  // Time-aware salutation: morning / day / evening in the chrome language.
  const timeGreeting = () => {
    const h = new Date().getHours();
    if (LANG === "de") return h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  };

  // ---------- review vocabulary: German-first labels + tooltips ----------
  // One map everywhere (badges, chips, report) — no raw machine enums in the UI.
  const STATUS_LABELS = {
    de: { PASS: "Bestanden", MISMATCH: "Abweichung", NOT_EVALUATED: "Nicht bewertet",
          pass: "Bestanden", compliant: "Konform", blocked: "Blockiert",
          needs_review: "Wartet auf Freigabe", candidate: "Kandidat",
          rejected: "Abgelehnt", superseded: "Ersetzt" },
    en: { PASS: "Pass", MISMATCH: "Deviation", NOT_EVALUATED: "Not evaluated",
          pass: "Pass", compliant: "Compliant", blocked: "Blocked",
          needs_review: "Awaiting approval", candidate: "Candidate",
          rejected: "Rejected", superseded: "Superseded" },
  };
  const STATUS_TOOLTIPS = {
    de: {
      PASS: "Bestanden: Alle geprüften Felder stimmen mit dem offiziellen Erwartungswert überein.",
      MISMATCH: "Abweichung: Die übermittelten Werte weichen vom offiziellen Erwartungswert ab — Korrektur im Abrechnungsprogramm, dann Test wiederholen.",
      NOT_EVALUATED: "Nicht bewertet: Grundlage oder Software-Ausgabe unvollständig. Fail-closed-Prinzip: Fehlende Nachweise führen nie zu „Bestanden“.",
      pass: "Strukturprüfung der Berichtsvorlage bestanden — keine Rechts- oder Vorlagen-Konformitätsaussage.",
      compliant: "Konformitätsprüfung bestanden (strukturell).",
      blocked: "Konformitätsprüfung blockiert — ohne verifizierte Vorlage keine Konformitätsaussage.",
    },
    en: {
      PASS: "Pass: all checked fields match the official expected value.",
      MISMATCH: "Deviation: transmitted values differ from the official expectation — correct the payroll software, then re-run.",
      NOT_EVALUATED: "Not evaluated: basis or software output incomplete. Fail-closed: missing evidence never becomes a pass.",
      pass: "Template structure check passed — no legal or template conformance claim.",
      compliant: "Conformance check passed (structural).",
      blocked: "Conformance check blocked — no conformance claim without a verified template.",
    },
  };
  const TYPE_LABELS = {
    de: { normal: "Normalfall", boundary: "Grenzfall", invalid: "Eingabe unvollständig" },
    en: { normal: "Normal case", boundary: "Boundary case", invalid: "Incomplete input" },
  };
  const statusLabel = (s) => STATUS_LABELS[LANG][String(s)] || String(s || "—");
  const statusTip = (s) => STATUS_TOOLTIPS[LANG][String(s)] || "";
  const typeLabel = (v) => TYPE_LABELS[LANG][String(v)] || String(v || "");
  const fmtDateTime = (iso) => {
    try {
      return new Intl.DateTimeFormat(LANG === "de" ? "de-DE" : "en-GB",
        { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
    } catch { return String(iso || "—"); }
  };

  const ACTION_TITLES = {
    select_case: { de: "Fall auswählen", en: "Select case" },
    open_evidence: { de: "Nachweise öffnen", en: "Open evidence" },
    filter_cases: { de: "Fälle filtern", en: "Filter cases" },
    jump_to_source: { de: "Zur Quelle springen", en: "Jump to source" },
    show_comparison: { de: "Vergleich anzeigen", en: "Show comparison" },
    switch_mode: { de: "Modus wechseln", en: "Switch mode" },
    start_over: { de: "Neu beginnen", en: "Start over" },
    go_back: { de: "Zurück", en: "Go back" },
    next_case: { de: "Nächster Fall", en: "Next case" },
    prev_case: { de: "Vorheriger Fall", en: "Previous case" },
    save_note: { de: "Notiz speichern", en: "Save note" },
    export_report: { de: "Protokoll exportieren", en: "Export report" },
    run_comparison: { de: "Vergleich neu ausführen", en: "Re-run comparison" },
    initiate_review_flow: { de: "Prüffluss starten", en: "Start review flow" },
    record_review_state: { de: "Prüfentscheid dokumentieren", en: "Record review decision" },
    record_conformance: { de: "Konformität bewerten", en: "Record conformance" },
    request_release: { de: "Release-Anfrage aufnehmen", en: "Record release request" },
    register_regulation: { de: "Regeländerung registrieren (G0-Kandidat)", en: "Register regulatory amendment (G0 candidate)" },
    import_software_report: { de: "Softwarebericht importieren (TEEL0)", en: "Import software report (TEEL0)" },
    add_manual_case: { de: "Manuellen Fall anlegen (Entwurf)", en: "Add manual case (draft)" },
    create_case_from_reference: { de: "Fall aus Fundstelle erstellen (Entwürfe)", en: "Create case from reference (drafts)" },
    create_random_case: { de: "Zufälligen Fall erstellen (Entwürfe)", en: "Create random case (drafts)" },
  };

  function applyI18n() {
    document.documentElement.lang = LANG;
    document.querySelectorAll("[data-i18n]").forEach((n) => {
      const v = I18N[LANG][n.dataset.i18n];
      if (typeof v === "string") n.textContent = v;
    });
    document.querySelectorAll(".side-link").forEach((b) => {
      b.querySelector("span").textContent = I18N[LANG][b.dataset.view];
      b.title = t(b.dataset.view + "Sub") || "";
    });
    const groupTitle = document.querySelector(".side-group-title");
    if (groupTitle) groupTitle.textContent = t("governance");
    $("topbar-title").textContent = t(S.view);
    $("topbar-sub").textContent = t("topSub");
    $("susie-fab").setAttribute("aria-label", t("openFab"));
    $("susie-fab").title = t("openFab");
    $("theme-toggle").title = t("themeTitle");
    $("susie-mode-tag").textContent = t("fullscreenTag");
    $("to-overlay").querySelector("span").textContent = t("overlayBtn");
    const bottomNote = $("bottom-note");
    bottomNote.textContent = t("bottomNote");
    bottomNote.title = t("bottomNoteTitle");  // full sentence as flyover (T10-045)
    const caseSearch = $("case-search");
    if (caseSearch) caseSearch.placeholder = t("searchCases");
    syncPrivacyBadge();          // T10-044: badge follows the language immediately
    $("whats-this").title = t("helpWhatsThisBtn").split(" — ")[0];
    $("help-support").title = t("helpTitle");
    const dot = $("bridge-dot");
    if (dot.classList.contains("ok") || dot.classList.contains("bad")) {
      $("bridge-label").textContent = dot.classList.contains("ok") ? t("bridgeOk") : t("bridgeBad");
    }
    $("lang-toggle").textContent = LANG === "de" ? "DE" : "EN";
    for (const root of [$("chat-overlay"), $("chat-full")]) {
      const input = root.querySelector(".composer input");
      if (input) input.placeholder = t("ask");
    }
  }

  const S = {
    appState: null,          // payload of GET /api/state
    sessionId: crypto.randomUUID(),
    reviewer: store.get("susie-reviewer", ""),
    mode: "closed",          // closed | overlay | fullscreen
    view: "cases",
    viewStack: [],           // for "go back"
    filter: "",
    selectedCase: null,
    openEvidence: new Set(),
    busy: false,
    // case list: search / status filter / sort (T10-045)
    caseQ: "",
    caseStatus: "all",
    caseSort: "default",
    // regulations browser (T10-045)
    regLoaded: false,
    regDocs: [],
    regQ: "",
    regDoc: "",
    regResults: null,
    regSelected: null,       // { path, meta } — chunk currently open in the reader
    regPdf: null,            // doc id when the reader shows the original PDF
  };

  // ---------- field glossary: wire-format codes -> human words ----------
  const FIELD_LABELS = {
    "ABGABEGRUND": { de: "Abgabegrund", en: "Submission reason" },
    "KORR-ABGABEGRUND": { de: "Korrektur-Abgabegrund", en: "Correction submission reason" },
    "MM-ALLGEMEIN": { de: "Meldemerkmale — allgemein", en: "Reporting features — general" },
    "MM-ENTGELT": { de: "Meldemerkmale — Entgelt", en: "Reporting features — pay" },
    "MM-ZEITKG": { de: "Meldemerkmale — Zeitkrankengeld", en: "Reporting features — sickness benefit" },
    "MM-VOER": { de: "Meldemerkmale — Vorerkrankung", en: "Reporting features — prior illness" },
    "DATUM-AB": { de: "Datum ab", en: "Valid-from date" },
    "DATUM-EGZBIS": { de: "Datum Entgeltersatz bis", en: "Benefit-until date" },
    "EAZ-BEGINN-1": { de: "Beginn Entgeltersatzleistung (Zeitraum 1)", en: "Benefit start (period 1)" },
    "EAZ-ENDE-1": { de: "Ende Entgeltersatzleistung (Zeitraum 1)", en: "Benefit end (period 1)" },
    "BRUTTO-1": { de: "Bruttoentgelt (Zeitraum 1)", en: "Gross pay (period 1)" },
    "NETTO-1": { de: "Nettoentgelt (Zeitraum 1)", en: "Net pay (period 1)" },
    "WAEHREEL-BRUTTO": { de: "Währungseinheit Brutto", en: "Currency unit gross" },
    "VOER-ANFRAGE-AUSGELOEST": { de: "Vorerkrankungsanfrage ausgelöst", en: "Prior-illness query triggered" },
    "kumulierte_tage_vorzeiten": { de: "Kumulierte Tage Vorzeiten", en: "Cumulative prior days" },
    "kumulierte_tage_aktuelle_au": { de: "Kumulierte Tage aktuelle AU", en: "Cumulative days, current incapacity" },
    "kumulierte_tage_gesamt": { de: "Kumulierte Tage gesamt", en: "Cumulative days total" },
    "alternative_a": { de: "Variante A (Sachverhalt)", en: "Variant A (scenario)" },
    "alternative_b": { de: "Variante B (Sachverhalt)", en: "Variant B (scenario)" },
    "beginn_arbeitsunfaehigkeit": { de: "Beginn der Arbeitsunfähigkeit", en: "Incapacity start" },
    "abrechnung": { de: "Abrechnungsrhythmus", en: "Payroll cycle" },
    "current_au": { de: "Aktuelle Arbeitsunfähigkeit", en: "Current incapacity" },
    "prior_episodes": { de: "Vorerkrankungen (frühere AUs)", en: "Prior incapacity episodes" },
    "reporting_date": { de: "Meldedatum", en: "Reporting date" },
    "current_start": { de: "Beginn aktuelle AU", en: "Current incapacity start" },
    "current_end": { de: "Ende aktuelle AU", en: "Current incapacity end" },
    "today": { de: "Stichtag", en: "Reference date" },
    "current_cert": { de: "AU bescheinigt", en: "Incapacity certified" },
    "insurance": { de: "Versicherungsart", en: "Insurance type" },
    "prior": { de: "Vorerkrankungen", en: "Prior episodes" },
  };
  const fieldLabel = (f) => (FIELD_LABELS[String(f).trim()] || {})[LANG] || String(f);
  // compact readable rendering for nested scenario values (never "[object Object]")
  const fmtInputValue = (v) => {
    if (Array.isArray(v)) return v.map(fmtInputValue).join(", ");
    if (v && typeof v === "object") return Object.entries(v).map(([k, v2]) => `${k}: ${fmtInputValue(v2)}`).join(" ");
    return String(v);
  };

  // field-level comparison table (deterministic, from expected/observed dicts)
  function comparisonTable(c) {
    const exp = c.expected || {}, obs = c.observed || {};
    const keys = [...new Set([...Object.keys(exp), ...Object.keys(obs)])];
    if (!keys.length) return null;
    const table = el("table", "cmp-table");
    const thead = el("thead");
    const hr = el("tr");
    for (const h of [t("cmpField"), t("cmpExpected"), t("cmpObserved")]) {
      hr.appendChild(el("th", "", h));
    }
    thead.appendChild(hr); table.appendChild(thead);
    const tbody = el("tbody");
    let diffs = 0;
    for (const k of keys) {
      const e = exp[k], o = obs[k];
      const differs = o !== undefined && String(o) !== String(e);
      const missing = o === undefined || o === null || o === "";
      if (differs || missing) diffs++;
      const tr = el("tr", differs || missing ? "cmp-diff" : "");
      tr.appendChild(el("td", "cmp-field", fieldLabel(k)));
      tr.appendChild(el("td", "mono", e === undefined ? "—" : String(e)));
      tr.appendChild(el("td", "mono" + (differs ? " cmp-bad" : ""),
        missing ? (e === undefined ? "—" : t("cmpMissing")) : String(o)));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return { table, diffs };
  }

  // one plain-language sentence per finding — assembled from the record, never invented
  function humanReason(c) {
    const status = c.status || "NOT_EVALUATED";
    if (status === "PASS") return { intro: "", body: t("passAll") };
    if (status === "MISMATCH") {
      const exp = c.expected || {}, obs = c.observed || {};
      const parts = [];
      for (const k of Object.keys(exp)) {
        const o = obs[k];
        if (o !== undefined && String(o) !== String(exp[k])) {
          parts.push(`${fieldLabel(k)}: ${LANG === "de" ? "erwartet" : "expected"} „${exp[k]}“, ${LANG === "de" ? "übermittelt" : "transmitted"} „${o}“`);
        } else if (o === undefined || o === null || o === "") {
          parts.push(`${fieldLabel(k)}: ${t("cmpMissing")}`);
        }
      }
      return { intro: t("mismatchIntro"), body: parts.join(" · ") || c.reason || "" };
    }
    const known = {
      "missing expected value": LANG === "de" ? "erwarteter Wert fehlt" : "missing expected value",
      "incomplete Sachverhalt": LANG === "de" ? "unvollständiger Sachverhalt" : "incomplete scenario",
    };
    return { intro: t("notEvalIntro"), body: known[c.reason?.trim?.()] || c.reason || "—" };
  }

  // evidence chain — every chip is a REAL record from the store; clicking a
  // chip shows that record's human-readable detail inline. No fake ids.
  function evidenceChain(c, crit) {
    const st = S.appState || {};
    const src = st.source || {};
    const rep = st.report || {};
    const req = (st.requirements || []).find((r) => r.id === (crit?.requirement_id || ""));
    const steps = [
      rep.id && { chip: rep.id, title: LANG === "de" ? "Bericht" : "Report",
        detail: LANG === "de" ? "Deterministisch erzeugter Prüfbericht; Konformitätsaussage: NEIN."
          : "Deterministically generated review report; conformance claim: NO." },
      c.execution_id && { chip: c.execution_id, title: LANG === "de" ? "Ausführung" : "Execution",
        detail: `${c.software?.vendor || "—"} · Build ${c.software?.version || "—"}`
          + (c.run_at ? ` · ${t("runAt")}: ${String(c.run_at).slice(0, 19).replace("T", " ")}` : "")
          + (c.evidence_ref ? ` · ${c.evidence_ref}` : "") },
      c.id && { chip: c.id, title: LANG === "de" ? "Testfall" : "Test case",
        detail: `${c.case_type || "normal"} · ${c.expected_basis || ""}` },
      c.criterion_id && { chip: c.criterion_id, title: LANG === "de" ? "Kriterium" : "Criterion",
        detail: crit?.description || "—" },
      crit?.requirement_id && { chip: crit.requirement_id, title: LANG === "de" ? "Anforderung" : "Requirement",
        detail: req?.text || (LANG === "de" ? "Anforderung aus dem gespeicherten Quelldokument." : "Requirement from the stored source document.") },
      src.id && { chip: src.id, title: LANG === "de" ? "Quelle" : "Source",
        detail: `${src.title || ""} · ${src.issuer || ""} · Version ${src.version || "?"} · ${LANG === "de" ? "gültig ab" : "valid from"} ${src.valid_from || "—"}`,
        jump: true },
    ].filter(Boolean);

    const wrap = el("div", "chain");
    wrap.appendChild(el("p", "card-subhead",
      LANG === "de" ? "Belegkette — Prüfpfad vom Bericht zur Quelle (Chip anklicken für Details)"
                    : "Evidence chain — report to source (click a chip for details)"));
    const rowEl = el("div", "chain-row");
    const detail = el("div", "chain-detail");
    detail.hidden = true;
    const show = (s) => {
      detail.textContent = "";
      detail.appendChild(el("strong", "", `${s.title}: `));
      detail.appendChild(document.createTextNode(s.detail));
      detail.hidden = false;
    };
    steps.forEach((s, i) => {
      if (i) rowEl.appendChild(el("span", "chain-arrow", "→"));
      const chip = el("button", "chip source chain-chip", s.chip);
      chip.title = `${s.title}: ${s.detail}`.slice(0, 300);
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        show(s);
        if (s.jump) invoke("jump_to_source", { ref: s.chip });
      });
      rowEl.appendChild(chip);
    });
    wrap.appendChild(rowEl);
    wrap.appendChild(detail);
    return wrap;
  }

  // Onboarding storyline (T10-054): after the greeting SUSIE proposes her five
  // predefined jobs. Uploads open a file picker and then propose the matching
  // action directly (propose → human Ja → execute, no model involvement); the
  // reference job asks for the Fundstelle in chat; the random job proposes at
  // once. No fake user messages anywhere.
  function addChips(log) {
    const card = el("div", "onboard-menu");
    card.appendChild(el("div", "onboard-menu-title", t("menuTitle")));
    const jobs = [
      { label: t("menuUploadRegulation"), accept: ".xml,.txt,.md,.pdf,.json,.csv",
        action: "register_regulation", params: (f) => ({ file_id: f.id, title: f.original_name }) },
      { label: t("menuUploadReport"), accept: ".xml,.txt",
        action: "import_software_report", params: (f) => ({ file_id: f.id }) },
      { label: t("menuUploadCase"), accept: ".txt,.md,.json,.xml,.csv",
        action: "add_manual_case", params: (f) => ({ file_id: f.id }) },
      { label: t("menuCaseReference") },
      { label: t("menuCaseRandom"), action: "create_random_case", params: () => ({}) },
    ];
    for (const job of jobs) {
      const item = el("button", "chip state onboard-item", job.label);
      item.type = "button";
      item.addEventListener("click", () => {
        if (S.busy) return;
        if (!job.action) askForReference(log);
        else if (job.accept) pickAndUpload(log, job);
        else demoCommand(job.action, job.params(null));
      });
      card.appendChild(item);
    }
    log.appendChild(card);
    log.scrollTop = log.scrollHeight;
  }

  function pickAndUpload(log, job) {
    const picker = document.createElement("input");
    picker.type = "file";
    picker.accept = job.accept;
    picker.addEventListener("change", async () => {
      const file = picker.files && picker.files[0];
      if (!file) return;
      addBubble(log, "susie", LANG === "de"
        ? `Lade „${file.name}“ hoch …` : `Uploading “${file.name}” …`);
      try {
        const f = await uploadFile(file);
        addBubble(log, "susie", LANG === "de"
          ? `Empfangen: ${f.original_name} (${f.id}).`
          : `Received: ${f.original_name} (${f.id}).`);
        demoCommand(job.action, job.params(f));
      } catch (err) {
        addBubble(log, "susie", LANG === "de"
          ? `Upload fehlgeschlagen: ${err.message}` : `Upload failed: ${err.message}`);
      }
    });
    picker.click();
  }

  async function uploadFile(file) {
    const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
      method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: file,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.ok === false) throw new Error(body.error || `HTTP ${res.status}`);
    return body.file;
  }

  function askForReference(jobLog) {
    S.referenceAsk = true;
    addBubble(jobLog, "susie", t("referenceAsk"));
    const input = activeLog().querySelector(".composer input");
    input?.focus();
  }

  function proposeReference(reference) {
    const log = activeLog().querySelector(".chat-log");
    if (log) addBubble(log, "user", reference);
    demoCommand("create_case_from_reference", { reference });
  }

  // =========================================================================
  // Action bus — the takeover surface. Whitelisted, event-emitting, and the
  // ONLY way chat-driven actions touch the app.
  // =========================================================================
  const listeners = new Map();
  const emit = (ev, detail) => (listeners.get(ev) || []).forEach((f) => { try { f(detail); } catch {} });

  const READ_ONLY = new Set(["select_case", "open_evidence", "filter_cases", "jump_to_source", "show_comparison", "switch_mode", "start_over", "go_back", "next_case", "prev_case", "open_report_section", "open_regulation"]);

  // step to the neighbouring case in the rendered list order (go back and forth)
  function stepCase(dir) {
    const cases = S.appState?.cases || [];
    if (!cases.length) return { executed: false, detail: LANG === "de" ? "Keine Prüffälle" : "No cases" };
    const ids = cases.map((c) => c.id);
    const at = Math.max(0, ids.indexOf(S.selectedCase));
    const next = cases[(at + dir + cases.length) % cases.length];
    return clientExec.open_evidence({ case_id: next.id });
  }

  const clientExec = {
    start_over() {
      S.filter = ""; S.selectedCase = null; S.openEvidence.clear(); S.viewStack = [];
      showView("cases"); renderCases();
      const log = activeLog().querySelector(".chat-log");
      if (log) { addBubble(log, "susie", t("greet", S.reviewer)); addChips(log); }
      return { executed: true, detail: LANG === "de" ? "Zurückgesetzt — neu begonnen" : "Reset — started over" };
    },
    go_back() {
      const prev = (S.viewStack || []).pop();
      showView(prev && prev !== S.view ? prev : "cases");
      withViewGuard("cases", renderCases); withViewGuard("report", renderReport); withViewGuard("sources", renderSources);
      return { executed: true, detail: LANG === "de" ? `Zurück zu ${t(S.view)}` : `Back to ${t(S.view)}` };
    },
    next_case() { return stepCase(+1); },
    prev_case() { return stepCase(-1); },
    select_case({ case_id }) {
      S.selectedCase = case_id; S.view = "cases"; showView("cases");
      renderCases();
      const card = document.querySelector(`[data-case="${CSS.escape(case_id)}"]`);
      if (card) { card.scrollIntoView({ block: "center" }); flash(card); }
      return { executed: true, detail: LANG === "de" ? `Fall ${case_id} ausgewählt` : `Case ${case_id} selected` };
    },
    open_evidence({ case_id }) {
      S.selectedCase = case_id; S.openEvidence.add(case_id);
      S.view = "cases"; showView("cases"); renderCases();
      const card = document.querySelector(`[data-case="${CSS.escape(case_id)}"]`);
      if (card) { card.scrollIntoView({ block: "center" }); flash(card); }
      return { executed: true, detail: LANG === "de" ? `Nachweise zu ${case_id} geöffnet` : `Evidence for ${case_id} opened` };
    },
    filter_cases({ filter }) {
      // A status concept must drive the status chips, not the free-text search:
      // the searchable text carries the localized labels ("Abweichung"/"Deviation"),
      // so a chat-suggested "MISMATCH" text filter matched zero cards (owner bug
      // report 2026-10-27: SÜSIE promised the 11 mismatches, the list went empty).
      const raw = String(filter ?? "").trim();
      const low = raw.toLowerCase();
      const STATUS_WORDS = {
        PASS: ["pass", "bestanden"],
        MISMATCH: ["mismatch", "abweichung", "deviation", "fehler", "abweichend", "error"],
        NOT_EVALUATED: ["not_evaluated", "not evaluated", "nicht bewertet", "unevaluated", "offen"],
      };
      const status = Object.entries(STATUS_WORDS).find(([, words]) => words.includes(low))?.[0];
      // chat-driven filtering REPLACES the filter state (chip + text) — a stale
      // status chip stacking with a new text filter would silently empty the list
      if (status) {
        S.caseStatus = status; S.filter = "";
      } else {
        S.caseStatus = "all"; S.filter = raw;
      }
      S.view = "cases"; showView("cases"); renderCases();
      const detail = status
        ? (LANG === "de" ? `Statusfilter „${statusLabel(status)}“ aktiv` : `Status filter "${statusLabel(status)}" active`)
        : raw ? (LANG === "de" ? `Filter „${raw}“ aktiv` : `Filter "${raw}" active`)
              : (LANG === "de" ? "Filter zurückgesetzt" : "Filter cleared");
      return { executed: true, detail };
    },
    jump_to_source({ ref }) {
      S.view = "sources"; showView("sources"); renderSources();
      const target = document.getElementById(`src-${CSS.escape(ref || "")}`) || document.querySelector(".card");
      if (target) { target.scrollIntoView({ block: "center" }); flash(target); }
      return { executed: true, detail: LANG === "de" ? "Zur Quelle gesprungen" : "Jumped to the source" };
    },
    show_comparison({ case_id }) {
      S.selectedCase = case_id; S.openEvidence.add(case_id);
      S.view = "cases"; showView("cases"); renderCases();
      const card = document.querySelector(`[data-case="${CSS.escape(case_id)}"]`);
      if (card) { card.scrollIntoView({ block: "center" }); flash(card); }
      return { executed: true, detail: LANG === "de" ? `Vergleich für ${case_id} angezeigt` : `Comparison for ${case_id} shown` };
    },
    open_report_section({ case_id }) {
      S.view = "report"; showView("report");
      withViewGuard("report", renderReport);
      const target = Array.from(document.querySelectorAll("#report-body .report-row"))
        .find((r) => r.querySelector(".card-title")?.textContent === case_id);
      if (target) { target.scrollIntoView({ block: "center" }); flash(target); }
      return { executed: true, detail: LANG === "de" ? `Berichtsabschnitt zu ${case_id} geöffnet` : `Report section for ${case_id} opened` };
    },
    open_regulation({ query }) {
      S.regQ = String(query ?? "");
      S.view = "regulations";
      showView("regulations");
      const fill = () => {
        const search = document.querySelector(".reg-search");
        if (search) { search.value = S.regQ; regRunSearch(); }
      };
      if (!S.regLoaded) loadRegulations().then(fill); else fill();
      return { executed: true, detail: LANG === "de" ? `Regelwerke durchsucht: „${S.regQ}“` : `Regulations searched: "${S.regQ}"` };
    },
    switch_mode({ mode }) {
      setMode(mode === "fullscreen" ? "fullscreen" : "overlay");
      return { executed: true, detail: mode === "fullscreen" ? (LANG === "de" ? "Vollbild-Modus" : "Full-screen mode")
                                     : (LANG === "de" ? "Overlay-Modus" : "Overlay mode") };
    },
  };

  async function invoke(actionId, params = {}, confirmToken = null, opts = {}) {
    if (!READ_ONLY.has(actionId)) {
      const res = await fetch("/api/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: S.sessionId, action_id: actionId,
          params, confirm_token: confirmToken, reviewer: S.reviewer,
        }),
        signal: opts.signal,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.ok === false) {
        const err = new Error(body.error || `${LANG === "de" ? "Aktion fehlgeschlagen" : "Action failed"} (HTTP ${res.status})`);
        err.actionResult = "err"; throw err;
      }
      emit("action_executed", { actionId: actionId, result: body.result });
      // server-side mutations change the store — refresh the views so the
      // human SEES the effect (e.g. re-run comparison produces new findings)
      if (body.result?.mode === "server") loadState();
      return body.result;
    }
    const fn = clientExec[actionId];
    if (!fn) { const e = new Error(`${LANG === "de" ? "Unbekannte Aktion" : "Unknown action"}: ${actionId}`); e.actionResult = "err"; throw e; }
    const result = fn(params);
    emit("action_executed", { actionId, result });
    return result;
  }

  window.SUSIE_APP = {
    invoke,
    on: (ev, f) => { (listeners.get(ev) || listeners.set(ev, []).get(ev)).push(f); },
    off: (ev, f) => { listeners.set(ev, (listeners.get(ev) || []).filter((x) => x !== f)); },
    state: () => S.appState,
  };

  function flash(node) {
    if (reducedMotion.matches) return;
    node.classList.remove("flash"); void node.offsetWidth; node.classList.add("flash");
  }

  // Render guard (T10-049): one failing view must never take down the shell.
  // The error card is honest text (no fake recovery), built with textContent.
  function withViewGuard(viewName, renderFn) {
    try {
      renderFn();
    } catch (err) {
      console.error(`view ${viewName} failed to render`, err);
      const host = $(`view-${viewName}`);
      if (!host) return;
      host.textContent = "";
      const card = el("div", "card guard-error");
      card.appendChild(el("strong", "", LANG === "de" ? "Diese Ansicht konnte nicht geladen werden." : "This view could not be loaded."));
      card.appendChild(el("p", "guard-detail", String(err && err.message ? err.message : err)));
      const retry = el("button", "btn ghost-btn", LANG === "de" ? "Erneut versuchen" : "Retry");
      retry.type = "button";
      retry.addEventListener("click", () => withViewGuard(viewName, renderFn));
      card.appendChild(retry);
      host.appendChild(card);
    }
  }

  // Last resort: an uncaught error must never leave a blank shell behind.
  window.addEventListener("error", (event) => {
    console.error("uncaught", event.error || event.message);
  });

  // =========================================================================
  // Views
  // =========================================================================
  function showView(v) {
    if (v !== S.view) { S.viewStack = S.viewStack || []; S.viewStack.push(S.view); }
    S.view = v;
    for (const id of ["cases", "report", "sources", "regulations", "freigaben", "verlauf", "technik"]) $(`view-${id}`).hidden = id !== v;
    $("case-summary").hidden = v !== "cases";  // the case counts mean nothing elsewhere
    document.body.dataset.view = v;
    if (v === "regulations" && !S.regLoaded) loadRegulations();
    if (v === "freigaben" || v === "verlauf") loadGovernance();
    if (v === "technik") withViewGuard("technik", renderTechnik);
    document.querySelectorAll(".side-link").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === v));
    // the page heading follows the view — never a stale title anywhere
    $("topbar-title").textContent = t(v);
    $("topbar-sub").textContent = t(v + "Sub") || t("topSub");
    document.querySelectorAll(".side-link").forEach((b) => {
      b.title = t(b.dataset.view + "Sub") || "";
    });
    emit("view_changed", { view: v });
  }

  const badge = (status) => {
    const key = String(status || "NOT_EVALUATED");
    const cls = (key === "PASS" || key === "pass") ? "badge-pass"
      : (key === "MISMATCH" || key === "blocked") ? "badge-mismatch"
      : "badge-not-evaluated";
    const b = el("span", `badge ${cls}`, statusLabel(key));
    const tip = statusTip(key);
    if (tip) {
      b.title = `${tip}${LANG === "de" ? ` Notencode: ${key}.` : ` Code: ${key}.`}`;
      b.classList.add("has-tip");
    }
    return b;
  };

  // curated search text — never internal JSON (typing "id" must not match all)
  const searchable = (c) => [
    c.id, c.criterion_id, statusLabel(c.status), typeLabel(c.case_type), c.reason,
    ...Object.entries(c.expected || {}).map(([k, v]) => `${fieldLabel(k)} ${v}`),
    ...Object.entries(c.observed || {}).map(([k, v]) => `${fieldLabel(k)} ${v}`),
    c.expected_basis || "",
  ].join(" ").toLowerCase();

  // ---- case list toolbar (T10-045): search + status filter + sort ----------
  const groupOf = (c) => String(c.id || "").split("-")[0];
  const byIdDe = (a, b) => String(a.id).localeCompare(String(b.id), "de", { numeric: true });

  function visibleCases() {
    const q = (S.filter || "").toLowerCase();
    let cases = (S.appState?.cases || []).filter((c) => !q || searchable(c).includes(q));
    if (S.caseStatus !== "all") cases = cases.filter((c) => c.status === S.caseStatus);
    if (S.caseSort === "id") cases = [...cases].sort(byIdDe);
    else if (S.caseSort === "id-desc") cases = [...cases].sort((a, b) => byIdDe(b, a));
    else if (S.caseSort === "group") cases = [...cases].sort((a, b) =>
      groupOf(a).localeCompare(groupOf(b), "de") || byIdDe(a, b));
    return cases; // "default": store order (status severity, then id)
  }

  function initCaseToolbar() {
    const bar = $("case-toolbar");
    if (!bar || bar.dataset.init) return;
    bar.dataset.init = "1";
    bar.textContent = "";
    const search = el("input", "case-search");
    search.type = "search";
    search.id = "case-search";
    search.setAttribute("aria-label", t("searchCases"));
    let debounce = 0;
    search.addEventListener("input", () => {
      S.filter = search.value.trim();  // state first: toolbar syncs must never clobber it
      clearTimeout(debounce);
      debounce = setTimeout(renderCases, 140);
    });
    bar.appendChild(search);
    const seg = el("div", "seg");
    seg.id = "case-status-filter";
    seg.setAttribute("role", "group");
    bar.appendChild(seg);
    const sort = el("select", "case-sort");
    sort.id = "case-sort";
    sort.setAttribute("aria-label", LANG === "de" ? "Sortieren" : "Sort");
    for (const [v, key] of [["default", "sortDefault"], ["id", "sortId"],
                            ["id-desc", "sortIdDesc"], ["group", "sortGroup"]]) {
      const opt = el("option", "", t(key));
      opt.value = v;
      sort.appendChild(opt);
    }
    sort.value = S.caseSort;
    sort.addEventListener("change", () => { S.caseSort = sort.value; renderCases(); });
    bar.appendChild(sort);
    const count = el("span", "case-count");
    count.id = "case-count";
    bar.appendChild(count);
    search.placeholder = t("searchCases");
  }

  function renderCaseToolbar(total) {
    initCaseToolbar();
    const bar = $("case-toolbar");
    if (!bar) return;
    const search = bar.querySelector(".case-search");
    if (search && document.activeElement !== search && search.value !== (S.filter || "")) {
      search.value = S.filter || "";  // chat commands can drive the query too
    }
    // The toolbar is built once; texts follow the current language on every render (DE/EN switch).
    if (search) {
      search.placeholder = t("searchCases");
      search.setAttribute("aria-label", t("searchCases"));
    }
    const sort = $("case-sort");
    if (sort) {
      const keys = { default: "sortDefault", id: "sortId", "id-desc": "sortIdDesc", group: "sortGroup" };
      for (const opt of sort.options) opt.textContent = t(keys[opt.value]);
      sort.setAttribute("aria-label", LANG === "de" ? "Sortieren" : "Sort");
    }
    const counts = { all: total };
    for (const c of S.appState?.cases || []) counts[c.status] = (counts[c.status] || 0) + 1;
    const seg = $("case-status-filter");
    seg.textContent = "";
    for (const st of ["all", "PASS", "MISMATCH", "NOT_EVALUATED"]) {
      const chip = el("button", "seg-item" + (S.caseStatus === st ? " active" : ""),
        `${st === "all" ? t("allF") : statusLabel(st)} ${counts[st] ?? 0}`);
      chip.type = "button";
      chip.addEventListener("click", () => { S.caseStatus = st; renderCases(); });
      seg.appendChild(chip);
    }
    const shown = visibleCases().length;
    $("case-count").textContent = t("showCount", shown, total);
  }

  function renderCases() {
    const list = $("case-list"); list.textContent = "";
    const all = S.appState?.cases || [];
    const cases = visibleCases();

    const counts = {};
    for (const c of all) counts[c.status] = (counts[c.status] || 0) + 1;
    const chips = $("case-summary"); chips.textContent = "";
    for (const [st, n] of Object.entries(counts)) {
      const b = el("span", `badge ${st === "PASS" ? "badge-pass" : st === "MISMATCH" ? "badge-mismatch" : "badge-not-evaluated"}`, `${n} ${statusLabel(st)}`);
      b.title = statusTip(st) || "";
      if (b.title) b.classList.add("has-tip");
      chips.appendChild(b);
    }
    renderCaseToolbar(all.length);
    if (!all.length) { list.appendChild(el("div", "empty", t("emptyCases"))); return; }
    if (!cases.length) { list.appendChild(el("div", "empty", t("noCaseHits"))); return; }

    for (const c of cases) {
      const isOpen = S.openEvidence.has(c.id);
      const card = el("article", "card clickable");
      card.dataset.case = c.id || "";
      if (c.id === S.selectedCase) card.classList.add("selected");
      // keyboard access: the card IS a button (public-sector acceptance checks this)
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      card.setAttribute("aria-expanded", String(isOpen));
      const head = el("div", "card-head");
      head.appendChild(el("span", "card-title", c.id || "Fall"));
      head.appendChild(badge(c.status || "NOT_EVALUATED"));
      if (c.case_type && c.case_type !== "normal") {
        const tb = el("span", "badge badge-neutral", typeLabel(c.case_type));
        tb.title = LANG === "de"
          ? ({ normal: "Regelfall aus dem offiziellen Beispiel.",
               boundary: "Grenzfall: prüft die exakte Grenze der Regel (§3.2.1.4).",
               invalid: "Unvollständige Eingabe — das Ergebnis muss „Nicht bewertet“ sein (Fail-closed)." }[c.case_type] || "")
          : "";
        head.appendChild(tb);
      }
      const chev = el("span", "chevron", isOpen ? "▾" : "▸");
      chev.setAttribute("aria-hidden", "true");
      head.appendChild(chev);
      card.appendChild(head);
      const crit = (S.appState?.criteria || []).find((x) => x.id === c.criterion_id);
      // collapsed = collapsed: details (criterion, reason, comparison) only on open.
      // The old always-on mini deviation table made 146 MISMATCH cards read as
      // "expanded by default" — removed in T10-045.
      if (isOpen) {
        const metaText = crit?.description || c.criterion_id || "—";
        card.appendChild(el("p", "card-meta",
          metaText.length > 220 ? metaText.slice(0, metaText.lastIndexOf(" ", 220)) + " …" : metaText));
        const hr = humanReason(c);
        if (hr.intro) card.appendChild(el("p", "card-reason", hr.intro));
        if (hr.body) card.appendChild(el("p", hr.intro ? "card-detail" : "card-reason", hr.body));
        const cmp = comparisonTable(c);
        if (cmp) {
          card.appendChild(el("p", "card-subhead", LANG === "de" ? "Feldvergleich (Soll / Ist)" : "Field comparison (expected / transmitted)"));
          card.appendChild(cmp.table);
        }
        const kv = el("dl", "kv");
        const row = (k, v) => { kv.appendChild(el("dt", "", k)); kv.appendChild(el("dd", "", String(v ?? "—"))); };
        if (c.inputs && Object.keys(c.inputs).length) {
          row(LANG === "de" ? "Sachverhalt (Eingaben)" : "Scenario (inputs)",
            Object.entries(c.inputs).map(([k, v]) => `${fieldLabel(k)}: ${fmtInputValue(v)}`).join(" · "));
        }
        // Cross-link (T10-049): the expectation basis opens the regulation
        // browser pre-searched for it — the finding points at its law text.
        if (c.expected_basis) {
          kv.appendChild(el("dt", "", t("basis")));
          const basisBtn = el("dd", "link-like", `${c.expected_basis} — ${t("basisSearch")}`);
          basisBtn.tabIndex = 0;
          basisBtn.setAttribute("role", "button");
          const go = () => clientExec.open_regulation({ query: c.expected_basis });
          basisBtn.addEventListener("click", (e) => { e.stopPropagation(); go(); });
          basisBtn.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); go(); } });
          kv.appendChild(basisBtn);
        }
        if (c.run_at) row(t("runAt"), fmtDateTime(c.run_at));
        card.appendChild(kv);
        // Report actions for THIS case (owner request 2026-10-27): view in the
        // report, single-case PDF, print. Buttons stop the card's toggle.
        const acts = el("div", "case-report-actions");
        const mk = (label, fn) => {
          const b = el("button", "btn ghost-btn case-report-btn", label);
          b.type = "button";
          b.addEventListener("click", (e) => { e.stopPropagation(); fn(); });
          b.addEventListener("keydown", (e) => e.stopPropagation());
          return b;
        };
        acts.appendChild(mk(t("caseViewReport"), () => clientExec.open_report_section({ case_id: c.id })));
        acts.appendChild(mk(t("caseReportPdf"), () => downloadCaseReport(c.id)));
        acts.appendChild(mk(t("caseReportPrint"), () => window.open(`/api/report/pdf?case_id=${encodeURIComponent(c.id)}&lang=${LANG}`, "_blank")));
        card.appendChild(acts);
        card.appendChild(evidenceChain(c, crit));
      }
      const toggle = () => {
        if (isOpen) { S.openEvidence.delete(c.id); renderCases(); emit("evidence_closed", { caseId: c.id }); }
        else invoke("open_evidence", { case_id: c.id });
      };
      card.addEventListener("click", toggle);
      card.addEventListener("keydown", (e) => {
        if (e.target !== card) return;  // inner buttons handle their own activation
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
      });
      list.appendChild(card);
    }
  }

  // deterministic recommended actions for the Protokoll view (mirrors the PDF)
  function recommendedActions(cases) {
    const recs = [];
    for (const c of cases) {
      if (c.status === "MISMATCH") {
        const exp = c.expected || {}, obs = c.observed || {};
        const diff = Object.keys(exp).find((k) => obs[k] !== undefined && String(obs[k]) !== String(exp[k]))
          || Object.keys(exp).find((k) => obs[k] === undefined || obs[k] === "");
        recs.push(diff
          ? (LANG === "de"
            ? `${c.id}: Feld „${fieldLabel(diff)}“ im Abrechnungsprogramm prüfen und korrigieren (erwartet „${exp[diff]}“, übermittelt „${obs[diff] ?? "—"}“), Test wiederholen.`
            : `${c.id}: check and correct field "${fieldLabel(diff)}" in the payroll program (expected "${exp[diff]}", transmitted "${obs[diff] ?? "—"}"), repeat the test.`)
          : (LANG === "de" ? `${c.id}: Abweichung im Abrechnungsprogramm prüfen, Test wiederholen.`
                           : `${c.id}: check the deviation in the payroll program, repeat the test.`));
      } else if (c.status === "NOT_EVALUATED") {
        recs.push(LANG === "de" ? `${c.id}: vollständige Eingaben bereitstellen und den Test erneut ausführen.`
                                 : `${c.id}: provide complete inputs and run the test again.`);
      }
    }
    if (!recs.length && cases.length) {
      recs.push(LANG === "de"
        ? "Keine Korrekturen erforderlich. Die Freigabe bleibt an den menschlichen Freigabeprozess (Gate G6) gebunden."
        : "No corrections required. Release remains bound to the human release gate (G6).");
    }
    return recs;
  }

  function renderReport() {
    const body = $("report-body"); body.textContent = "";
    const st = S.appState || {};
    const r = st.report || {};
    const cases = st.cases || [];
    const warn = el("div", "warning");
    warn.textContent = r.compliance_claim ? t("reportWarnBad") : (r.template_warning || t("reportWarn"));
    body.appendChild(warn);
    const genRow = el("div", "report-gen");
    const genBtn = el("button", "btn btn-gen", t("exportBtn"));
    genBtn.addEventListener("click", async () => {
      if (!window.confirm(t("exportConfirm"))) return;
      genBtn.disabled = true;
      try {
        await downloadReport();
        genBtn.textContent = `${t("exportDone")} ✓`;
        setTimeout(() => { genBtn.textContent = t("exportBtn"); genBtn.disabled = false; }, 2500);
      } catch (err) {
        genBtn.textContent = LANG === "de" ? "Fehler — erneut versuchen" : "Failed — retry";
        setTimeout(() => { genBtn.textContent = t("exportBtn"); genBtn.disabled = false; }, 2500);
        if (!S.reviewer) { setMode(S.mode === "fullscreen" ? "fullscreen" : "overlay"); }
      }
    });
    genRow.appendChild(genBtn);
    // Regenerate (owner request 2026-10-27): rerun the deterministic review
    // pipeline (POST /api/review/run), then refresh every view from the store.
    const regenBtn = el("button", "btn ghost-btn", t("reportRegen"));
    regenBtn.type = "button";
    regenBtn.addEventListener("click", async () => {
      regenBtn.disabled = true;
      regenBtn.textContent = t("reportRegenBusy");
      try {
        const res = await fetch("/api/review/run", {
          method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok || body.ok === false) throw new Error(body.error || `HTTP ${res.status}`);
        await loadState();
        regenBtn.textContent = `${t("reportRegenDone")} ✓`;
      } catch (err) {
        regenBtn.textContent = LANG === "de" ? "Fehler — erneut versuchen" : "Failed — retry";
      }
      setTimeout(() => { regenBtn.textContent = t("reportRegen"); regenBtn.disabled = false; }, 2500);
    });
    genRow.appendChild(regenBtn);
    genRow.appendChild(el("span", "report-gen-note", t("exportNote")));
    body.appendChild(genRow);

    // Kopf card — what report am I looking at
    const head = el("div", "card");
    head.appendChild(el("h2", "", LANG === "de" ? "Prüfbericht" : "Review report"));
    if (r.id) head.appendChild(el("p", "card-meta", `${LANG === "de" ? "Bericht-ID" : "Report ID"}: ${r.id}`));
    body.appendChild(head);

    // Integrität & Siegel — the live tamper-evidence moment (USP, made visible)
    const sealCard = el("div", "card");
    sealCard.appendChild(el("h2", "", LANG === "de" ? "Integrität & Siegel" : "Integrity & seal"));
    sealCard.appendChild(el("p", "card-meta", LANG === "de"
      ? "Der Prüfbericht kann bei der ITSG-Bestätigungsstelle (Seal-Dienst) quittiert werden: Nur der SHA-256-Fingerabdruck geht dorthin. Empfänger können später in Sekunden nachweisen, ob der Bericht nach der Quittung verändert wurde — oder nicht."
      : "The report can be receipted at the ITSG receipt office (seal service): only the SHA-256 fingerprint goes there. Recipients can later prove within seconds whether the report was altered after receipt — or not."));
    const sealRow = el("div", "seal-row");
    const sealBtn = el("button", "btn btn-gen", LANG === "de" ? "Siegel anfordern" : "Request seal");
    const tamperBtn = el("button", "btn", LANG === "de" ? "Manipulation simulieren" : "Simulate tampering");
    tamperBtn.title = LANG === "de"
      ? "Verändert EIN Byte in einer KOPIE des Berichts und lässt die Quittung dagegen prüfen. Das Original im Store bleibt unverändert."
      : "Flips ONE byte in a COPY of the report and verifies the receipt against it. The store original is never modified.";
    const sealOut = el("div", "seal-out");
    const sealCall = async (action, busyText) => {
      sealBtn.disabled = true; tamperBtn.disabled = true;
      sealOut.textContent = "";
      sealOut.appendChild(el("span", "seal-pending", busyText));
      try {
        const res = await fetch("/api/report/seal", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = await res.json();
        sealOut.textContent = "";
        if (!res.ok || !data.ok) { sealOut.appendChild(el("span", "seal-line seal-bad", data.error || `HTTP ${res.status}`)); return; }
        if (data.result === "GENUINE") {
          const chip = el("span", "badge badge-pass",
            LANG === "de" ? `Quittung — GENUINE (Bericht unverändert)` : `Receipt — GENUINE (report unaltered)`);
          chip.title = LANG === "de"
            ? `Die Prüfberichts-Datei entspricht exakt dem bei der Bestätigungsstelle hinterlegten Fingerabdruck (Lauf ${data.run_id || "—"}). Jedes nachträgliche Byte würde bei der Verifikation auffallen.`
            : `The report file exactly matches the fingerprint deposited at the receipt office (run ${data.run_id || "—"}).`;
          chip.classList.add("has-tip");
          sealOut.appendChild(chip);
          if (data.receipt_seq) chip.title = chip.title.replace(/\.$/, ` — Quittung Nr. ${data.receipt_seq}.`);
          if (data.already_sealed && data.note) sealOut.appendChild(el("p", "card-meta", data.note));
        } else if (data.result === "TAMPERED") {
          const banner = el("div", "warning seal-bad",
            LANG === "de" ? "TAMPERED — der Bericht wurde nach der Quittung verändert. Jeder Empfänger erkennt das sofort anhand der Quittung." :
                            "TAMPERED — the report was altered after the receipt. Any recipient detects this immediately.");
          sealOut.appendChild(banner);
          if (data.note) sealOut.appendChild(el("p", "card-meta", data.note));
        } else {
          sealOut.appendChild(el("span", "seal-line", `${data.result}: ${data.reason || ""}`));
        }
      } catch (err) {
        sealOut.textContent = "";
        sealOut.appendChild(el("span", "seal-line seal-bad", String(err)));
      } finally {
        sealBtn.disabled = false; tamperBtn.disabled = false;
        loadState();  // the receipt chip in this card comes from /api/state
      }
    };
    sealBtn.addEventListener("click", () => sealCall("seal", LANG === "de" ? "Fordere Quittung an …" : "Requesting receipt …"));
    tamperBtn.addEventListener("click", () => sealCall("tamper-demo", LANG === "de" ? "Prüfe manipulierte Kopie …" : "Verifying tampered copy …"));
    sealRow.appendChild(sealBtn); sealRow.appendChild(tamperBtn);
    sealCard.appendChild(sealRow);
    sealCard.appendChild(sealOut);
    if (st.seal?.present) {
      const chip = el("span", "badge badge-pass", LANG === "de" ? `Quittung vorhanden (Lauf ${st.seal.run_id || "—"})` : `Receipt present (run ${st.seal.run_id || "—"})`);
      sealCard.appendChild(chip);
    }
    body.appendChild(sealCard);

    // outcomes card — every case with its verdict, in order
    const outcomes = el("div", "card");
    outcomes.appendChild(el("h2", "", LANG === "de" ? "Ergebnisse im Überblick" : "Results at a glance"));
    for (const c of cases) {
      // Cross-link (T10-049): a report row opens its case — the report is no
      // longer a dead end. Button semantics for keyboard reachability.
      const row = el("button", "card-head report-row");
      row.type = "button";
      row.setAttribute("aria-label", `${c.id} ${t("openCaseAria")}`);
      row.appendChild(el("span", "card-title", c.id || "—"));
      row.appendChild(badge(c.status || "NOT_EVALUATED"));
      row.addEventListener("click", () => clientExec.select_case({ case_id: c.id }));
      outcomes.appendChild(row);
      const hr = humanReason(c);
      const line = [hr.intro, hr.body].filter(Boolean).join(" ");
      if (line) outcomes.appendChild(el("p", "card-meta", line));
    }
    if (!cases.length) outcomes.appendChild(el("p", "empty", t("emptyReport")));
    body.appendChild(outcomes);

    // recommended actions card — deterministic, mirrors the PDF
    const recs = recommendedActions(cases);
    if (recs.length) {
      const rec = el("div", "card");
      rec.appendChild(el("h2", "", LANG === "de" ? "Empfohlene Maßnahmen" : "Recommended actions"));
      const ol = el("ol", "report-recs");
      for (const r2 of recs) ol.appendChild(el("li", "", r2));
      rec.appendChild(ol);
      body.appendChild(rec);
    }

    // conformance card — structured template checks
    const card = el("div", "card");
    card.appendChild(el("h2", "", LANG === "de" ? "Konformitätsprüfungen (Vorlagenstruktur)" : "Conformance checks (template structure)"));
    const conf = r.conformance || [];
    if (!conf.length) card.appendChild(el("p", "empty", t("emptyReport")));
    for (const c of conf) {
      const row = el("div", "card-head");
      row.appendChild(el("span", "card-title", c.check_id || c.id || (LANG === "de" ? "Strukturprüfung" : "Structure check")));
      row.appendChild(badge(c.status || "?"));
      card.appendChild(row);
      if (c.reason) card.appendChild(el("p", "card-meta", c.reason));
    }
    body.appendChild(card);
  }

  function renderSources() {
    const body = $("sources-body"); body.textContent = "";
    const st = S.appState || {};
    const src = st.source;
    const tpl = st.template;
    if (src) {
      const card = el("div", "card"); card.id = `src-${src.id || ""}`;
      const head = el("div", "card-head");
      head.appendChild(el("span", "card-title", src.id || "Quelle"));
      const sb = el("span", `badge ${src.status === "approved" ? "badge-pass" : "badge-not-evaluated"}`,
        src.status === "approved" ? (LANG === "de" ? "Freigegeben" : "Approved") : statusLabel(src.status));
      sb.title = LANG === "de"
        ? "Ein Mensch hat Herkunft, Herausgeber, Version und Prüfsumme dieser Quelle verifiziert und die Freigabe mit Name und Begründung protokolliert — erst dann darf sie in die Prüfung einfließen."
        : "A human verified origin, issuer, version and checksum and recorded the approval with name and rationale before this source may enter the review.";
      sb.classList.add("has-tip");
      head.appendChild(sb);
      card.appendChild(head);
      card.appendChild(el("p", "card-meta", `${src.title || ""} · ${src.issuer || ""} · ${LANG === "de" ? "Version" : "version"} ${src.version || "?"}`));
      const kv = el("dl", "kv");
      kv.appendChild(el("dt", "", LANG === "de" ? "Gültig ab" : "Valid from"));
      const vf = el("dd", "", fmtDateTime(src.valid_from ? src.valid_from : "") || String(src.valid_from ?? "—"));
      kv.appendChild(vf);
      kv.appendChild(el("dt", "", LANG === "de" ? "Prüfsumme (SHA-256)" : "Checksum (SHA-256)"));
      const dd = el("dd", "mono", src.checksum ? (LANG === "de" ? "verifiziert — klicken zum Kopieren" : "verified — click to copy") : "—");
      if (src.checksum) {
        dd.title = String(src.checksum);
        dd.style.cursor = "copy";
        dd.addEventListener("click", () => {
          navigator.clipboard?.writeText(String(src.checksum)).then(() => {
            dd.textContent = LANG === "de" ? "kopiert ✓" : "copied ✓";
            setTimeout(() => { dd.textContent = LANG === "de" ? "verifiziert — klicken zum Kopieren" : "verified — click to copy"; }, 2000);
          }).catch(() => {});
        });
      }
      kv.appendChild(dd);
      card.appendChild(kv);
      // Cross-link (T10-049): the source opens its law text in the Regelwerke
      // browser — sources and regulations stop being separate worlds.
      const regBtn = el("button", "btn ghost-btn src-reg-btn", t("sourcesOpenReg"));
      regBtn.type = "button";
      regBtn.addEventListener("click", () => clientExec.open_regulation({ query: src.title || src.id || "" }));
      card.appendChild(regBtn);
      body.appendChild(card);
    }
    if (tpl) {
      const card = el("div", "card");
      const head = el("div", "card-head");
      head.appendChild(el("span", "card-title", tpl.id || "Vorlage"));
      const tb = el("span", "badge badge-neutral", LANG === "de" ? "SYNTHETISCHE VORLAGE" : "SYNTHETIC TEMPLATE");
      tb.title = LANG === "de"
        ? "Es existiert keine gesetzlich vorgeschriebene Berichtsform (§ 95b SGB IV schreibt keine Vorlage vor). Diese Demo-Vorlage ist deutlich als synthetisch gekennzeichnet; die Konformitätsaussage bleibt daher NEIN."
        : "No statutory report form exists (§ 95b SGB IV prescribes none). This demo template is clearly labeled synthetic; the conformance claim stays NO.";
      tb.classList.add("has-tip");
      head.appendChild(tb);
      card.appendChild(head);
      card.appendChild(el("p", "card-meta",
        `${LANG === "de" ? "Version" : "Version"} ${tpl.version || "?"} · ${LANG === "de" ? "Keine amtliche Formular-ID hinterlegt (synthetische Vorlage)" : "No official form ID registered (synthetic template)"}`));
      body.appendChild(card);
    }

    // AI governance card — the differentiator, made legible
    const gov = el("div", "card");
    gov.appendChild(el("h2", "", LANG === "de" ? "KI-Governance (Rollen & Gate-Entscheidungen)" : "AI governance (roles & gate decisions)"));
    gov.appendChild(el("p", "card-meta", LANG === "de"
      ? "SÜSIE nutzt getrennte KI-Rollen mit festen Berechtigungen. Kein Modell darf eigene Ergebnisse freigeben; jede Freigabe ist eine menschliche Entscheidung."
      : "SÜSIE uses separated AI roles with fixed permissions. No model may approve its own output; every approval is a human decision."));
    const govList = el("ul", "gov-list");
    const b = st.backend || {};
    const items = LANG === "de" ? [
      "Extraktor (GLM-Flash): schlägt Anforderungen vor — ohne zitierbare Fundstelle unterlässt er die Aussage (Cite-or-Abstain).",
      "Designer (Kolibri-1, anderes Modell): entwirft Testfall-Kandidaten.",
      "Challenger (unabhängig): sucht Lücken und unbelegte Annahmen — nur Empfehlung, nie Freigabe.",
      `Autor ≠ Prüfer erzwungen · ${b.gates ?? "—"} menschliche Freigaben protokolliert · ${b.agent_runs ?? "—"} KI-Läufe im Audit-Trail.`,
    ] : [
      "Extractor (GLM-Flash): proposes requirements — must cite the passage or abstain.",
      "Designer (Kolibri-1, a different model): drafts test-case candidates.",
      "Challenger (independent): probes for gaps and unsupported assumptions — recommendation only.",
      `Author ≠ reviewer enforced · ${b.gates ?? "—"} human approvals recorded · ${b.agent_runs ?? "—"} AI runs in the audit trail.`,
    ];
    for (const it of items) govList.appendChild(el("li", "", it));
    gov.appendChild(govList);
    body.appendChild(gov);
    if (!src && !tpl) body.appendChild(el("div", "empty", t("emptySources")));
  }

  // footer footnotes (T10-044, owner directive): the trust pills moved out of the
  // header into the bottom bar, next to the synthetic-data note. The "local"
  // wording matches the privacy panel: the store and audit log stay local; the
  // only outward channels are the airlock-protected LLM context and the seal
  // fingerprint.
  function renderTrust() {
    const strip = $("foot-notes");
    if (!strip) return;
    strip.textContent = "";
    const st = S.appState || {};
    const b = st.backend || {};
    const h = st.harness;
    // icon + short label; the full sentence lives in the flyover (title) — T10-045
    const ICONS = {
      check: '<circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M6.8 10.2l2.2 2.2 4.2-4.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      lock: '<rect x="5" y="9" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M7.5 9V7a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/>',
      shield: '<path d="M10 2.5 16 5v4.5c0 4.1-2.6 7-6 8.1-3.4-1.1-6-4-6-8.1V5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.2 10l2 2 3.6-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
      eyes: '<circle cx="7" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="13.5" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.5"/>',
    };
    const items = [];
    if (h) items.push({ icon: "check", label: `${t("footAutoLabel")} ${t("footAuto", h.correct, h.cases)}`, title: t("footAutoTitle") });
    items.push(
      { icon: "lock", label: t("footLocal"), title: t("footLocalTitle") },
      { icon: "shield", label: t("footFail"), title: t("footFailTitle") },
      { icon: "eyes", label: t("footEyes", b.gates ?? "—"), title: t("footEyesTitle") },
    );
    for (const it of items) {
      const chip = el("span", "foot-note has-tip");
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 20 20");
      svg.setAttribute("aria-hidden", "true");
      svg.innerHTML = ICONS[it.icon];  // static literal, never user data
      chip.appendChild(svg);
      chip.appendChild(el("span", "foot-note-label", it.label));
      chip.title = it.title;
      strip.appendChild(chip);
    }
  }

  // =========================================================================
  // Governance views (T10-049 Wave R): Freigaben (pending human decisions),
  // Verlauf (timeline), Story-Suiten. Labels are human acts — gate IDs are
  // storage metadata only (spec §5.6). Data: /api/governance + /api/state.
  // =========================================================================
  const GATE_ACT = {
    G0: "actSource", G1: "actRequirements", G2: "actTranslation", G3: "actCriteria",
    G4: "actReviewStep", G5: "actConformance", G6: "actRelease",
  };
  // Pending-card actions the UI can carry end to end today. "record_g0"
  // joins when T10-047 lands the gate action, "record_draft_gate" with
  // T10-050 — until then those cards render read-only with an honest hint.
  const GOV_ACTIONS = new Set([]);
  // Source status vocabulary → human label (copy rule: raw statuses are
  // storage identifiers, never UI copy) — merged into STATUS_LABELS above;
  // statusLabel (line ~393) covers it.

  async function loadGovernance() {
    try {
      const r = await fetch("/api/governance");
      const body = await r.json();
      S.gov = body.ok ? body : { ok: false, error: body.error || "governance unavailable", pending: [], gates: [], events: [] };
    } catch {
      S.gov = { ok: false, error: "offline", pending: [], gates: [], events: [] };
    }
    withViewGuard("freigaben", renderFreigaben);
    withViewGuard("verlauf", renderVerlauf);
  }

  function renderFreigaben() {
    const body = $("freigaben-body"); body.textContent = "";
    const gov = S.gov;
    if (!gov || (!gov.ok && gov.error === "offline")) {
      body.appendChild(el("div", "empty", t("govOffline")));
      return;
    }
    const pending = (gov && gov.pending) || [];
    if (!pending.length) {
      body.appendChild(el("div", "empty", t("freigabenNone")));
      return;
    }
    for (const item of pending) {
      const card = el("div", "card freigaben-card");
      const head = el("div", "card-head");
      head.appendChild(el("span", "card-title", t(item.label_key)));
      head.appendChild(el("span", "card-ref", item.id));
      card.appendChild(head);
      if (item.detail) card.appendChild(el("p", "card-meta", item.detail));
      // A named human decides — typed name + rationale, consistent with the
      // no-login decision (self-approval stays allowed, the audit says so).
      const nameIn = el("input", "gov-input");
      nameIn.type = "text"; nameIn.placeholder = t("yourName"); nameIn.setAttribute("aria-label", t("yourName"));
      const whyIn = el("input", "gov-input");
      whyIn.type = "text"; whyIn.placeholder = t("govRationalePh"); whyIn.setAttribute("aria-label", t("govRationalePh"));
      const row = el("div", "gov-row");
      row.appendChild(nameIn); row.appendChild(whyIn);
      card.appendChild(row);
      const wired = GOV_ACTIONS.has(item.proposed_action);
      const act = el("button", "btn case-act gov-act");
      act.type = "button";
      act.disabled = !wired;
      act.textContent = wired ? t("govDecideBtn") : t("govActionPending");
      if (!wired) {
        act.title = t("govActionPendingTitle");
      } else {
        act.addEventListener("click", async () => {
          const reviewer = nameIn.value.trim();
          const rationale = whyIn.value.trim();
          if (!reviewer || !rationale) { flash(card); nameIn.classList.toggle("needs-input", !reviewer); whyIn.classList.toggle("needs-input", !rationale); return; }
          act.disabled = true;
          try {
            // propose → explicit human confirm → single-use token execute
            const pr = await fetch("/api/action/propose", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ session_id: S.sessionId, action_id: item.proposed_action,
                                     params: { id: item.id, reviewer, rationale, decision: "approve" } }),
            });
            const pbody = await pr.json();
            if (!pr.ok || pbody.ok === false || !pbody.confirm_token) {
              throw new Error(pbody.error || "proposal refused");
            }
            if (!window.confirm(`${t("govConfirmPrefix")} "${item.detail || item.id}" — ${reviewer}`)) {
              act.disabled = false; return;
            }
            await invoke(item.proposed_action,
              { id: item.id, reviewer, rationale, decision: "approve", gate: pbody.action?.params?.gate },
              pbody.confirm_token);
            await loadGovernance();
          } catch (err) {
            act.textContent = LANG === "de" ? "Fehler — erneut versuchen" : "Failed — retry";
            setTimeout(() => { act.textContent = t("govDecideBtn"); act.disabled = false; }, 2500);
          }
        });
      }
      card.appendChild(act);
      body.appendChild(card);
    }
  }

  function govEventLabel(event) {
    const kind = String(event.kind || "");
    if (kind === "gate") return t("evGate");
    if (kind === "agent_run") return t("evAgentRun");
    return t("evChange");
  }

  function renderVerlauf() {
    const body = $("verlauf-body"); body.textContent = "";
    const gov = S.gov;
    if (!gov || (!gov.ok && gov.error === "offline")) {
      body.appendChild(el("div", "empty", t("govOffline")));
      return;
    }
    // Human protocol (owner review 2026-10-27): decisions and AI runs first;
    // raw store writes are grouped per kind and minute — never a flat event dump.
    const filterSel = el("select", "gov-filter");
    filterSel.setAttribute("aria-label", t("verlaufFilter"));
    for (const [val, key] of [["decisions", "verlaufDecisions"], ["changes", "evChange"], ["all", "verlaufAll"]]) {
      const opt = el("option", "", t(key));
      opt.value = val;
      filterSel.appendChild(opt);
    }
    // honest default: decisions when any exist, otherwise the change summary
    const hasDecisions = (gov.gates || []).length > 0 ||
      (gov.events || []).some((ev) => ev.kind === "gate" || ev.kind === "agent_run");
    if (!S.verlaufFilter) S.verlaufFilter = hasDecisions ? "decisions" : "changes";
    filterSel.value = S.verlaufFilter;
    filterSel.addEventListener("change", () => { S.verlaufFilter = filterSel.value; S.verlaufShown = 200; renderVerlauf(); });
    const bar = el("div", "gov-bar");
    bar.appendChild(filterSel);
    body.appendChild(bar);

    const rows = [];
    for (const gate of (gov.gates || []).slice()) {
      rows.push({
        at: gate.decided_at || "",
        label: `${t(gate.label_key || GATE_ACT[gate.gate] || "evGate")} — ${gate.reviewer || ""}`,
        detail: gate.rationale || "",
        ref: gate.id || "",
        kind: "gate",
      });
    }
    // group raw store writes: same kind + same minute → one count line
    const changeGroups = new Map();
    for (const ev of (gov.events || []).slice()) {
      if (ev.kind === "gate" || ev.kind === "agent_run") {
        rows.push({
          at: ev.at || "",
          label: govEventLabel(ev),
          detail: `${ev.kind} · ${ev.action}`,
          ref: ev.id || "",
          kind: ev.kind,
        });
        continue;
      }
      const minute = String(ev.at || "").slice(0, 16);
      const key = `${ev.kind}·${minute}`;
      const grp = changeGroups.get(key) || { at: ev.at || "", kind: ev.kind, n: 0, ids: [] };
      grp.n += 1;
      if (grp.ids.length < 3) grp.ids.push(ev.id || "");
      changeGroups.set(key, grp);
    }
    for (const grp of changeGroups.values()) {
      rows.push({
        at: grp.at,
        label: grp.n === 1
          ? (LANG === "de" ? "1 Store-Änderung" : "1 store change")
          : t("evChangesGrouped").replace("{n}", String(grp.n)),
        detail: `${grp.kind}${grp.ids.length ? ` · ${grp.ids.join(", ")}` : ""}`,
        ref: "",
        kind: "other",
      });
    }
    rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const filter = S.verlaufFilter || "decisions";
    const shown = rows.filter((r) => filter === "all" ? true
      : filter === "decisions" ? (r.kind === "gate" || r.kind === "agent_run") : r.kind === "other");
    if (!shown.length) {
      body.appendChild(el("div", "empty", t("verlaufEmpty")));
      return;
    }
    const cap = S.verlaufShown || 200;
    const list = el("div", "gov-timeline");
    for (const row of shown.slice(0, cap)) {
      const item = el("div", "gov-event");
      item.appendChild(el("span", "gov-time", fmtDateTime(row.at) || row.at || "—"));
      item.appendChild(el("span", "gov-label", row.label));
      if (row.ref) item.appendChild(el("span", "card-ref", row.ref));
      if (row.detail) {
        item.appendChild(el("p", "gov-detail", row.detail));
      }
      list.appendChild(item);
    }
    body.appendChild(list);
    if (shown.length > cap) {
      const more = el("button", "btn ghost-btn gov-more", t("verlaufMore"));
      more.type = "button";
      more.addEventListener("click", () => { S.verlaufShown = cap + 200; renderVerlauf(); });
      body.appendChild(more);
    }
  }


  // =========================================================================
  // "Unter der Haube" (T10-055): the architecture illustration — three lanes
  // (Rules / Tests / Verdict) as an authored, bilingual SVG in SÜSIE tokens.
  // Pure presentation: no data, no endpoints, nothing executed. Hovering a
  // lane focuses it (dim others, tint its flow, march the dashed rework
  // loops); prefers-reduced-motion keeps the color focus without movement.
  // =========================================================================
  const TECH = (() => {
    const X0 = 150, NODE_W = 146, NODE_H = 54, PITCH_X = 174, LANE_Y = [46, 240, 434];
    // kind: ai = KI entwirft · code = Code rechnet und prüft ·
    // person = der Mensch entscheidet (Raute) · approved = Freigabe-Ergebnis
    const lanes = [
      { key: "techLaneRules", nodes: [
        { kind: "ai", de: ["Passende Abschnitte", "finden"], en: ["Find relevant", "sections"] },
        { kind: "ai", de: ["Kriterien +", "Codeprüfung schreiben"], en: ["Write criteria", "+ code check"] },
        { kind: "code", de: ["Zitate in der", "Quelle prüfen"], en: ["Check quotes", "in the source"] },
        { kind: "ai", de: ["Fehlende Regeln", "suchen"], en: ["Find missing", "rules"] },
        { kind: "person", de: ["Regeln", "prüfen"], en: ["Review", "rules"] },
        { kind: "approved", de: ["Kriterien", "freigegeben"], en: ["Approved", "criteria"] },
      ]},
      { key: "techLaneTests", nodes: [
        { kind: "approved", de: ["Freigegebene", "Kriterien übernehmen"], en: ["Take approved", "criteria"] },
        { kind: "ai", de: ["Testfälle", "schreiben"], en: ["Write test", "cases"] },
        { kind: "code", de: ["Erwartungswerte", "festlegen"], en: ["Expected", "values"] },
        { kind: "ai", de: ["Fehlende Tests", "suchen"], en: ["Find missing", "tests"] },
        { kind: "person", de: ["Tests", "prüfen"], en: ["Review", "tests"] },
        { kind: "approved", de: ["Tests", "freigegeben"], en: ["Approved", "tests"] },
      ]},
      { key: "techLaneVerdict", nodes: [
        { kind: "code", de: ["Softwareausgabe", "einlesen"], en: ["Read payroll", "output file"] },
        { kind: "code", de: ["Mit Erwartung", "vergleichen"], en: ["Compare with", "expected"] },
        { kind: "ai", de: ["Zweifel", "markieren"], en: ["Flag", "doubts"] },
        { kind: "ai", de: ["Verständliche", "Zusammenfassung"], en: ["Plain", "summary"] },
        { kind: "person", de: ["Einmal", "signieren"], en: ["Sign", "once"] },
        { kind: "code", de: ["Bericht", "je Fall"], en: ["Report", "per case"] },
      ]},
    ];
    const nodeCX = (i) => X0 + i * PITCH_X + NODE_W / 2;
    return { X0, NODE_W, NODE_H, PITCH_X, LANE_Y, lanes, nodeCX };
  })();

  function renderTechnik() {
    const body = $("technik-body"); if (!body) return;
    body.textContent = "";
    body.appendChild(el("h2", "tech-headline", t("techHeadline")));
    body.appendChild(el("p", "tech-intro", t("techIntro")));

    const NS = "http://www.w3.org/2000/svg";
    const s = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, String(v));
      if (parent) parent.appendChild(n);
      return n;
    };
    const svg = s("svg", { class: "tech-svg", viewBox: "0 0 1180 630", role: "img",
      "aria-label": `${t("techHeadline")} — ${t("technikSub")}` });
    body.appendChild(svg);

    const arrow = (parent, d, delay) => {
      const h = s("path", { class: "flow-head fade-late", d }, parent);
      h.style.animationDelay = `${delay}ms`;
      return h;
    };

    TECH.lanes.forEach((lane, li) => {
      const base = li * 220;                      // entrance stagger per lane
      const g = s("g", { class: "lane" }, svg);
      const y = TECH.LANE_Y[li], cy = y + TECH.NODE_H / 2;

      const lbl = s("text", { class: "lane-label", x: 12, y: cy + 4 }, g);
      lbl.textContent = `${li + 1} · ${t(lane.key)}`;

      lane.nodes.forEach((nd, ni) => {
        const cx = TECH.nodeCX(ni), x = TECH.X0 + ni * TECH.PITCH_X;
        const node = s("g", { class: `node k-${nd.kind}` }, g);
        node.style.animationDelay = `${base + ni * 55}ms`;
        const inner = s("g", { class: "node-inner" }, node);
        if (nd.kind === "person") {
          s("path", { class: "node-box",
            d: `M ${cx} ${cy - 30} L ${cx + 44} ${cy} L ${cx} ${cy + 30} L ${cx - 44} ${cy} Z` }, inner);
        } else {
          s("rect", { class: "node-box", x, y, width: TECH.NODE_W, height: TECH.NODE_H, rx: 12 }, inner);
        }
        const txt = s("text", { class: "node-txt", x: cx, y: cy - 2 }, inner);
        const l1 = s("tspan", { x: cx }, txt); l1.textContent = nd[LANG][0];
        const l2 = s("tspan", { x: cx, dy: 15 }, txt); l2.textContent = nd[LANG][1];

        if (ni < lane.nodes.length - 1) {          // solid arrow to the next node
          const x1 = x + TECH.NODE_W, x2 = x1 + TECH.PITCH_X - TECH.NODE_W, fd = base + ni * 55 + 160;
          const p = s("path", { class: "flow draw", d: `M ${x1} ${cy} H ${x2 - 5}`, pathLength: 1 }, g);
          p.style.animationDelay = `${fd}ms`;
          arrow(g, `M ${x2 - 8} ${cy - 4.5} L ${x2} ${cy} L ${x2 - 8} ${cy + 4.5}`, fd + 140);
        }
      });

      if (li < 2) {
        // dashed rework loop: review diamond → back to the drafting step
        const dCX = TECH.nodeCX(4), tCX = TECH.nodeCX(1), yLoop = y + 96;
        s("path", { class: "loop fade-late",
          d: `M ${dCX} ${cy + 30} V ${yLoop} H ${tCX} V ${y + 62}` }, g);
        arrow(g, `M ${tCX - 4.5} ${y + 62} L ${tCX} ${y + 54} L ${tCX + 4.5} ${y + 62}`, base + 640);
        const note = s("text", { class: "tech-note fade-late", x: (dCX + tCX) / 2, y: yLoop - 6 }, g);
        note.textContent = t("techLoopRewrite");
        note.style.animationDelay = `${base + 660}ms`;
        // hand-off into the next lane: the approved result travels to its start
        const yNext = TECH.LANE_Y[li + 1];
        const p = s("path", { class: "flow draw",
          d: `M ${TECH.nodeCX(5)} ${y + TECH.NODE_H} V ${yNext - 44} H ${TECH.nodeCX(0)} V ${yNext - 8}`,
          pathLength: 1 }, g);
        p.style.animationDelay = `${base + 420}ms`;
        arrow(g, `M ${TECH.nodeCX(0) - 4.5} ${yNext - 8} L ${TECH.nodeCX(0)} ${yNext} L ${TECH.nodeCX(0) + 4.5} ${yNext - 8}`,
          base + 620);
      } else {
        // verdict lane: broken-file stop note + dispute loop back to the tests lane
        const warn = s("text", { class: "tech-note fade-late", x: TECH.X0, y: y + 74 }, g);
        warn.style.textAnchor = "start";   // left-aligned: centering would clip at the viewBox edge
        warn.textContent = t("techBrokenNote");
        warn.style.animationDelay = `${base + 660}ms`;
        const dCX = TECH.nodeCX(4), yDispute = y + 112, cyPrev = TECH.LANE_Y[1] + TECH.NODE_H / 2;
        s("path", { class: "loop fade-late",
          d: `M ${dCX} ${cy + 30} V ${yDispute} H 132 V ${cyPrev} H 140` }, g);
        arrow(g, `M 142 ${cyPrev - 4.5} L 150 ${cyPrev} L 142 ${cyPrev + 4.5}`, base + 640);
        const note = s("text", { class: "tech-note fade-late", x: (dCX + 132) / 2, y: yDispute - 6 }, g);
        note.textContent = t("techDisputeNote");
        note.style.animationDelay = `${base + 660}ms`;
      }
    });

    // legend: the three actors
    const leg = s("g", { class: "legend fade-late" }, svg);
    leg.style.animationDelay = "900ms";
    [["k-ai", "techLegendAi", 150], ["k-code", "techLegendCode", 400], ["k-person", "techLegendPerson", 700]]
      .forEach(([cls, key, lx]) => {
        s("rect", { class: `node-box ${cls}`, x: lx, y: 596, width: 22, height: 15, rx: 5 }, leg);
        const tx = s("text", { class: "legend-txt", x: lx + 30, y: 608 }, leg);
        tx.textContent = t(key);
      });
  }


  // =========================================================================
  // Regulations browser (T10-045): browse + search the indexed law corpus,
  // read a section as markdown or the original PDF. Data comes only from
  // /api/regulations* (containment-checked server side).
  // =========================================================================

  // Escape FIRST, then add markup — the chunk text is untrusted, so the only
  // tags present are the ones this function generates.
  function mdToSafeHtml(md) {
    const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const fmt = (s) => s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // strip the YAML front matter the generator prepends (shown in the header instead)
    const body = String(md).replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, "");
    const html = [];
    let listOpen = false;
    let para = [];
    let fence = false;
    const flushPara = () => { if (para.length) { html.push("<p>" + fmt(para.join("<br>")) + "</p>"); para = []; } };
    const closeList = () => { if (listOpen) { html.push("</ul>"); listOpen = false; } };
    for (const raw of esc(body).split(/\r?\n/)) {
      const line = raw.trimEnd();
      if (/^```/.test(line)) {  // fenced block: verbatim, monospace
        flushPara(); closeList();
        html.push(fence ? "</pre>" : '<pre class="md-fence">');
        fence = !fence;
        continue;
      }
      if (fence) { html.push(line); continue; }
      const h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) { flushPara(); closeList(); html.push(`<h${h[1].length}>${fmt(h[2])}</h${h[1].length}>`); continue; }
      if (/^\s*[-*]\s+/.test(line)) {
        flushPara();
        if (!listOpen) { html.push("<ul>"); listOpen = true; }
        html.push(`<li>${fmt(line.replace(/^\s*[-*]\s+/, ""))}</li>`);
        continue;
      }
      if (/^\|/.test(line)) { flushPara(); closeList(); html.push(`<div class="md-line">${line}</div>`); continue; }
      if (!line.trim()) { flushPara(); closeList(); continue; }
      closeList();
      para.push(line);
    }
    flushPara();
    closeList();
    return html.join("");
  }

  async function loadRegulations() {
    S.regLoaded = true;
    try {
      const r = await fetch("/api/regulations");
      const body = await r.json();
      S.regDocs = body.ok ? body.docs : [];
    } catch {
      S.regDocs = [];
    }
    renderRegulations();
  }

  async function regRunSearch() {
    const q = S.regQ.trim();
    if (!q && !S.regDoc) { S.regResults = null; renderRegResults(); return; }
    const params = new URLSearchParams({ q: q || "*", limit: "200" });
    if (S.regDoc) params.set("doc", S.regDoc);
    try {
      const r = await fetch(`/api/regulations/search?${params}`);
      const body = await r.json();
      S.regResults = body.ok ? body.results : [];
    } catch {
      S.regResults = [];
    }
    renderRegResults();
  }

  async function regOpenChunk(path) {
    try {
      const r = await fetch(`/api/regulations/chunk?path=${encodeURIComponent(path)}`);
      const body = await r.json();
      if (body.ok) { S.regSelected = body; S.regPdf = null; renderRegReader(); return; }
    } catch { /* reader stays empty, honest error below */ }
    S.regSelected = { error: true };
    renderRegReader();
  }

  function renderRegShell() {
    const root = $("reg-body");
    if (!root || root.dataset.init) return;
    root.dataset.init = "1";
    root.textContent = "";
    const bar = el("div", "reg-toolbar");
    const search = el("input", "reg-search");
    search.type = "search";
    search.placeholder = t("regSearchPh");
    search.setAttribute("aria-label", t("regSearchPh"));
    let debounce = 0;
    search.addEventListener("input", () => {
      S.regQ = search.value;
      clearTimeout(debounce);
      debounce = setTimeout(regRunSearch, 200);
    });
    bar.appendChild(search);
    const select = el("select", "reg-doc-select");
    select.setAttribute("aria-label", t("regAllDocs"));
    select.addEventListener("change", () => {
      S.regDoc = select.value;
      regRunSearch();
    });
    bar.appendChild(select);
    // Reader is full-width by default (owner decision 2026-10-27) —
    // the doc list stays as a slim index rail; no toggle.
    root.classList.add("reader-expanded");
    root.appendChild(bar);
    const cols = el("div", "reg-cols");
    cols.appendChild(el("div", "reg-results", ""));
    cols.appendChild(el("div", "reg-reader", ""));
    root.appendChild(cols);
  }

  function renderRegulations() {
    renderRegShell();
    const select = document.querySelector("#reg-body .reg-doc-select");
    if (select) {
      select.textContent = "";
      const all = el("option", "", `${t("regAllDocs")} (${S.regDocs.length})`);
      all.value = "";
      select.appendChild(all);
      for (const d of S.regDocs) {
        const opt = el("option", "", `${d.doc} — ${d.title} (${d.chunks} ${t("regChunks")})`);
        opt.value = d.doc;
        select.appendChild(opt);
      }
      select.value = S.regDoc;
    }
    renderRegResults();
    renderRegReader();
  }

  function renderRegResults() {
    const box = document.querySelector("#reg-body .reg-results");
    if (!box) return;
    box.textContent = "";
    if (!S.regDocs.length) {
      box.appendChild(el("div", "empty", LANG === "de"
        ? "Regelkorpus nicht erreichbar — Bridge neu starten."
        : "Regulation corpus unreachable — restart the bridge."));
      return;
    }
    if (!S.regResults) {
      // no query yet: browse by document — the corpus IS the navigation
      if (!S.regDoc) {
        const docs = el("div", "reg-doc-list");
        for (const d of S.regDocs) {
          const item = el("button", "reg-doc");
          item.type = "button";
          item.appendChild(el("span", "reg-doc-id", d.doc));
          const t2 = el("span", "reg-doc-main");
          t2.appendChild(el("span", "reg-doc-title", d.title));
          t2.appendChild(el("span", "reg-doc-where",
            `${d.chunks} ${t("regChunks")}${d.version ? " · v" + d.version : ""}`));
          item.appendChild(t2);
          if (d.pdf_available) item.appendChild(el("span", "reg-doc-pdf", "PDF"));
          item.addEventListener("click", () => {
            S.regDoc = d.doc;
            const select = document.querySelector("#reg-body .reg-doc-select");
            if (select) select.value = d.doc;
            regRunSearch();
          });
          docs.appendChild(item);
        }
        box.appendChild(docs);
        return;
      }
      box.appendChild(el("div", "empty", t("regEmpty")));
      // browse the selected document's sections
      const doc = S.regDocs.find((d) => d.doc === S.regDoc);
      if (doc) regBrowseDoc(doc);
      return;
    }
    if (!S.regResults.length) { box.appendChild(el("div", "empty", t("regNoResults"))); return; }
    const list = el("div", "reg-hit-list");
    for (const hit of S.regResults) {
      const item = el("button", "reg-hit");
      item.type = "button";
      item.appendChild(el("span", "reg-hit-where",
        `${hit.doc_title || hit.doc}${hit.section ? " · " + hit.section : ""}${hit.pages ? " · S. " + hit.pages : ""}`));
      item.appendChild(el("span", "reg-hit-title", hit.title || ""));
      item.appendChild(el("span", "reg-hit-snippet", hit.snippet || ""));
      item.addEventListener("click", () => {
        list.querySelectorAll(".reg-hit.active").forEach((n) => n.classList.remove("active"));
        item.classList.add("active");
        regOpenChunk(hit.path);
      });
      list.appendChild(item);
    }
    box.appendChild(list);
  }

  // browse mode (no query): list the selected document's sections in order
  async function regBrowseDoc(doc) {
    try {
      const r = await fetch(`/api/regulations/search?q=*&doc=${encodeURIComponent(doc.doc)}&limit=500`);
      const body = await r.json();
      const box = document.querySelector("#reg-body .reg-results");
      if (!box || S.regResults) return;  // a search arrived in the meantime
      if (!body.ok) return;
      const list = el("div", "reg-hit-list");
      for (const hit of body.results) {
        const item = el("button", "reg-hit");
        item.type = "button";
        item.appendChild(el("span", "reg-hit-where",
          `${hit.section ? "§ " + hit.section + " · " : ""}${hit.pages ? "S. " + hit.pages : ""}`));
        item.appendChild(el("span", "reg-hit-title", hit.title || ""));
        item.addEventListener("click", () => {
          list.querySelectorAll(".reg-hit.active").forEach((n) => n.classList.remove("active"));
          item.classList.add("active");
          regOpenChunk(hit.path);
        });
        list.appendChild(item);
      }
      box.appendChild(list);
    } catch { /* results pane keeps the empty hint */ }
  }

  function renderRegReader() {
    const box = document.querySelector("#reg-body .reg-reader");
    if (!box) return;
    box.textContent = "";
    if (S.regPdf) {
      // original PDF view: browser-native viewer in an iframe, back button on top
      const head = el("div", "reg-reader-head");
      const back = el("button", "ghost-btn", `← ${t("regBackToText")}`);
      back.type = "button";
      back.addEventListener("click", () => { S.regPdf = null; renderRegReader(); });
      head.appendChild(back);
      const doc = S.regDocs.find((d) => d.doc === S.regPdf);
      if (doc && doc.pdf_available) {
        const open = el("button", "ghost-btn", t("regOpenPdf"));
        open.type = "button";
        open.addEventListener("click", () => window.open(`/api/regulations/pdf?doc=${encodeURIComponent(S.regPdf)}`, "_blank"));
        head.appendChild(open);
      }
      box.appendChild(head);
      const frame = el("iframe", "reg-pdf-frame");
      frame.title = t("regOpenPdf");
      frame.src = `/api/regulations/pdf?doc=${encodeURIComponent(S.regPdf)}`;
      box.appendChild(frame);
      return;
    }
    if (!S.regSelected) {
      box.appendChild(el("div", "empty", LANG === "de"
        ? "Abschnitt auswählen — Suche links oder stöbern."
        : "Pick a section — search on the left or browse."));
      return;
    }
    if (S.regSelected.error) {
      box.appendChild(el("div", "empty", LANG === "de"
        ? "Abschnitt nicht ladbar."
        : "Section could not be loaded."));
      return;
    }
    const m = S.regSelected;
    const head = el("div", "reg-reader-head");
    const title = el("div", "reg-reader-title");
    title.appendChild(el("strong", null, m.doc_title || m.doc || ""));
    title.appendChild(el("span", "reg-reader-where",
      `${m.section ? "§ " + m.section : ""}${m.title ? " — " + m.title : ""}${m.pages ? " · " + t("regPages") + " " + m.pages : ""}${m.version ? " · v" + m.version : ""}`));
    head.appendChild(title);
    const doc = S.regDocs.find((d) => d.doc === m.doc);
    if (doc && doc.pdf_available) {
      const pdfBtn = el("button", "ghost-btn", t("regOpenPdf"));
      pdfBtn.type = "button";
      pdfBtn.addEventListener("click", () => { S.regPdf = doc.doc; renderRegReader(); });
      head.appendChild(pdfBtn);
    }
    box.appendChild(head);
    const article = el("article", "reg-md");
    article.innerHTML = mdToSafeHtml(m.text || "");  // escaped-first markdown
    box.appendChild(article);
  }

  // =========================================================================
  // Chat
  // =========================================================================
  const chatLogs = new Map(); // per-surface log element

  function activeLog() {
    return S.mode === "fullscreen" ? $("chat-full") : $("chat-overlay");
  }

  function setMode(mode) {
    if (mode === S.mode) return;
    S.mode = mode;
    $("susie-overlay").hidden = mode !== "overlay";
    $("susie-full").hidden = mode !== "fullscreen";
    $("susie-fab").hidden = mode !== "closed";
    $("susie-entry").setAttribute("aria-pressed", String(mode !== "closed"));
    // docked chat: the content reflows next to the rail instead of being covered
    $("app").classList.toggle("susie-docked", mode === "overlay");
    if (mode !== "closed") {
      // one session: the conversation thread MOVES to the newly active surface
      const log = activeLog();
      const surfaces = [$("chat-overlay"), $("chat-full")];
      const prevLog = surfaces.map((r) => r.querySelector(".chat-log"))
        .find((l) => l && l.childElementCount && l.parentElement !== log);
      if (!log.querySelector(".chat-log")) renderChatInto(log);
      const newLog = log.querySelector(".chat-log");
      if (prevLog && prevLog.childElementCount) {
        // the greeting yields to the real thread; nodes move, nothing is re-fetched
        newLog.textContent = "";
        while (prevLog.firstElementChild) newLog.appendChild(prevLog.firstElementChild);
      }
      chatLogs.set(log, chatLogs.get(log) || buildComposer(log));
      const deg = log.querySelector("[data-degraded]");
      const prevDeg = prevLog?.closest(".chat")?.parentElement?.querySelector("[data-degraded]");
      if (deg && prevDeg) deg.hidden = prevDeg.hidden;
      newLog.scrollTop = newLog.scrollHeight;
    }
    emit("mode_changed", { mode });
  }

  function renderChatInto(root) {
    root.textContent = "";
    const log = el("div", "chat-log"); log.setAttribute("aria-live", "polite"); root.appendChild(log);
    if (!S.reviewer) {
      const ob = el("div", "onboard");
      ob.appendChild(el("p", "", t("onboard")));
      const comp = el("div", "composer");
      const input = el("input"); input.placeholder = t("yourName"); input.maxLength = 60;
      const go = el("button", "btn btn-yes", t("start"));
      go.addEventListener("click", () => {
        const name = input.value.trim();
        if (!name) { input.focus(); return; }
        S.reviewer = name; store.set("susie-reviewer", name);
        log.textContent = "";
        addBubble(log, "susie", t("hello", name));
        addChips(log);
        // every surface's composer unlocks now that the reviewer is named
        for (const r of [$("chat-overlay"), $("chat-full")]) {
          const c = r.querySelector(".composer input");
          const s = r.querySelector(".composer .send-btn");
          if (c) c.disabled = false;
          if (s) s.disabled = false;
        }
        if (S.pendingMessage) { const m = S.pendingMessage; S.pendingMessage = null; sendMessage(m); }
        if (S.pendingAction) { const a = S.pendingAction; S.pendingAction = null; demoCommand(a.actionId, a.params); }
      });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") go.click(); });
      comp.appendChild(input); comp.appendChild(go); ob.appendChild(comp);
      log.appendChild(ob); input.focus();
    } else {
      addBubble(log, "susie",
        t("greet", S.reviewer));
      addChips(log);
    }
    buildComposer(root);
  }

  function buildComposer(root) {
    const deg = el("div", "banner-degraded",
      LANG === "de" ? "Meine Verbindung zum Wissensdienst ist unterbrochen – ich kann Sie aber manuell durch die Schritte führen." : "My connection to the knowledge service is down – I can still walk you through the steps manually.");
    deg.hidden = true; deg.dataset.degraded = "1"; root.appendChild(deg);

    const comp = el("div", "composer");
    const input = el("input");
    input.placeholder = t("ask"); input.maxLength = 2000;
    input.disabled = !S.reviewer;   // onboarding gate: no message before a named reviewer
    const send = svgBtn("send-btn", "M3 10h12M10 4l6 6-6 6");
    send.setAttribute("aria-label", LANG === "de" ? "Senden" : "Send");
    send.disabled = !S.reviewer;
    const submit = () => {
      const v = input.value.trim();
      if (!v || S.busy) return;
      input.value = "";
      // the reference job captures the next composer line as the Fundstelle
      if (S.referenceAsk) { S.referenceAsk = false; proposeReference(v); return; }
      sendMessage(v);
    };
    send.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } });
    comp.appendChild(input); comp.appendChild(send); root.appendChild(comp);
    chatLogs.set(root, { log: root.querySelector(".chat-log"), input, send, submit });
    return comp;
  }

  function addBubble(log, who, text) {
    const m = el("div", `msg msg-${who}`);
    const b = el("div", "bubble", text);
    m.appendChild(b); log.appendChild(m);
    log.scrollTop = log.scrollHeight;
    return b;
  }

  // Streaming reveal — the ChatGPT/Claude feel: text arrives progressively
  // under a live caret. Duration-boxed (not chunk-counted): throttled or
  // background timers can never stretch the reveal beyond ~1.6 s, and
  // reduced motion or a hidden pane reveals instantly.
  function revealText(bubble, text) {
    if (reducedMotion.matches || document.hidden) { bubble.textContent = text; return Promise.resolve(); }
    return new Promise((resolve) => {
      const caret = el("span", "caret"); bubble.appendChild(caret);
      const duration = Math.min(1600, Math.max(500, text.length * 3));
      const started = performance.now();
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        bubble.textContent = text; caret.remove(); resolve();
      };
      const tick = () => {
        if (done) return;
        const frac = Math.min(1, (performance.now() - started) / duration);
        bubble.textContent = text.slice(0, Math.max(1, Math.round(text.length * frac)));
        bubble.appendChild(caret);
        const sc = bubble.closest(".chat-log");
        if (sc) sc.scrollTop = sc.scrollHeight;
        if (frac >= 1) { finish(); return; }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      setTimeout(finish, duration + 800); // timer-throttle safety net
    });
  }

  // Markdown-lite formatting: **bold**, *italic*, `code`, and "- " bullets —
  // built from text nodes only (literal-text rule holds; no markup injection).
  function renderFormatted(bubble, text) {
    bubble.textContent = "";
    const inline = (target, str) => {
      for (const part of str.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`)/g)) {
        if (!part) continue;
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          target.appendChild(el("strong", "", part.slice(2, -2)));
        } else if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          target.appendChild(el("em", "", part.slice(1, -1)));
        } else if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          target.appendChild(el("code", "", part.slice(1, -1)));
        } else {
          target.appendChild(document.createTextNode(part));
        }
      }
    };
    let list = null;
    for (const line of text.split("\n")) {
      if (line.trimStart().startsWith("- ")) {
        if (!list) { list = el("ul", "bubble-list"); bubble.appendChild(list); }
        const li = el("li"); inline(li, line.trimStart().slice(2)); list.appendChild(li);
      } else {
        list = null;
        const p = el("div", "bubble-line"); inline(p, line); bubble.appendChild(p);
      }
    }
  }

  async function sendMessage(text) {
    const { log, input, send } = chatLogs.get(activeLog());
    S.busy = true; if (send) send.disabled = true;
    addBubble(log, "user", text);
    const t = el("div", "msg msg-susie");
    const b = el("div", "bubble"); b.appendChild(el("span", "thinking"));
    for (let k = 0; k < 3; k++) b.firstChild.appendChild(document.createElement("i"));
    t.appendChild(b); log.appendChild(t); log.scrollTop = log.scrollHeight;

    let reply;
    try {
      const res = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: S.sessionId, message: text, reviewer: S.reviewer, lang: LANG }),
      });
      reply = await res.json();
    } catch {
      reply = { ok: false, degraded: true, utterance: "", citations: [] };
    }

    t.remove();
    // the reply follows the ACTIVE surface — the user may have switched modes mid-flight
    const targetLog = activeLog().querySelector(".chat-log") || log;
    const mine = el("div", "msg msg-susie");
    const mb = el("div", "bubble");
    mine.appendChild(mb); targetLog.appendChild(mine);
    const replyText = reply.utterance || (LANG === "de"
      ? "Ich konnte Ihre Anfrage gerade nicht verarbeiten."
      : "I could not process your request just now.");
    await revealText(mb, replyText);
    renderFormatted(mb, replyText);

    const extras = el("div", "bubble-extras");
    if (reply.disclaimer) extras.appendChild(el("span", "badge-disclaimer", LANG === "de" ? "Nicht im Datensatz — bitte selbst prüfen" : "Not in my dataset — please verify"));
    for (const c of reply.citations || []) {
      const label = c.kind === "corpus" ? `${c.source_version_id || c.ref || (LANG === "de" ? "Quelle" : "Source")}${c.locator ? " · " + c.locator : ""}` : (c.ref || (LANG === "de" ? "Beleg" : "Evidence"));
      const chip = el("button", `chip ${c.kind === "corpus" ? "source" : "state"}`, label);
      chip.addEventListener("click", () => {
        invoke(c.kind === "corpus" ? "jump_to_source" : "show_comparison", { ref: c.ref, case_id: c.ref });
      });
      extras.appendChild(chip);
    }
    if (extras.childElementCount) mb.appendChild(extras);

    if (reply.degraded) {
      const banner = activeLog().querySelector("[data-degraded]");
      if (banner) banner.hidden = false;
    } else {
      // a healthy reply proves the connection recovered — a once-shown banner
      // must not outlive it (it used to persist until a page reload)
      const banner = activeLog().querySelector("[data-degraded]");
      if (banner) banner.hidden = true;
    }

    if (reply.action && reply.action.id) {
      // Read-only navigation (select case, open evidence, …) is not a human
      // decision — it executes immediately and shows a result line. Mutating
      // and gate actions keep the explicit Ja/Nein card.
      if (!reply.needs_confirmation && READ_ONLY.has(reply.action.id)) {
        try {
          const result = await invoke(reply.action.id, reply.action.params || {});
          const line = el("div", "action-result ok",
            `✓ ${result?.detail || ACTION_TITLES[reply.action.id]?.[LANG] || reply.action.id}`);
          targetLog.appendChild(line);
        } catch {
          targetLog.appendChild(actionCard(reply.action, reply.needs_confirmation));
        }
      } else {
        targetLog.appendChild(actionCard(reply.action, reply.needs_confirmation));
      }
      targetLog.scrollTop = targetLog.scrollHeight;
    }
    S.busy = false; if (send) send.disabled = false; input?.focus();
  }

  // Report generation deliverable: the formal PDF (itsg/report_pdf via the
  // bridge's /api/report/pdf), fetched after the confirmed export action.
  async function downloadReport() {
    const res = await fetch(`/api/report/pdf?lang=${LANG}`);  // report in the UI language
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body.error || `${LANG === "de" ? "PDF-Endpunkt" : "PDF endpoint"} ${res.status}`;
      window.alert(msg);  // silent failure would read as "nothing is wired"
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = el("a");
    a.href = url;
    a.download = `SUSIE-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  // Single-case report (owner request 2026-10-27): the formal PDF filtered to
  // one case, with the explicit Einzelfall note — same deterministic pipeline.
  async function downloadCaseReport(caseId) {
    const res = await fetch(`/api/report/pdf?case_id=${encodeURIComponent(caseId)}&lang=${LANG}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body.error || `${LANG === "de" ? "PDF-Endpunkt" : "PDF endpoint"} ${res.status}`;
      window.alert(msg);  // silent failure would read as "nothing is wired"
      throw new Error(msg);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = el("a");
    a.href = url;
    a.download = `SUSIE-report-${caseId}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function actionCard(action, needsConfirmation) {
    const wrap = el("div", "msg msg-susie");
    const card = el("div", "action-card");
    // the confirm card speaks the demo's language, not the action bus's:
    // the live run is "test cases from the law", the offline one is the
    // deterministic field comparison (assessment A, P0).
    const p = action.params || {};
    let title = ACTION_TITLES[action.id]?.[LANG] || action.id;
    if (action.id === "run_comparison") {
      title = p.live
        ? (LANG === "de" ? "Testfälle aus dem Gesetz erstellen — Prüflauf der KI-Rollen"
                         : "Create test cases from the law — AI-role review run")
        : (LANG === "de" ? "Abgleich mit der Softwareausgabe — deterministischer Feldvergleich"
                         : "Comparison against the software output — deterministic field comparison");
    }
    card.appendChild(el("div", "action-title", title));
    const human = { case_id: p.case_id, filter: p.filter, mode: p.mode };
    if (action.id === "run_comparison") {
      human.mode = p.live ? (LANG === "de" ? "mit KI-Rollen (live)" : "AI roles (live)")
                          : (LANG === "de" ? "deterministisch (ohne KI)" : "deterministic (no AI)");
    }
    const paramsText = Object.entries(human).filter(([, v]) => v !== undefined && v !== "")
      .map(([k, v]) => `${k}: ${v}`).join(" · ");
    if (paramsText) card.appendChild(el("div", "action-params", paramsText));

    const row = el("div", "action-row");
    const yes = el("button", "btn btn-yes", t("yes"));
    const no = el("button", "btn btn-no", t("no"));
    row.appendChild(yes); row.appendChild(no);
    card.appendChild(row);
    wrap.appendChild(card);

    const finish = (cls, text) => {
      row.remove();
      card.appendChild(el("div", `action-result ${cls}`, text));
    };

    yes.addEventListener("click", async () => {
      yes.disabled = true; no.disabled = true;
      // Live AI-role run (Gesetz → Testfälle): the confirmed action executes
      // server-side for up to a few minutes — show real step progress by
      // watching the store's agent_run records while the POST is in flight.
      const liveRun = action.id === "run_comparison" && action.params?.live;
      const baselineRuns = S.appState?.backend?.agent_runs ?? 0;
      let progress = null, pollTimer = null, abortTimer = null, tickTimer = null;
      if (liveRun) {
        progress = el("div", "run-progress");
        progress.setAttribute("role", "status");
        const spin = el("span", "run-spinner");
        spin.setAttribute("aria-hidden", "true");
        const box = el("div", "run-progress-text");
        box.appendChild(el("strong", "", t("runProgressTitle")));
        const step = el("span", "run-step", t("runStarting"));
        const elapsed = el("span", "run-step", "");
        box.appendChild(step); box.appendChild(elapsed);
        progress.appendChild(spin); progress.appendChild(box);
        card.appendChild(progress);
        const startedAt = Date.now();
        tickTimer = setInterval(() => {
          const sec = Math.round((Date.now() - startedAt) / 1000);
          elapsed.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")} — ${LANG === "de" ? "ca. 2–4 Minuten insgesamt" : "about 2–4 minutes in total"}`;
        }, 1000);
        pollTimer = setInterval(async () => {
          try {
            const r = await fetch("/api/state");
            if (!r.ok) return;
            S.appState = await r.json();
            const done = (S.appState?.backend?.agent_runs ?? 0) - baselineRuns;
            const steps = t("runSteps");
            if (done >= steps.length) step.textContent = t("runStepLabel", steps.length, steps[steps.length - 1]);
            else if (done >= 1) step.textContent = t("runStepLabel", done, steps[done - 1]);
            else step.textContent = t("runStarting");
          } catch { /* a lost poll is non-fatal; the next one retries */ }
        }, 4000);
      }
      try {
        let result;
        if (liveRun) {
          // 4 bounded roles (60 s each) plus margin, then an honest timeout
          const abortCtl = new AbortController();
          abortTimer = setTimeout(() => abortCtl.abort(), 360000);
          result = await invoke(action.id, action.params || {}, action.confirm_token, { signal: abortCtl.signal });
        } else {
          result = await invoke(action.id, action.params || {}, action.confirm_token);
        }
        const detail = result?.detail
          || (result?.mode === "server" ? (LANG === "de" ? "im Store neu gerechnet" : "recomputed in the store") : result?.mode)
          || (LANG === "de" ? "ausgeführt" : "executed");
        finish("ok", t("done", detail));
        if (action.id === "export_report") {
          try {
            await downloadReport();
            finish("ok", `${t("exportDone")} (PDF) — ${t("done", detail)}`);
          } catch (pdfErr) {
            finish("err", `${t("exportDone")} ${LANG === "de" ? "fehlgeschlagen" : "failed"}: ${pdfErr.message}`);
          }
        }
        emit("action_executed", { actionId: action.id, result });
      } catch (e) {
        if (liveRun && (e.name === "AbortError" || /abort/i.test(e.message || ""))) {
          // the POST channel gave up — the store may still hold the finished run
          let recovered = false;
          try {
            const r = await fetch("/api/state");
            if (r.ok) {
              const st = await r.json();
              if ((st?.backend?.agent_runs ?? 0) - baselineRuns >= 3) {
                S.appState = st; withViewGuard("cases", renderCases); withViewGuard("report", renderReport);
                finish("ok", t("runDoneLate"));
                recovered = true;
              }
            }
          } catch { /* fall through to the timeout line */ }
          if (!recovered) finish("err", t("runTimeout"));
        } else {
          finish(e.actionResult || "err", t("failed", e.message));
        }
      } finally {
        if (pollTimer) clearInterval(pollTimer);
        if (abortTimer) clearTimeout(abortTimer);
        if (tickTimer) clearInterval(tickTimer);
        if (progress) progress.remove();
      }
    });
    no.addEventListener("click", () => {
      finish("no", t("manual"));
      emit("action_declined", { actionId: action.id });
    });
    return wrap;
  }

  // =========================================================================
  // Wiring
  // =========================================================================
  $("susie-entry").addEventListener("click", () => setMode(S.mode === "closed" ? "overlay" : "closed"));
  $("overlay-close").addEventListener("click", () => setMode("closed"));
  $("to-fullscreen").addEventListener("click", () => setMode("fullscreen"));
  $("to-overlay").addEventListener("click", () => setMode("overlay"));
  // the bottom-right flyover bubble is the everyday chat entry
  $("susie-fab").addEventListener("click", () => setMode("overlay"));
  // Prüfakte · Experten is an expandable group; collapsed by default so the
  // demo rail shows three destinations instead of eight.
  const groupItems = $("side-group-items");
  const groupToggle = $("side-group-toggle");
  if (groupItems && groupToggle) {
    const setGroupOpen = (open) => {
      groupItems.classList.toggle("collapsed", !open);
      groupToggle.setAttribute("aria-expanded", String(open));
      if (open && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
        groupItems.classList.remove("settling");
        void groupItems.offsetWidth; // restart the settle animation
        groupItems.classList.add("settling");
      }
      store.set("susie-dossiers-open", open ? "1" : "0");
    };
    setGroupOpen(store.get("susie-dossiers-open", "0") === "1");
    groupToggle.addEventListener("click", () =>
      setGroupOpen(groupToggle.getAttribute("aria-expanded") !== "true"));
  }

  // Demo paths for the owner's concerns 1 + 2 (T10-052): a visible button per
  // job. The button proposes the action DIRECTLY via /api/action/propose and
  // renders the Ja/Nein card — no fake user message, no model involvement,
  // nothing runs before the human confirms (four-eyes preserved).
  const demoCommand = async (actionId, params) => {
    if (S.busy) return;
    setMode("overlay");
    if (!S.reviewer) { S.pendingAction = { actionId, params }; return; }
    const log = activeLog().querySelector(".chat-log");
    if (!log) return;
    try {
      const res = await fetch("/api/action/propose", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: S.sessionId, action_id: actionId, params }),
      });
      const body = await res.json();
      if (!res.ok || body.ok === false || !body.confirm_token) {
        throw new Error(body.error || (LANG === "de" ? "Vorschlag abgelehnt" : "proposal refused"));
      }
      log.appendChild(actionCard({ ...body.action, confirm_token: body.confirm_token }, true));
      log.scrollTop = log.scrollHeight;
    } catch (err) {
      addBubble(log, "susie", LANG === "de"
        ? `Vorschlag fehlgeschlagen: ${err.message}`
        : `Proposal failed: ${err.message}`);
    }
  };
  $("btn-gen-cases").addEventListener("click", () =>
    demoCommand("run_comparison", { live: true }));
  $("btn-run-compare").addEventListener("click", () =>
    demoCommand("run_comparison", { live: false }));

  $("lang-toggle").addEventListener("click", () => {
    LANG = LANG === "de" ? "en" : "de";
    store.set("susie-ui-lang", LANG);
    applyI18n();
    withViewGuard("cases", renderCases); withViewGuard("report", renderReport); withViewGuard("sources", renderSources);; withViewGuard("trust", renderTrust);
    withViewGuard("technik", renderTechnik);
    // empty chat surfaces re-greet in the new language; an ongoing thread stays
    for (const root of [$("chat-overlay"), $("chat-full")]) {
      const logEl = root.querySelector(".chat-log");
      if (logEl && !logEl.querySelector(".msg-user")) renderChatInto(root);
    }
  });

  document.querySelectorAll(".side-link").forEach((b) =>
    b.addEventListener("click", () => showView(b.dataset.view)));

  const themeBtn = $("theme-toggle");
  const applyTheme = (t) => { document.body.dataset.theme = t; };
  applyTheme(store.get("susie-ui-theme", "auto") === "dark" ? "dark" : "light");
  themeBtn.addEventListener("click", () => {
    const next = document.body.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next); store.set("susie-ui-theme", next);
  });

  // Dynamic font size (T10-049): one toggle cycling the --font-scale hook
  // (CSS-side by the density pass); persisted, honest label in the tooltip.
  const FONT_STEPS = [1, 1.15, 1.3, 0.9];
  const storedFont = parseFloat(store.get("susie-font-scale", "1"));
  let fontStep = FONT_STEPS.indexOf(storedFont);
  if (fontStep === -1) fontStep = 0;
  const applyFontScale = () => {
    document.documentElement.style.setProperty("--font-scale", String(FONT_STEPS[fontStep]));
    store.set("susie-font-scale", String(FONT_STEPS[fontStep]));
    const pct = Math.round(FONT_STEPS[fontStep] * 100);
    $("font-toggle").title = LANG === "de" ? `Schriftgröße: ${pct} % — klicken zum Umschalten` : `Text size: ${pct} % — click to cycle`;
  };
  applyFontScale();
  $("font-toggle").addEventListener("click", () => { fontStep = (fontStep + 1) % FONT_STEPS.length; applyFontScale(); });

  async function pollHealth() {
    const dot = $("bridge-dot"), label = $("bridge-label");
    try {
      const r = await fetch("/api/health");
      const ok = r.ok;
      dot.className = `bridge-dot ${ok ? "ok" : "bad"}`;
      label.textContent = ok ? t("bridgeOk") : t("bridgeBad");
    } catch {
      dot.className = "bridge-dot bad";
      label.textContent = t("bridgeOff");
    }
  }
  pollHealth(); setInterval(pollHealth, 15000);

  // ---------- Datenschutz-Schleuse badge + panel (T10-043) ----------
  // The badge states what the backend reports — nothing is claimed client-side.
  S.privacy = null;
  let privacyOpen = false;

  const destLabel = (name) => ({ hessian_ai: t("privacyChatWired"), langfuse: t("privacyLangfuseWired") }[name] || name);

  function renderPrivacyPanel() {
    const panel = $("privacy-panel");
    if (!privacyOpen || !S.privacy) { panel.hidden = true; return; }
    const p = S.privacy;
    panel.textContent = "";
    // A refused airlock (module not loadable) must say WHY — never a silent row of "—".
    if (p.ok === false) {
      panel.appendChild(el("p", "privacy-refused", p.reason || t("privacyRefusedTitle")));
      panel.appendChild(el("p", "privacy-refused-note",
        LANG === "de" ? "Fail-closed: die Daten bleiben lokal, nichts geht nach außen."
                      : "Fail-closed: data stays local, nothing leaves."));
      panel.hidden = false;
      return;
    }
    const head = el("div", "privacy-head");
    const shield = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    shield.setAttribute("viewBox", "0 0 20 20"); shield.setAttribute("class", "shield-ico");
    shield.setAttribute("aria-hidden", "true");
    const p1 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p1.setAttribute("d", "M10 2.5 16 5v4.5c0 4.1-2.6 7-6 8.1-3.4-1.1-6-4-6-8.1V5z");
    const p2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p2.setAttribute("class", "shield-check"); p2.setAttribute("d", "M7.2 10l2 2 3.6-4");
    for (const a of [p1, p2]) {
      a.setAttribute("fill", "none"); a.setAttribute("stroke", "currentColor");
      a.setAttribute("stroke-width", "1.6"); a.setAttribute("stroke-linecap", "round");
      a.setAttribute("stroke-linejoin", "round"); shield.appendChild(a);
    }
    head.appendChild(shield);
    const ht = el("div", "privacy-head-text");
    ht.appendChild(el("strong", null, t("privacyTitle")));
    ht.appendChild(el("p", null, t("privacySub")));
    head.appendChild(ht);
    panel.appendChild(head);

    const rows = el("dl", "privacy-rows");
    const row = (dt, dd) => { rows.appendChild(el("dt", null, dt)); rows.appendChild(el("dd", null, dd)); };
    row(t("privacyPolicy"), String(p.policy_version || "—"));
    row(t("privacyKeyMode"), String(p.key_mode || "—"));
    const dests = p.destinations && typeof p.destinations === "object"
      ? Object.entries(p.destinations).map(([name, cfg]) => `${destLabel(name)} — ${cfg && cfg.mode ? cfg.mode : "?"}`).join(" · ")
      : "—";
    row(t("privacyChannels"), dests);
    const wired = p.wired && typeof p.wired === "object" ? Object.values(p.wired).join(" · ") : "—";
    row(t("privacyWiring"), wired);
    const cats = Array.isArray(p.categories) && p.categories.length ? p.categories.join(", ") : t("privacyNone");
    row(t("privacyCategories"), cats);
    panel.appendChild(rows);
    panel.hidden = false;
  }

  async function pollPrivacy() {
    const badge = $("privacy-badge");
    try {
      const r = await fetch("/api/privacy");
      const body = await r.json();
      S.privacy = body;
      delete badge.dataset.offline;  // an answer arrived: ok:false is "refused", not offline
    } catch {
      S.privacy = null;
      badge.dataset.offline = "1";
    }
    syncPrivacyBadge();
    renderPrivacyPanel();
  }

  // badge state + label from the LAST backend answer — re-applied on language
  // toggle so the button always speaks the current language (T10-044 fix).
  // Three states (T10-045): ok (green) / offline (neutral — bridge unreachable,
  // which is NOT "unprotected") / refused (red — airlock loaded but refused).
  function syncPrivacyBadge() {
    const badge = $("privacy-badge"), label = $("privacy-label");
    const offline = badge.dataset.offline === "1";
    const refused = !offline && S.privacy && S.privacy.ok === false;
    const ok = !offline && !refused && S.privacy && S.privacy.ok && S.privacy.active;
    badge.hidden = false;
    badge.className = `privacy-badge ${ok ? "ok" : refused ? "refused" : offline ? "off" : "bad"}`;
    badge.title = ok ? t("privacyTitle")
      : refused ? (S.privacy?.reason || t("privacyRefusedTitle"))
      : offline ? (LANG === "de" ? "Bridge nicht erreichbar — Status unbekannt."
                                  : "Bridge unreachable — status unknown.")
      : t("privacyOff");
    label.textContent = ok ? t("privacyOn")
      : refused ? t("privacyRefused")
      : offline ? t("privacyOffline")
      : t("privacyOff");
  }
  $("privacy-badge").addEventListener("click", () => {
    privacyOpen = !privacyOpen;
    $("privacy-badge").setAttribute("aria-expanded", String(privacyOpen));
    renderPrivacyPanel();
  });
  document.addEventListener("click", (e) => {
    if (privacyOpen && !e.target.closest("#privacy-panel") && !e.target.closest("#privacy-badge")) {
      privacyOpen = false;
      $("privacy-badge").setAttribute("aria-expanded", "false");
      renderPrivacyPanel();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && privacyOpen) {
      privacyOpen = false;
      $("privacy-badge").setAttribute("aria-expanded", "false");
      renderPrivacyPanel();
    }
  });
  pollPrivacy(); setInterval(pollPrivacy, 30000);

  // ---------- Help & Support + "What's this?" mode (T10-044) ----------
  // Deterministic explain-surface: flyover texts are a local registry (offline-safe,
  // DE/EN); "Ask SÜSIE" hands the topic to the assistant, whose deterministic layer
  // answers the registered topics and the model handles the rest (cite-or-abstain).
  const HELP_UI = {
    "susie-entry": {
      title: { de: "SÜSIE — Logo", en: "SÜSIE — logo" },
      text: { de: "Klick öffnet SÜSIE im Vollbild-Modus. SÜSIE ist Ihre Assistentin für diese Systemprüfung: sie erklärt, führt auf Ihr Wort aus und protokolliert jeden Schritt.",
              en: "Click opens SÜSIE in fullscreen. SÜSIE is your assistant for this system review: she explains, executes on your word and records every step." },
      ask: null,
    },
    "nav-technik": {
      title: { de: "Unter der Haube", en: "Under the hood" },
      text: { de: "Die Architektur dieser Prüfung im Überblick: drei Bühnen — Regeln, Tests, Befund — und wer darin was tut: KI entwirft, Code rechnet und prüft, der Mensch entscheidet.",
              en: "The architecture of this review at a glance: three stages — rules, tests, verdict — and who does what: AI drafts, code computes and checks, the person decides." },
      ask: null,
    },
    "technik-body": {
      title: { de: "Architektur-Schaubild", en: "Architecture diagram" },
      text: { de: "Das Schaubild zeigt den Weg vom Gesetz zum signierten Bericht. Rosa = KI entwirft, beige = Code rechnet und prüft, dunkle Raute = der Mensch entscheidet. Gestrichelte Linien sind Rückschleifen (max. 2 Runden).",
              en: "The diagram shows the path from the law to the signed report. Pink = AI drafts, beige = code computes and checks, dark diamond = the person decides. Dashed lines are rework loops (max 2 rounds)." },
      ask: { de: "Wie funktioniert die Prüfung?", en: "How does the review work?" } },
    "nav-regulations": {
      title: { de: "Regelwerke", en: "Regulations" },
      text: { de: "Durchsuchen und lesen Sie die indizierten Gesetzestexte (VB, GG, Beispielpapier, Rundschreiben) — als Abschnitt im Markdown-Reader oder als Original-PDF.",
              en: "Search and read the indexed law texts (VB, GG, sample document, circulars) — as a section in the markdown reader or as the original PDF." },
      ask: null,
    },
    "fab": {
      title: { de: "SÜSIE Assistentin", en: "SÜSIE assistant" },
      text: { de: "Öffnet den SÜSIE-Chat als Flyover. Fragen Sie frei heraus — Navigation und Status laufen lokal, ganz ohne Sprachdienst.",
              en: "Opens the SÜSIE chat as a flyover. Ask freely — navigation and status run locally, no language service needed." },
      ask: null,
    },
    "nav-cases": {
      title: { de: "Prüffälle", en: "Cases" },
      text: { de: "Die Prüffallkartei: je Fall der Soll/Ist-Vergleich zwischen offizieller Erwartung und übermittelter Softwareausgabe. Abweichungen sind sofort sichtbar.",
              en: "The case file: per case, the expected/transmitted comparison between the official expectation and the software output. Deviations visible at a glance." },
      ask: { de: "Was sind die Prüffälle?", en: "What are the cases?" } },
    "nav-report": {
      title: { de: "Prüfbericht", en: "Report" },
      text: { de: "Der vollständige Prüfbericht: Zusammenfassung mit Empfehlungen, alle Befunde im Detail, Belegkette und PDF-Export mit Manipulationssiegel.",
              en: "The full review report: summary with recommended actions, all findings in detail, evidence chain and PDF export with tamper-evidence seal." },
      ask: { de: "Was ist der Prüfbericht?", en: "What is the report?" } },
    "nav-sources": {
      title: { de: "Quellen", en: "Sources" },
      text: { de: "Worauf die Prüfung beruht: Rechtsgrundlagen mit Version, Gültigkeit und SHA-256 — und wer welche KI-Ausgabe freigegeben hat.",
              en: "What the review rests on: legal bases with version, validity and SHA-256 — and who approved which AI output." },
      ask: { de: "Was sind die Quellen?", en: "What are the sources?" } },
    "gen-cases": {
      title: { de: "Testfälle aus dem Gesetz erstellen", en: "Create test cases from the law" },
      text: { de: "Startet den KI-Prüflauf: Gesetz → Anforderungen → Testfälle. Nichts wird ausgeführt, bevor Sie es nicht ausdrücklich bestätigt haben (4-Augen-Prinzip).",
              en: "Starts the AI review run: law → requirements → test cases. Nothing executes before your explicit confirmation (four-eyes principle)." },
      ask: { de: "Wie werden Testfälle aus dem Gesetz erstellt?", en: "How are test cases generated from the law?" } },
    "run-compare": {
      title: { de: "Abgleich starten", en: "Run comparison" },
      text: { de: "Deterministischer Feldvergleich in Code — ohne KI, in Sekunden. Zeigt je Feld: offizielle Erwartung gegen übermittelten Wert.",
              en: "Deterministic field comparison in code — no AI, seconds. Shows per field: official expectation vs. transmitted value." },
      ask: { de: "Was ist der Abgleich?", en: "What is the comparison?" } },
    "case-list": {
      title: { de: "Prüffallkarten", en: "Case cards" },
      text: { de: "Jede Karte: Falltyp, Status-Badge, klare Befund-Sätze und die Belegkette bis zur Quelle. „Ohne Beleg kein Bestand“ — fehlende Nachweise gelten als nicht bewertet.",
              en: "Each card: case type, status badge, plain-language findings and the evidence chain back to the source. “No evidence, no pass” — missing evidence counts as not evaluated." },
      ask: { de: "Was zeigen die Prüffallkarten?", en: "What do the case cards show?" } },
    "report-body": {
      title: { de: "Berichtsansicht", en: "Report view" },
      text: { de: "Hier steht der Prüfstand als Bericht: Befunde, empfohlene Maßnahmen (deterministisch abgeleitet) und die Freigabe-Status je Fall.",
              en: "The review status as a report: findings, recommended actions (deterministically derived) and release status per case." },
      ask: { de: "Was ist der Prüfbericht?", en: "What is the report?" } },
    "sources-body": {
      title: { de: "Quellen & Kriterien", en: "Sources & criteria" },
      text: { de: "Quellen mit Versions-/Checksummen-Nachweis und die Kriterien mit ihrer Erwartungs-Grundlage. Jede Quelle wird von einem Menschen mit Name und Begründung freigegeben, bevor sie in die Prüfung einfließt.",
              en: "Sources with version/checksum proof and the criteria with their expectation basis. Every source is approved by a human with name and rationale before it enters the review." },
      ask: { de: "Was sind die Quellen?", en: "What are the sources?" } },
    "privacy-badge": {
      title: { de: "Datenschutz-Schleuse", en: "Privacy airlock" },
      text: { de: "Das grüne Schild zeigt: Personenbezogene Daten werden vor jedem externen Kanal erkannt, ersetzt und nachgeprüft. Ein Klick öffnet die Details.",
              en: "The green shield shows: personal data is detected, replaced and re-checked before every external channel. Click for the details." },
      ask: { de: "Was ist die Datenschutz-Schleuse?", en: "What is the privacy airlock?" } },
    "bridge": {
      title: { de: "Bridge-Status", en: "Bridge status" },
      text: { de: "Der Punkt zeigt, ob der lokale Brückendienst antwortet: grün = verbunden, rot = gestört. Bei rot: Dienst neu starten und die Seite neu laden.",
              en: "The dot shows whether the local bridge service responds: green = connected, red = impaired. If red: restart the service and reload." },
      ask: { de: "Was ist die Bridge?", en: "What is the bridge?" } },
    "foot-synthetic": {
      title: { de: "Synthetische Daten", en: "Synthetic data" },
      text: { de: "Diese Prüfung läuft ausschließlich mit fabrizierten Testdaten — keine echten Personaldaten. Die Berichtsvorlage ist synthetisch, deshalb enthält der Bericht keine Konformitätsaussage.",
              en: "This review runs on fabricated test data only — no real personal data. The report template is synthetic, so the report makes no conformance claim." },
      ask: { de: "Warum synthetische Daten?", en: "Why synthetic data?" } },
    "lang-toggle": { ask: null },
    "theme-toggle": {
      title: { de: "Darstellung umschalten", en: "Toggle appearance" },
      text: { de: "Zwischen hellem und dunklem Design umschalten.", en: "Switch between light and dark design." },
      ask: null },
    "whats-this": {
      title: { de: "Erklärmodus", en: "Explain mode" },
      text: { de: "Gerade aktiv: Klicken Sie irgendein Element und SÜSIE erklärt es hier im Flyover. ESC beendet den Modus.",
              en: "Currently active: click any element and SÜSIE explains it in this flyover. ESC exits the mode." },
      ask: null },
    "help-support": {
      title: { de: "Hilfe & Support", en: "Help & support" },
      text: { de: "Öffnet die Hilfe: Was SÜSIE kann, Fehlerbehebung und der Erklärmodus.",
              en: "Opens help: what SÜSIE can do, troubleshooting and explain mode." },
      ask: null },
  };
  const helpPanel = $("help-panel");
  let helpOpen = false;

  function askSUSIE(question) {
    setMode(S.mode === "fullscreen" ? "fullscreen" : "overlay");
    if (!S.busy) sendMessage(question);
  }

  function renderHelpPanel() {
    helpPanel.textContent = "";
    helpPanel.appendChild(el("strong", "help-title", t("helpTitle")));
    const intro = el("p", "help-intro");
    intro.textContent = (LANG === "de"
      ? "Ich bin SÜSIE — Ihre Assistentin für diese Systemprüfung. Ich kenne jeden Prüffall, jede Quelle und jeden Beleg; ich erkläre, führe aus und protokolliere. Entscheidungen treffen Sie."
      : "I am SÜSIE — your assistant for this system review. I know every case, every source and every piece of evidence; I explain, execute and record. You make the decisions.");
    helpPanel.appendChild(intro);

    helpPanel.appendChild(el("h3", null, t("helpCapsTitle")));
    const caps = el("ul", "help-list");
    for (const c of t("helpCaps")) caps.appendChild(el("li", "", c));
    helpPanel.appendChild(caps);
    const askRow = el("div", "help-actions");
    const askBtn = el("button", "help-act", t("helpAsk"));
    askBtn.addEventListener("click", () => { closeHelp(); askSUSIE(LANG === "de" ? "Hilfe" : "Help"); });
    askRow.appendChild(askBtn);
    helpPanel.appendChild(askRow);

    helpPanel.appendChild(el("h3", null, t("helpTroubleTitle")));
    const tips = el("ul", "help-list");
    for (const c of t("helpTrouble")) tips.appendChild(el("li", "", c));
    helpPanel.appendChild(tips);
    const troubleRow = el("div", "help-actions");
    const tBtn = el("button", "help-act", t("helpTroubleAsk"));
    tBtn.addEventListener("click", () => {
      closeHelp();
      askSUSIE(LANG === "de" ? "Etwas funktioniert nicht" : "Something is not working");
    });
    troubleRow.appendChild(tBtn);
    helpPanel.appendChild(troubleRow);

    helpPanel.appendChild(el("h3", null, t("helpWhatsThisTitle")));
    helpPanel.appendChild(el("p", "help-intro", t("helpWhatsThisText")));
    const wtRow = el("div", "help-actions");
    const wtBtn = el("button", "help-act", t("helpStartWhatsThis"));
    wtBtn.addEventListener("click", () => {
      closeHelp();
      setWhatsThis(true);
    });
    wtRow.appendChild(wtBtn);
    helpPanel.appendChild(wtRow);
  }

  function closeHelp() {
    helpOpen = false;
    helpPanel.hidden = true;
  }
  $("help-support").addEventListener("click", (e) => {
    e.stopPropagation();  // the outside-click closer must not instantly undo the toggle
    helpOpen = !helpOpen;
    if (helpOpen) renderHelpPanel();
    helpPanel.hidden = !helpOpen;
  });
  // clicking anywhere outside the panel (or its button) dismisses it
  document.addEventListener("click", (e) => {
    if (!helpOpen) return;
    if (e.target.closest("#help-panel") || e.target.closest("#help-support")) return;
    closeHelp();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && helpOpen) closeHelp();
  });

  // -- Windows-9x "What's this?" mode: ? cursor, click element, SÜSIE flyover ----
  let whatsOn = false;
  const whatsTip = $("whats-tip");

  function setWhatsThis(on) {
    whatsOn = on;
    document.body.classList.toggle("whats-this", on);
    $("whats-this").setAttribute("aria-pressed", String(on));
    $("whats-hint").textContent = t("whatsHint");
    $("whats-hint").hidden = !on;
    if (!on) whatsTip.hidden = true;
  }

  function showWhatsTip(target, id) {
    const info = id ? HELP_UI[id] : null;
    const known = id && info && info.text;
    if (!known) { whatsTip.hidden = true; return; }  // no info → nothing displayed (owner rule)
    whatsTip.textContent = "";
    whatsTip.appendChild(el("strong", null, info.title[LANG]));
    const txt = info.text[LANG];
    for (const line of txt.split("\n")) whatsTip.appendChild(el("p", null, line));
    const ask = info && info.ask;
    if (ask) {
      const btn = el("button", "help-act", t("helpAsk"));
      btn.addEventListener("click", () => {
        setWhatsThis(false);
        askSUSIE(ask[LANG]);
      });
      whatsTip.appendChild(btn);
    }
    whatsTip.hidden = false;
    const r = target.getBoundingClientRect();
    const tw = whatsTip.offsetWidth, th = whatsTip.offsetHeight;
    let top = r.bottom + 8;
    if (top + th > window.innerHeight - 8) top = Math.max(8, r.top - th - 8);
    let left = Math.min(Math.max(8, r.left), window.innerWidth - tw - 8);
    whatsTip.style.top = `${top}px`;
    whatsTip.style.left = `${left}px`;
  }

  $("whats-this").addEventListener("click", () => setWhatsThis(!whatsOn));
  document.addEventListener("click", (e) => {
    if (!whatsOn) return;
    if (e.target.closest("#whats-tip") || e.target.closest("#whats-this")) return;
    e.preventDefault();
    e.stopPropagation();
    const holder = e.target.closest("[data-help]");
    showWhatsTip(holder || e.target, holder?.dataset.help || null);
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && whatsOn) setWhatsThis(false);
  });

  // change-detection: the 20 s poll must never re-render (and snap shut the
  // evidence the reviewer is reading) when the store data is unchanged
  let lastStateSig = "";
  async function loadState() {
    try {
      const r = await fetch("/api/state");
      const body = await r.json();
      if (body.ok) {
        const sig = JSON.stringify([body.cases, body.report, body.source, body.template, body.criteria,
                                    body.requirements, body.harness, body.seal, body.backend]);
        S.appState = body;
        if (sig !== lastStateSig) {
          lastStateSig = sig;
          withViewGuard("cases", renderCases); withViewGuard("report", renderReport); withViewGuard("sources", renderSources);; withViewGuard("trust", renderTrust);
        }
      }
    } catch {
      // bridge down: an eternal "Lade …" would be a dishonest loading state
      const list = $("case-list");
      if (list && S.appState === null && list.querySelector(".empty")?.textContent === t("loading")) {
        list.textContent = "";
        list.appendChild(el("div", "empty", t("emptyCases")));
      }
    }
  }
  applyI18n();
  $("case-list").appendChild(el("div", "empty", t("loading")));  // honest first paint
  $("susie-fab").hidden = false;  // boot state is "closed" — the flyover is the entry
  loadState();
  window.addEventListener("susie:state-refresh", loadState);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && S.mode === "overlay") setMode("closed");
  });
  setInterval(() => { if (!S.busy) loadState(); }, 20000);
})();
