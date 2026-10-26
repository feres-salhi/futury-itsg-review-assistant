/* SÜSIE wizard surfaces — chat controller, action bus, streaming reveal.
   Governance: this file renders; it never approves. Decisions go through
   POST /api/action with the human's explicit click, and the audit trail
   names the human. All model output is rendered as literal text. */
"use strict";

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
      cases: "Fälle", report: "Protokoll", sources: "Quellen",
      topTitle: "Fälle",
      topSub: "Systemüberprüfung sozialversicherungsrechtlicher IT-Ergebnisse",
      ask: "Fragen Sie SÜSIE …", yourName: "Ihr Name …", start: "Starten",
      onboard: () => `${timeGreeting()}. Ich bin SÜSIE. Mit wem arbeite ich?`,
      greet: (n) => `${timeGreeting()}, ${n}. Fragen Sie mich – z. B. „Wo stehe ich?“ oder „Warum weicht TC-002 ab?“`,
      hello: (n) => `${timeGreeting()}, ${n}! Schön, dass Sie da sind. Ich bin Ihre Assistentin für diese Prüfung – ich erkläre Ihnen jeden Fall in allen Details, zeige Nachweise und Belege, springe für Sie zu den Quellen, fasse den Prüfstand auf den Punkt und führe Schritte auf Ihr Wort aus. Behandeln Sie mich wie die Kollegin, die immer Bescheid weiß – worauf möchten Sie zuerst schauen?`,
      bottomNote: "Synthetische Daten · keine Konformitäts- oder Rechtsauffassung",
      connecting: "Verbinde …", bridgeOk: "Bridge verbunden", bridgeBad: "Bridge gestört",
      bridgeOff: "Bridge offline — Frontend zeigt synthetischen Leerzustand",
      fullscreenTag: "Vollbild-Modus", overlayBtn: "Overlay-Modus",
      toFullscreen: "Vollbild-Modus", openFab: "SÜSIE Assistentin öffnen",
      themeTitle: "Hell / Dunkel umschalten",
      emptyCases: "Keine Fälle (Filter anpassen oder Bridge starten).",
      emptyReport: "Keine Konformitätsprüfungen im Store.",
      emptySources: "Keine Quellen im Store.",
      reportWarn: "Synthetische Vorlage — keine Konformitäts- oder Rechtsauffassung. Release bleibt deaktiviert.",
      reportWarnBad: "Konformitätsanspruch aktiv — das darf im Prototyp nicht vorkommen.",
      yes: "Ja, ausführen", no: "Nein",
      done: (d) => `Ausgeführt — ${d}. (Entscheidung: ${S.reviewer}, Ausführung: SÜSIE)`,
      manual: "Verstanden — ich beschreibe Ihnen den Schritt manuell. (Sie behalten die Kontrolle.)",
      failed: (m) => `Nicht ausgeführt: ${m}`,
      expected: "Erwartet", observed: "Beobachtet", basis: "Erwartungsgrundlage",
      evidence: "Nachweis", execution: "Ausführung",
      exportBtn: "Protokoll exportieren", exportMsg: "Exportiere das Protokoll.",
      exportNote: "SÜSIE schlägt den Export vor — Ihre Bestätigung, ihre Ausführung.",
      exportDone: "Protokoll exportiert",
    },
    en: {
      cases: "Cases", report: "Report", sources: "Sources",
      topTitle: "Cases",
      topSub: "Systematic review of social-insurance IT results",
      ask: "Ask SÜSIE …", yourName: "Your name …", start: "Start",
      onboard: () => `${timeGreeting()}. I am SÜSIE. Who am I working with?`,
      greet: (n) => `${timeGreeting()}, ${n}. Ask me anything – e.g. “Where do I stand?” or “Why does TC-002 deviate?”`,
      hello: (n) => `${timeGreeting()}, ${n}! Great to have you. I am your assistant for this review – I explain every case in detail, open evidence and records, jump to the sources for you, summarize exactly where the review stands, and execute steps on your word. Treat me like the colleague who always knows the file – what would you like to look at first?`,
      bottomNote: "Synthetic data · no conformance or legal claim",
      connecting: "Connecting …", bridgeOk: "Bridge connected", bridgeBad: "Bridge impaired",
      bridgeOff: "Bridge offline — frontend shows synthetic empty state",
      fullscreenTag: "Fullscreen mode", overlayBtn: "Overlay mode",
      toFullscreen: "Fullscreen mode", openFab: "Open SÜSIE assistant",
      themeTitle: "Toggle light / dark",
      emptyCases: "No cases (adjust the filter or start the bridge).",
      emptyReport: "No conformance checks in the store.",
      emptySources: "No sources in the store.",
      reportWarn: "Synthetic template — no conformance or legal claim. Release stays disabled.",
      reportWarnBad: "Conformance claim active — this must not happen in the prototype.",
      yes: "Yes, execute", no: "No",
      done: (d) => `Executed — ${d}. (Decision: ${S.reviewer}, executor: SÜSIE)`,
      manual: "Understood — I will walk you through the step manually. (You stay in control.)",
      failed: (m) => `Not executed: ${m}`,
      expected: "Expected", observed: "Observed", basis: "Expected basis",
      evidence: "Evidence", execution: "Execution",
      exportBtn: "Export report", exportMsg: "Export the report.",
      exportNote: "SÜSIE proposes the export — your confirmation, her execution.",
      exportDone: "Report exported",
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

  const ACTION_TITLES = {
    select_case: { de: "Fall auswählen", en: "Select case" },
    open_evidence: { de: "Nachweise öffnen", en: "Open evidence" },
    filter_cases: { de: "Fälle filtern", en: "Filter cases" },
    jump_to_source: { de: "Zur Quelle springen", en: "Jump to source" },
    show_comparison: { de: "Vergleich anzeigen", en: "Show comparison" },
    switch_mode: { de: "Modus wechseln", en: "Switch mode" },
    save_note: { de: "Notiz speichern", en: "Save note" },
    export_report: { de: "Protokoll exportieren", en: "Export report" },
    run_comparison: { de: "Vergleich neu ausführen", en: "Re-run comparison" },
    initiate_review_flow: { de: "Prüffluss starten", en: "Start review flow" },
    record_review_state: { de: "Prüfentscheid dokumentieren", en: "Record review decision" },
    record_conformance: { de: "Konformität bewerten", en: "Record conformance" },
    request_release: { de: "Release-Anfrage aufnehmen", en: "Record release request" },
  };

  function applyI18n() {
    document.documentElement.lang = LANG;
    document.querySelectorAll(".side-link").forEach((b) => {
      b.querySelector("span").textContent = I18N[LANG][b.dataset.view];
    });
    $("topbar-title").textContent = t("topTitle");
    $("topbar-sub").textContent = t("topSub");
    $("susie-fab").setAttribute("aria-label", t("openFab"));
    $("susie-fab").title = t("openFab");
    $("theme-toggle").title = t("themeTitle");
    $("susie-mode-tag").textContent = t("fullscreenTag");
    $("to-overlay").querySelector("span").textContent = t("overlayBtn");
    $("bottom-note").textContent = t("bottomNote");
    $("bridge-label").textContent = $("bridge-dot").classList.contains("ok") ? t("bridgeOk") : t("bridgeBad");
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
    filter: "",
    selectedCase: null,
    openEvidence: new Set(),
    busy: false,
  };

  // =========================================================================
  // Action bus — the takeover surface. Whitelisted, event-emitting, and the
  // ONLY way chat-driven actions touch the app.
  // =========================================================================
  const listeners = new Map();
  const emit = (ev, detail) => (listeners.get(ev) || []).forEach((f) => { try { f(detail); } catch {} });

  const READ_ONLY = new Set(["select_case", "open_evidence", "filter_cases", "jump_to_source", "show_comparison", "switch_mode"]);

  const clientExec = {
    select_case({ case_id }) {
      S.selectedCase = case_id; S.view = "cases"; showView("cases");
      renderCases();
      const card = document.querySelector(`[data-case="${CSS.escape(case_id)}"]`);
      if (card) { card.scrollIntoView({ block: "center" }); flash(card); }
      return { executed: true, detail: `Fall ${case_id} ausgewählt` };
    },
    open_evidence({ case_id }) {
      S.selectedCase = case_id; S.openEvidence.add(case_id);
      S.view = "cases"; showView("cases"); renderCases();
      const card = document.querySelector(`[data-case="${CSS.escape(case_id)}"]`);
      if (card) { card.scrollIntoView({ block: "center" }); flash(card); }
      return { executed: true, detail: `Nachweise zu ${case_id} geöffnet` };
    },
    filter_cases({ filter }) {
      S.filter = String(filter ?? ""); renderCases();
      return { executed: true, detail: S.filter ? `Filter „${S.filter}“ aktiv` : "Filter zurückgesetzt" };
    },
    jump_to_source({ ref }) {
      S.view = "sources"; showView("sources"); renderSources();
      const target = document.getElementById(`src-${CSS.escape(ref || "")}`) || document.querySelector(".card");
      if (target) { target.scrollIntoView({ block: "center" }); flash(target); }
      return { executed: true, detail: "Zur Quelle gesprungen" };
    },
    show_comparison({ case_id }) {
      S.selectedCase = case_id; S.openEvidence.add(case_id);
      S.view = "cases"; showView("cases"); renderCases();
      const card = document.querySelector(`[data-case="${CSS.escape(case_id)}"]`);
      if (card) { card.scrollIntoView({ block: "center" }); flash(card); }
      return { executed: true, detail: `Vergleich für ${case_id} angezeigt` };
    },
    switch_mode({ mode }) {
      setMode(mode === "fullscreen" ? "fullscreen" : "overlay");
      return { executed: true, detail: mode === "fullscreen" ? "Vollbild-Modus" : "Overlay-Modus" };
    },
  };

  async function invoke(actionId, params = {}, confirmToken = null) {
    if (!READ_ONLY.has(actionId)) {
      const res = await fetch("/api/action", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: S.sessionId, action_id: actionId,
          params, confirm_token: confirmToken, reviewer: S.reviewer,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.ok === false) {
        const err = new Error(body.error || `Aktion fehlgeschlagen (HTTP ${res.status})`);
        err.actionResult = "err"; throw err;
      }
      emit("action_executed", { actionId, result: body.result });
      return body.result;
    }
    const fn = clientExec[actionId];
    if (!fn) { const e = new Error(`Unbekannte Aktion: ${actionId}`); e.actionResult = "err"; throw e; }
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

  // =========================================================================
  // Views
  // =========================================================================
  function showView(v) {
    S.view = v;
    for (const id of ["cases", "report", "sources"]) $(`view-${id}`).hidden = id !== v;
    document.querySelectorAll(".side-link").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === v));
    emit("view_changed", { view: v });
  }

  const badge = (status) => {
    const cls = status === "PASS" ? "badge-pass" : status === "MISMATCH" ? "badge-mismatch" : "badge-not-evaluated";
    return el("span", `badge ${cls}`, status);
  };

  function renderCases() {
    const list = $("case-list"); list.textContent = "";
    const cases = (S.appState?.cases || []).filter((c) =>
      !S.filter || JSON.stringify(c).toLowerCase().includes(S.filter.toLowerCase()));

    const counts = {};
    for (const c of S.appState?.cases || []) counts[c.status] = (counts[c.status] || 0) + 1;
    const chips = $("case-summary"); chips.textContent = "";
    for (const [st, n] of Object.entries(counts)) {
      const b = el("span", `badge ${st === "PASS" ? "badge-pass" : st === "MISMATCH" ? "badge-mismatch" : "badge-not-evaluated"}`, `${n} ${st}`);
      chips.appendChild(b);
    }
    if (!cases.length) { list.appendChild(el("div", "empty", t("emptyCases"))); return; }

    for (const c of cases) {
      const isOpen = S.openEvidence.has(c.id);
      const card = el("article", "card clickable");
      card.dataset.case = c.id || "";
      if (c.id === S.selectedCase) card.classList.add("selected");
      const head = el("div", "card-head");
      head.appendChild(el("span", "card-title", c.id || "Fall"));
      head.appendChild(badge(c.status || "NOT_EVALUATED"));
      if (c.case_type && c.case_type !== "normal") head.appendChild(el("span", "badge badge-neutral", c.case_type));
      card.appendChild(head);
      card.appendChild(el("p", "card-meta",
        `${c.criterion_id || "—"} · ${c.software?.vendor || "unbekannt"} ${c.software?.version || ""}`.trim()));
      if (c.reason) card.appendChild(el("p", "card-reason", c.reason));

      if (isOpen) {
        const kv = el("dl", "kv");
        const row = (k, v) => { kv.appendChild(el("dt", "", k)); kv.appendChild(el("dd", "", String(v ?? "—"))); };
        row(t("expected"), JSON.stringify(c.expected));
        row(t("observed"), JSON.stringify(c.observed));
        row(t("basis"), c.expected_basis);
        row(t("evidence"), c.evidence_ref);
        row(t("execution"), `${c.evidence_ref || "—"} (${c.software?.vendor || "?"} Build ${c.software?.version || "?"})`);
        card.appendChild(kv);
        const chain = el("div", "bubble-extras");
        for (const step of ["RPT-1", c.evidence_ref, c.id, c.criterion_id, "REQ-1", "SRC-1"].filter(Boolean)) {
          const s = el("span", "chip source", step);
          s.addEventListener("click", (e) => { e.stopPropagation(); invoke("jump_to_source", { ref: "SRC-BP" }); });
          chain.appendChild(s);
        }
        card.appendChild(chain);
      }
      // collapse on click when open, expand when closed
      card.addEventListener("click", () => {
        if (isOpen) { S.openEvidence.delete(c.id); renderCases(); emit("evidence_closed", { caseId: c.id }); }
        else invoke("open_evidence", { case_id: c.id });
      });
      list.appendChild(card);
    }
  }

  function renderReport() {
    const body = $("report-body"); body.textContent = "";
    const r = S.appState?.report || {};
    const warn = el("div", "warning");
    warn.textContent = r.compliance_claim ? t("reportWarnBad") : (r.template_warning || t("reportWarn"));
    body.appendChild(warn);
    // report generation: primary entry for the human, flowing through SÜSIE's
    // yes/no confirmation (mutating action → confirm token → Ja)
    const genRow = el("div", "report-gen");
    const genBtn = el("button", "btn btn-gen", t("exportBtn"));
    genBtn.addEventListener("click", () => {
      setMode(S.mode === "fullscreen" ? "fullscreen" : "overlay");
      if (!S.reviewer) {
        // onboarding first — the audit record needs the human's name
        S.pendingMessage = t("exportMsg");
        return;
      }
      sendMessage(t("exportMsg"));
    });
    genRow.appendChild(genBtn);
    genRow.appendChild(el("span", "report-gen-note", t("exportNote")));
    body.appendChild(genRow);
    const card = el("div", "card");
    card.appendChild(el("h2", "", LANG === "de" ? "Konformitätsprüfungen" : "Conformance checks"));
    const conf = r.conformance || [];
    if (!conf.length) card.appendChild(el("p", "empty", t("emptyReport")));
    for (const c of conf) {
      const row = el("div", "card-head");
      row.appendChild(el("span", "card-title", c.check_id || c.id || "Prüfung"));
      row.appendChild(el("span", `badge ${c.status === "PASS" || c.status === "compliant" ? "badge-pass" : "badge-mismatch"}`, c.status || "?"));
      card.appendChild(row);
      if (c.detail) card.appendChild(el("p", "card-meta", c.detail));
    }
    body.appendChild(card);
  }

  function renderSources() {
    const body = $("sources-body"); body.textContent = "";
    const src = S.appState?.source;
    const tpl = S.appState?.template;
    if (src) {
      const card = el("div", "card"); card.id = `src-${src.id || ""}`;
      const head = el("div", "card-head");
      head.appendChild(el("span", "card-title", src.id || "Quelle"));
      head.appendChild(el("span", `badge ${src.status === "approved" ? "badge-pass" : "badge-not-evaluated"}`, src.status || ""));
      card.appendChild(head);
      card.appendChild(el("p", "card-meta", `${src.title || ""} · ${src.issuer || ""} · Version ${src.version || "?"}`));
      const kv = el("dl", "kv");
      kv.appendChild(el("dt", "", "Gültig ab")); kv.appendChild(el("dd", "", String(src.valid_from ?? "—")));
      kv.appendChild(el("dt", "", "SHA-256"));
      const dd = el("dd", "mono", src.checksum ? `${String(src.checksum).slice(0, 24)}…` : "—");
      kv.appendChild(dd);
      card.appendChild(kv);
      body.appendChild(card);
    }
    if (tpl) {
      const card = el("div", "card");
      const head = el("div", "card-head");
      head.appendChild(el("span", "card-title", tpl.id || "Vorlage"));
      head.appendChild(el("span", "badge badge-neutral", "SYNTHETISCH"));
      card.appendChild(head);
      card.appendChild(el("p", "card-meta", `Version ${tpl.version || "?"} · official_form_id: ${tpl.official_form_id ?? "null"}`));
      body.appendChild(card);
    }
    if (!src && !tpl) body.appendChild(el("div", "empty", t("emptySources")));
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
    const log = el("div", "chat-log"); root.appendChild(log);
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
        // every surface's composer unlocks now that the reviewer is named
        for (const r of [$("chat-overlay"), $("chat-full")]) {
          const c = r.querySelector(".composer input");
          const s = r.querySelector(".composer .send-btn");
          if (c) c.disabled = false;
          if (s) s.disabled = false;
        }
        if (S.pendingMessage) { const m = S.pendingMessage; S.pendingMessage = null; sendMessage(m); }
      });
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") go.click(); });
      comp.appendChild(input); comp.appendChild(go); ob.appendChild(comp);
      log.appendChild(ob); input.focus();
    } else {
      addBubble(log, "susie",
        t("greet", S.reviewer));
    }
    buildComposer(root);
  }

  function buildComposer(root) {
    const deg = el("div", "banner-degraded",
      "Meine Verbindung zum Wissensdienst ist unterbrochen – ich kann Sie aber manuell durch die Schritte führen.");
    deg.hidden = true; deg.dataset.degraded = "1"; root.appendChild(deg);

    const comp = el("div", "composer");
    const input = el("input");
    input.placeholder = t("ask"); input.maxLength = 2000;
    input.disabled = !S.reviewer;   // onboarding gate: no message before a named reviewer
    const send = svgBtn("send-btn", "M3 10h12M10 4l6 6-6 6");
    send.setAttribute("aria-label", "Senden");
    send.disabled = !S.reviewer;
    const submit = () => { const v = input.value.trim(); if (v && !S.busy) { input.value = ""; sendMessage(v); } };
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
  // under a live caret; reduced motion or a hidden pane reveals instantly.
  function revealText(bubble, text) {
    if (reducedMotion.matches || document.hidden) { bubble.textContent = text; return Promise.resolve(); }
    return new Promise((resolve) => {
      const caret = el("span", "caret"); bubble.appendChild(caret);
      const chunk = Math.max(1, Math.round(text.length / 160));
      let i = 0;
      const timer = setInterval(() => {
        if (document.hidden) i = text.length; else i = Math.min(text.length, i + chunk);
        bubble.textContent = text.slice(0, i);
        bubble.appendChild(caret);
        const sc = bubble.closest(".chat-log");
        if (sc) sc.scrollTop = sc.scrollHeight;
        if (i >= text.length) { clearInterval(timer); caret.remove(); resolve(); }
      }, 16);
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
        body: JSON.stringify({ session_id: S.sessionId, message: text, reviewer: S.reviewer }),
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
    if (reply.disclaimer) extras.appendChild(el("span", "badge-disclaimer", "Nicht im Datensatz — Allgemeinwissen"));
    for (const c of reply.citations || []) {
      const label = c.kind === "corpus" ? `${c.source_version_id || c.ref || "Quelle"}${c.locator ? " · " + c.locator : ""}` : (c.ref || "Beleg");
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
    }

    if (reply.action && reply.action.id) {
      targetLog.appendChild(actionCard(reply.action, reply.needs_confirmation));
      targetLog.scrollTop = targetLog.scrollHeight;
    }
    S.busy = false; if (send) send.disabled = false; input?.focus();
  }

  // Report generation deliverable: the formal PDF (itsg/report_pdf via the
  // bridge's /api/report/pdf), fetched after the confirmed export action.
  async function downloadReport() {
    const res = await fetch("/api/report/pdf");
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `PDF-Endpunkt ${res.status}`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = el("a");
    a.href = url;
    a.download = `SUSIE-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "")}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function actionCard(action, needsConfirmation) {
    const wrap = el("div", "msg msg-susie");
    const card = el("div", "action-card");
    card.appendChild(el("div", "action-title", ACTION_TITLES[action.id]?.[LANG] || action.id));
    card.appendChild(el("div", "action-params", JSON.stringify(action.params || {})));

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
      try {
        const result = await invoke(action.id, action.params || {}, action.confirm_token);
        const detail = result?.detail || result?.mode || (LANG === "de" ? "ausgeführt" : "executed");
        finish("ok", t("done", detail));
        if (action.id === "export_report") {
          try {
            await downloadReport();
            finish("ok", `${t("exportDone")} (PDF) — ${t("done", detail)}`);
          } catch (pdfErr) {
            finish("err", `${t("exportDone")} fehlgeschlagen: ${pdfErr.message}`);
          }
        }
        emit("action_executed", { actionId: action.id, result });
      } catch (e) {
        finish(e.actionResult || "err", t("failed", e.message));
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
  $("lang-toggle").addEventListener("click", () => {
    LANG = LANG === "de" ? "en" : "de";
    store.set("susie-ui-lang", LANG);
    applyI18n();
    renderCases(); renderReport(); renderSources();
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

  async function loadState() {
    try {
      const r = await fetch("/api/state");
      const body = await r.json();
      if (body.ok) { S.appState = body; renderCases(); renderReport(); renderSources(); }
    } catch { /* bottom bar shows offline state */ }
  }
  applyI18n();
  $("susie-fab").hidden = false;  // boot state is "closed" — the flyover is the entry
  loadState();
  window.addEventListener("susie:state-refresh", loadState);
  setInterval(() => { if (!S.busy) loadState(); }, 20000);
})();
