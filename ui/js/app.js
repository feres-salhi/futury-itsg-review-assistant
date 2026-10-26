// Task 4 UI — renders the test-case list, the test-case detail
// (expected vs observed), the report screen and the sources screen
// from the records in js/data.js.

const STATUS_STYLES = {
  "PASS": "badge-pass",
  "MISMATCH": "badge-mismatch",
  "NOT EVALUATED": "badge-not-evaluated"
};

function badge(status) {
  const style = STATUS_STYLES[status] || "badge-neutral";
  return `<span class="badge ${style}">${status}</span>`;
}

function findingFor(testCaseId) {
  return DATA.findings.find((f) => f.test_case_id === testCaseId) || null;
}

function executionFor(testCaseId) {
  return DATA.executions.find((r) => r.test_case_id === testCaseId) || null;
}

function criterionFor(id) {
  return DATA.criteria.find((c) => c.id === id) || null;
}

function requirementFor(id) {
  return DATA.requirements.find((r) => r.id === id) || null;
}

function sourceFor(id) {
  return DATA.sources.find((s) => s.id === id) || null;
}

/* ---------- Test-case list ---------- */

function renderTestCaseList() {
  const container = document.getElementById("test-case-list");
  const summary = document.getElementById("list-summary");

  const counts = { "PASS": 0, "MISMATCH": 0, "NOT EVALUATED": 0 };
  DATA.findings.forEach((f) => {
    if (counts[f.status] !== undefined) counts[f.status] += 1;
  });
  summary.innerHTML = `
    <p>
      ${counts["PASS"]} × ${badge("PASS")} &nbsp;
      ${counts["MISMATCH"]} × ${badge("MISMATCH")} &nbsp;
      ${counts["NOT EVALUATED"]} × ${badge("NOT EVALUATED")}
    </p>`;

  const rows = DATA.testCases
    .map((tc) => {
      const finding = findingFor(tc.id);
      const status = finding ? finding.status : "NOT EVALUATED";
      return `
        <tr class="clickable" data-case="${tc.id}">
          <td>${tc.id}</td>
          <td>${tc.title}</td>
          <td>${tc.kind}</td>
          <td>${tc.review_status}</td>
          <td>${badge(status)}</td>
        </tr>`;
    })
    .join("");
  container.innerHTML = `
    <table>
      <thead>
        <tr><th>ID</th><th>Test case</th><th>Kind</th><th>Review</th><th>Result</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  container.querySelectorAll("tr.clickable").forEach((row) => {
    row.addEventListener("click", () => showTestCaseDetail(row.dataset.case));
  });
}

/* ---------- Test-case detail ---------- */

function evidenceChainFor(testCaseId) {
  // The full chain: report → finding → execution → test case → criterion → requirement → source.
  const tc = DATA.testCases.find((t) => t.id === testCaseId);
  const finding = findingFor(testCaseId);
  const execution = executionFor(testCaseId);
  const criterion = tc ? criterionFor(tc.criterion_id) : null;
  const requirement = criterion ? requirementFor(criterion.requirement_id) : null;

  const steps = [{ kind: "report", id: DATA.report.id }];
  if (execution) steps.push({ kind: "run", id: execution.id });
  steps.push({ kind: "case", id: testCaseId });
  if (criterion) steps.push({ kind: "criterion", id: criterion.id });
  if (requirement) steps.push({ kind: "requirement", id: requirement.id });
  if (requirement) steps.push({ kind: "source", id: requirement.source_id });

  // Only requirement and source have detail cards to jump to; the rest
  // are plain text in this skeleton.
  return steps
    .map((s) => {
      const jumpable = s.kind === "requirement" || s.kind === "source";
      const label = jumpable
        ? `<button class="chain-link" data-jump="${s.id}">${s.id}</button>`
        : `<span class="chain-step">${s.id}</span>`;
      return `${label}<span class="chain-arrow">→</span>`;
    })
    .join("")
    .replace(/<span class="chain-arrow">→<\/span>$/, "");
}

function showTestCaseDetail(testCaseId) {
  const tc = DATA.testCases.find((t) => t.id === testCaseId);
  const finding = findingFor(testCaseId);
  const execution = executionFor(testCaseId);
  const detail = document.getElementById("test-case-detail");

  const observedSection = execution
    ? renderComparison(tc.expected, execution.observed)
    : `<p class="warning">No execution output for this case — result cannot be evaluated.</p>`;

  detail.innerHTML = `
    <h3>${tc.id} — ${tc.title}</h3>
    <p>Criterion: ${tc.criterion_id} · Kind: ${tc.kind} · Review: ${tc.review_status}
       (by ${tc.review.reviewer} at ${tc.review.timestamp})</p>
    <h4>Inputs</h4>
    <pre>${JSON.stringify(tc.inputs, null, 2)}</pre>
    <h4>Expected basis</h4>
    <p>${tc.expected_basis}</p>
    <h4>Expected vs. observed</h4>
    ${observedSection}
    <h4>Finding</h4>
    <p>${badge(finding ? finding.status : "NOT EVALUATED")} ${finding ? finding.reason : ""}</p>
    <h4>Evidence chain (click requirement or source)</h4>
    <p class="chain">${evidenceChainFor(testCaseId)}</p>
    <button id="back-to-list">← Back to list</button>`;

  document.getElementById("back-to-list").addEventListener("click", showListView);
  detail.querySelectorAll("[data-jump]").forEach((btn) => {
    btn.addEventListener("click", () => jumpToItem(btn.dataset.jump));
  });

  switchTab("cases");
  document.getElementById("test-case-list-view").hidden = true;
  detail.hidden = false;
}

function renderComparison(expected, observed) {
  const keys = new Set([...Object.keys(expected), ...Object.keys(observed)]);
  const rows = [...keys]
    .map((key) => {
      const match = expected[key] === observed[key];
      const cls = match ? "match" : "mismatch";
      return `<tr class="${cls}">
          <td>${key}</td>
          <td>${expected[key] ?? "—"}</td>
          <td>${observed[key] ?? "—"}</td>
          <td>${match ? "✓" : "✗ differs"}</td>
        </tr>`;
    })
    .join("");
  return `
    <table>
      <thead><tr><th>Field</th><th>Expected</th><th>Observed</th><th>Result</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function showListView() {
  switchTab("cases");
}

/* ---------- Report ---------- */

function renderReport() {
  const report = DATA.report;
  const container = document.getElementById("report-view");

  const checks = report.conformance
    .map(
      (c) => `
      <li>${c.check}: <strong>${c.status}</strong>${c.detail ? ` — ${c.detail}` : ""}</li>`
    )
    .join("");

  const reviewEvents = DATA.testCases
    .map(
      (tc) => `
      <tr>
        <td>${tc.id}</td>
        <td>${tc.review.reviewer}</td>
        <td>${tc.review.decision}</td>
        <td>${tc.review.timestamp}</td>
      </tr>`
    )
    .join("");

  container.innerHTML = `
    <h3>Report ${report.id}</h3>
    <p>Template: ${report.template_id}</p>
    <p>Renderer: ${report.renderer_version}</p>
    <div class="warning">
      Because a conformance check failed, this report may <strong>not</strong> be signed off
      as compliant until the issue is corrected and re-checked.
    </div>
    <h4>Conformance checks</h4>
    <ul>${checks}</ul>
    <h4>Findings included</h4>
    <ul>${report.findings.map((id) => `<li>${id} ${badge(findingFor(id)?.status || "NOT EVALUATED")}</li>`).join("")}</ul>
    <h4>Human review events</h4>
    <table>
      <thead><tr><th>Test case</th><th>Reviewer</th><th>Decision</th><th>Timestamp</th></tr></thead>
      <tbody>${reviewEvents}</tbody>
    </table>
    <p class="warning">${report.limitations}</p>`;
}

/* ---------- Sources & requirements ---------- */

function renderSources() {
  const container = document.getElementById("sources-view");

  const sourceCards = DATA.sources
    .map(
      (s) => `
      <div class="card" id="item-${s.id}">
        <h4>${s.id} — ${s.title}</h4>
        <p>Issuer: ${s.issuer} · Version: ${s.version}</p>
        <p class="evidence">Citation: ${s.citation}</p>
      </div>`
    )
    .join("");

  const requirementCards = DATA.requirements
    .map((r) => {
      const src = sourceFor(r.source_id);
      return `
      <div class="card" id="item-${r.id}">
        <h4>${r.id} ${badge(r.status)}</h4>
        <p>${r.text}</p>
        <p class="evidence">From ${r.source_id} (${r.citation})
          <button class="chain-link" data-jump="${r.source_id}">show source</button>
        </p>
      </div>`;
    })
    .join("");

  const criterionCards = DATA.criteria
    .map(
      (c) => `
      <div class="card" id="item-${c.id}">
        <h4>${c.id} ${badge(c.status)}</h4>
        <p>${c.text}</p>
        <p class="evidence">Approved by ${c.approved_by} · derived from ${c.requirement_id}
          <button class="chain-link" data-jump="${c.requirement_id}">show requirement</button>
        </p>
      </div>`
    )
    .join("");

  container.innerHTML = `
    <h3>Sources</h3>
    ${sourceCards}
    <h3>Requirements (candidates until a human approves them)</h3>
    ${requirementCards}
    <h3>Testable criteria (human-approved)</h3>
    ${criterionCards}`;

  container.querySelectorAll("[data-jump]").forEach((btn) => {
    btn.addEventListener("click", () => jumpToItem(btn.dataset.jump));
  });
}

function jumpToItem(id) {
  switchTab("sources");
  const target = document.getElementById("item-" + id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.remove("flash");
    void target.offsetWidth; // restart the CSS animation
    target.classList.add("flash");
  }
}

/* ---------- Tabs ---------- */

function switchTab(tab) {
  document.getElementById("test-case-list-view").hidden = tab !== "cases";
  document.getElementById("test-case-detail").hidden = true;
  document.getElementById("report-view").hidden = tab !== "report";
  document.getElementById("sources-view").hidden = tab !== "sources";
  document.getElementById("tab-cases").classList.toggle("active", tab === "cases");
  document.getElementById("tab-report").classList.toggle("active", tab === "report");
  document.getElementById("tab-sources").classList.toggle("active", tab === "sources");
}

document.getElementById("tab-cases").addEventListener("click", () => switchTab("cases"));
document.getElementById("tab-report").addEventListener("click", () => switchTab("report"));
document.getElementById("tab-sources").addEventListener("click", () => switchTab("sources"));

renderTestCaseList();
renderReport();
renderSources();
showListView();
