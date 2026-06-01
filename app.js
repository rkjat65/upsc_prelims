const DATA = window.DASHBOARD_DATA;
const COLORS = ["#2563eb", "#18875a", "#b7791f", "#d14b4b", "#0e7490", "#6d5bd0", "#2f855a", "#e07a5f", "#3d405b", "#8d6e63"];

const state = {
  subject: "All",
  confidence: "All",
  signal: "All",
  search: "",
};

const traceState = {
  subject: "All",
  unit: "All",
  topic: "All",
  search: "",
};

const layoutBase = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  margin: { t: 24, r: 20, b: 70, l: 60 },
  font: { family: "Inter, Segoe UI, sans-serif", color: "#F3F5F9" },
  xaxis: { gridcolor: "#2D3544", zerolinecolor: "#3D4859" },
  yaxis: { gridcolor: "#2D3544", zerolinecolor: "#3D4859" },
};

const config = { displayModeBar: false, responsive: true };

function number(value) {
  return Number(value || 0);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function populateSelect(id, values, label = "All") {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = "";
  [label, ...values].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function initControls() {
  populateSelect("subjectFilter", unique(DATA.syllabusMap.map((d) => d.Subject)));
  populateSelect("confidenceFilter", unique(DATA.syllabusMap.map((d) => d["Mapping Confidence"])));
  populateSelect("signalFilter", unique(DATA.syllabusMap.map((d) => d["Topic Signal"] || "Unsignalled")));

  document.getElementById("subjectFilter").addEventListener("change", (event) => {
    state.subject = event.target.value;
    updateAll();
  });
  document.getElementById("confidenceFilter").addEventListener("change", (event) => {
    state.confidence = event.target.value;
    updateAll();
  });
  document.getElementById("signalFilter").addEventListener("change", (event) => {
    state.signal = event.target.value;
    updateAll();
  });
  document.getElementById("searchBox").addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    updateTables();
  });
  document.getElementById("resetFilters").addEventListener("click", () => {
    state.subject = "All";
    state.confidence = "All";
    state.signal = "All";
    state.search = "";
    document.getElementById("subjectFilter").value = "All";
    document.getElementById("confidenceFilter").value = "All";
    document.getElementById("signalFilter").value = "All";
    document.getElementById("searchBox").value = "";
    updateAll();
  });
  document.getElementById("downloadReport").addEventListener("click", () => window.print());

  if (document.getElementById("traceSubjectFilter")) {
    populateSelect("traceSubjectFilter", unique(DATA.pyqTraceRows.map((d) => d.Subject)));
    populateTraceUnits();
    populateTraceTopics();
    document.getElementById("traceSubjectFilter").addEventListener("change", (event) => {
      traceState.subject = event.target.value;
      traceState.unit = "All";
      traceState.topic = "All";
      populateTraceUnits();
      populateTraceTopics();
      updateTraceView();
    });
    document.getElementById("traceUnitFilter").addEventListener("change", (event) => {
      traceState.unit = event.target.value;
      traceState.topic = "All";
      populateTraceTopics();
      updateTraceView();
    });
    document.getElementById("traceTopicFilter").addEventListener("change", (event) => {
      traceState.topic = event.target.value;
      updateTraceView();
    });
    document.getElementById("traceSearchBox").addEventListener("input", (event) => {
      traceState.search = event.target.value.trim().toLowerCase();
      updateTraceView();
    });
    document.getElementById("resetTrace").addEventListener("click", () => {
      traceState.subject = "All";
      traceState.unit = "All";
      traceState.topic = "All";
      traceState.search = "";
      document.getElementById("traceSubjectFilter").value = "All";
      document.getElementById("traceSearchBox").value = "";
      populateTraceUnits();
      populateTraceTopics();
      updateTraceView();
    });
  }
}

function filteredMap() {
  return DATA.syllabusMap.filter((row) => {
    const subjectOk = state.subject === "All" || row.Subject === state.subject;
    const confidenceOk = state.confidence === "All" || row["Mapping Confidence"] === state.confidence;
    const signal = row["Topic Signal"] || "Unsignalled";
    const signalOk = state.signal === "All" || signal === state.signal;
    if (!subjectOk || !confidenceOk || !signalOk) return false;
    if (!state.search) return true;
    const text = `${row.Question} ${row.Subject} ${row.Unit} ${row.Topic} ${row["Topic ID"]}`.toLowerCase();
    return text.includes(state.search);
  });
}

function setKpis() {
  const totals = DATA.meta.totals;
  document.getElementById("kpiTotal").textContent = (totals.totalPyqs || totals.historicalQuestions).toLocaleString("en-IN");
  document.getElementById("kpi2026").textContent = totals.questions2026;
  document.getElementById("kpiTopics").textContent = totals.topics2026;
  document.getElementById("kpiRare").textContent = totals.rare2026;
}

function populateTraceUnits() {
  const units = DATA.pyqTraceRows
    .filter((row) => traceState.subject === "All" || row.Subject === traceState.subject)
    .map((row) => row.Unit);
  populateSelect("traceUnitFilter", unique(units));
  document.getElementById("traceUnitFilter").value = traceState.unit;
}

function populateTraceTopics() {
  const topics = DATA.pyqTraceRows
    .filter((row) => traceState.subject === "All" || row.Subject === traceState.subject)
    .filter((row) => traceState.unit === "All" || row.Unit === traceState.unit)
    .map((row) => row.Topic);
  populateSelect("traceTopicFilter", unique(topics));
  document.getElementById("traceTopicFilter").value = traceState.topic;
}

function filteredTraceRows() {
  return DATA.pyqTraceRows.filter((row) => {
    if (traceState.subject !== "All" && row.Subject !== traceState.subject) return false;
    if (traceState.unit !== "All" && row.Unit !== traceState.unit) return false;
    if (traceState.topic !== "All" && row.Topic !== traceState.topic) return false;
    if (!traceState.search) return true;
    const text = `${row["Q#"]} ${row.Year} ${row.Subject} ${row.Unit} ${row.Topic} ${row["Topic ID"]} ${row.Question}`.toLowerCase();
    return text.includes(traceState.search);
  });
}

function renderSubjectBar() {
  const rows = [...DATA.subjectCompare].sort((a, b) => number(b["2026 Count"]) - number(a["2026 Count"]));
  Plotly.newPlot("subjectBar", [
    {
      type: "bar",
      orientation: "h",
      y: rows.map((r) => r.Subject).reverse(),
      x: rows.map((r) => number(r["2026 Count"])).reverse(),
      name: "2026 Count",
      marker: { color: "#2563eb" },
      hovertemplate: "%{y}<br>2026: %{x}<extra></extra>",
    },
    {
      type: "scatter",
      mode: "markers",
      y: rows.map((r) => r.Subject).reverse(),
      x: rows.map((r) => number(r["2011-2025 Avg/Yr"])).reverse(),
      name: "Historical avg/year",
      marker: { color: "#d14b4b", size: 10, symbol: "diamond" },
      hovertemplate: "%{y}<br>Historical avg/year: %{x}<extra></extra>",
    },
  ], {
    ...layoutBase,
    barmode: "group",
    xaxis: { title: "Questions" },
    yaxis: { automargin: true },
    legend: { orientation: "h", y: -0.18 },
  }, config);
}

function renderTrendLine() {
  const rows = DATA.subjectTrend;
  const years = rows.map((r) => r.Year);
  const topSubjects = DATA.subjectCompare
    .slice()
    .sort((a, b) => number(b["2011-2025 Total"]) - number(a["2011-2025 Total"]))
    .slice(0, 6)
    .map((r) => r.Subject);
  const traces = topSubjects.map((subject, index) => ({
    type: "scatter",
    mode: "lines+markers",
    x: years,
    y: rows.map((r) => number(r[subject])),
    name: subject,
    line: { width: 3, color: COLORS[index] },
    marker: { size: 6 },
  }));
  Plotly.newPlot("trendLine", traces, {
    ...layoutBase,
    xaxis: { title: "Year" },
    yaxis: { title: "Questions" },
    legend: { orientation: "h", y: -0.22 },
  }, config);
}

function renderSubjectDonut() {
  const rows = DATA.subjectCompare.filter((r) => number(r["2026 Count"]) > 0);
  Plotly.newPlot("subjectDonut", [{
    type: "pie",
    labels: rows.map((r) => r.Subject),
    values: rows.map((r) => number(r["2026 Count"])),
    hole: 0.52,
    marker: { colors: COLORS },
    textinfo: "percent",
    hovertemplate: "%{label}<br>%{value} questions<extra></extra>",
  }], {
    ...layoutBase,
    margin: { t: 12, r: 12, b: 12, l: 12 },
    showlegend: true,
    legend: { orientation: "h", y: -0.12, font: { size: 10 } },
  }, config);
}

function renderUnitBubble() {
  const rows = DATA.unitHeat.filter((r) => number(r.q2026) > 0 || number(r.historical) > 25);
  Plotly.newPlot("unitBubble", [{
    type: "scatter",
    mode: "markers",
    x: rows.map((r) => number(r.historical)),
    y: rows.map((r) => number(r.q2026)),
    text: rows.map((r) => `${r.subject}<br>${r.unit}`),
    marker: {
      size: rows.map((r) => Math.max(10, Math.min(54, number(r.topics) * 2.2 + number(r.q2026) * 4))),
      color: rows.map((r) => number(r.q2026)),
      colorscale: [[0, "#d9e7f4"], [0.5, "#2563eb"], [1, "#18875a"]],
      showscale: true,
      colorbar: { title: "2026" },
      line: { color: "#ffffff", width: 1 },
    },
    hovertemplate: "%{text}<br>History: %{x}<br>2026: %{y}<extra></extra>",
  }], {
    ...layoutBase,
    xaxis: { title: "Historical questions, 2011-2025" },
    yaxis: { title: "2026 questions" },
  }, config);
}

function renderTopicTreemap() {
  const rows = DATA.heatmap
    .filter((r) => number(r["Total 2011-2026"]) > 0)
    .sort((a, b) => number(b["Total 2011-2026"]) - number(a["Total 2011-2026"]))
    .slice(0, 120);
  const labels = ["UPSC PYQ graph"];
  const ids = ["root"];
  const parents = [""];
  const values = [rows.reduce((sum, r) => sum + number(r["Total 2011-2026"]), 0)];
  const colors = [0];
  const subjectSeen = new Set();
  const unitSeen = new Set();

  rows.forEach((row) => {
    const subject = row.Subject;
    const unit = `${row.Subject} / ${row.Unit}`;
    if (!subjectSeen.has(subject)) {
      const total = rows.filter((r) => r.Subject === subject).reduce((sum, r) => sum + number(r["Total 2011-2026"]), 0);
      labels.push(subject);
      ids.push(`subject:${subject}`);
      parents.push("root");
      values.push(total);
      colors.push(total);
      subjectSeen.add(subject);
    }
    if (!unitSeen.has(unit)) {
      const total = rows.filter((r) => r.Subject === row.Subject && r.Unit === row.Unit).reduce((sum, r) => sum + number(r["Total 2011-2026"]), 0);
      labels.push(row.Unit);
      ids.push(`unit:${unit}`);
      parents.push(`subject:${subject}`);
      values.push(total);
      colors.push(total);
      unitSeen.add(unit);
    }
    labels.push(row.Topic);
    ids.push(`topic:${row["Topic ID"] || row.Subject + row.Unit + row.Topic}`);
    parents.push(`unit:${unit}`);
    values.push(Math.max(1, number(row["Total 2011-2026"])));
    colors.push(number(row["2026 Count"]));
  });

  Plotly.newPlot("topicTreemap", [{
    type: "treemap",
    labels,
    ids,
    parents,
    values,
    branchvalues: "total",
    marker: {
      colors,
      colorscale: [[0, "#e8f1fa"], [0.35, "#75a7e8"], [0.7, "#18875a"], [1, "#b7791f"]],
      line: { width: 1, color: "#ffffff" },
    },
    textinfo: "label+value",
    hovertemplate: "%{label}<br>Total weight: %{value}<extra></extra>",
  }], {
    ...layoutBase,
    margin: { t: 6, r: 6, b: 6, l: 6 },
  }, config);
}

let fullTraceNodeLookup = {};

function traceSummaryRows() {
  return DATA.topicSummaryRows.filter((row) => {
    if (traceState.subject !== "All" && row.Subject !== traceState.subject) return false;
    if (traceState.unit !== "All" && row.Unit !== traceState.unit) return false;
    if (traceState.topic !== "All" && row.Topic !== traceState.topic) return false;
    if (!traceState.search) return true;
    const text = `${row.Subject} ${row.Unit} ${row.Topic} ${row["Topic ID"]} ${row["Years Asked"]}`.toLowerCase();
    return text.includes(traceState.search);
  });
}

function renderFullTraceTreemap() {
  if (!document.getElementById("fullTopicTreemap")) return;
  const rows = traceSummaryRows();
  const subjectTotals = new Map();
  const unitTotals = new Map();
  rows.forEach((row) => {
    const count = number(row["Total PYQs"]);
    subjectTotals.set(row.Subject, (subjectTotals.get(row.Subject) || 0) + count);
    const unitKey = `${row.Subject}|||${row.Unit}`;
    unitTotals.set(unitKey, (unitTotals.get(unitKey) || 0) + count);
  });

  const labels = ["All 1,600 PYQs"];
  const ids = ["root"];
  const parents = [""];
  const values = [rows.reduce((sum, row) => sum + number(row["Total PYQs"]), 0)];
  const colors = [0];
  fullTraceNodeLookup = { root: { level: "root" } };

  [...subjectTotals.entries()].sort((a, b) => b[1] - a[1]).forEach(([subject, total]) => {
    const id = `subject:${subject}`;
    labels.push(subject);
    ids.push(id);
    parents.push("root");
    values.push(total);
    colors.push(total);
    fullTraceNodeLookup[id] = { level: "subject", subject };
  });

  [...unitTotals.entries()].sort((a, b) => b[1] - a[1]).forEach(([key, total]) => {
    const [subject, unit] = key.split("|||");
    const id = `unit:${subject}|||${unit}`;
    labels.push(unit);
    ids.push(id);
    parents.push(`subject:${subject}`);
    values.push(total);
    colors.push(total);
    fullTraceNodeLookup[id] = { level: "unit", subject, unit };
  });

  rows.forEach((row) => {
    const id = `topic:${row.Subject}|||${row.Unit}|||${row["Topic ID"]}`;
    labels.push(`${row.Topic}`);
    ids.push(id);
    parents.push(`unit:${row.Subject}|||${row.Unit}`);
    values.push(Math.max(1, number(row["Total PYQs"])));
    colors.push(number(row["PYQs 2026"]));
    fullTraceNodeLookup[id] = {
      level: "topic",
      subject: row.Subject,
      unit: row.Unit,
      topic: row.Topic,
      topicId: row["Topic ID"],
    };
  });

  Plotly.newPlot("fullTopicTreemap", [{
    type: "treemap",
    labels,
    ids,
    parents,
    values,
    branchvalues: "total",
    marker: {
      colors,
      colorscale: [[0, "#e8f1fa"], [0.35, "#75a7e8"], [0.75, "#18875a"], [1, "#b7791f"]],
      line: { color: "#ffffff", width: 1 },
    },
    textinfo: "label+value",
    hovertemplate: "%{label}<br>%{value} PYQs<extra></extra>",
  }], {
    ...layoutBase,
    margin: { t: 8, r: 8, b: 8, l: 8 },
  }, config);

  const chart = document.getElementById("fullTopicTreemap");
  chart.on("plotly_click", (event) => {
    const point = event.points && event.points[0];
    const node = fullTraceNodeLookup[point && point.id];
    if (!node || node.level === "root") return;
    traceState.subject = node.subject || "All";
    traceState.unit = node.level === "subject" ? "All" : node.unit || "All";
    traceState.topic = node.level === "topic" ? node.topic : "All";
    document.getElementById("traceSubjectFilter").value = traceState.subject;
    populateTraceUnits();
    document.getElementById("traceUnitFilter").value = traceState.unit;
    populateTraceTopics();
    document.getElementById("traceTopicFilter").value = traceState.topic;
    updateTraceView(false);
  });
}

function renderSignalBars() {
  const rows = Object.entries(DATA.counts.topicSignals2026).map(([signal, count]) => ({ signal, count }));
  rows.sort((a, b) => b.count - a.count);
  Plotly.newPlot("signalBars", [{
    type: "bar",
    x: rows.map((r) => r.count),
    y: rows.map((r) => r.signal).reverse(),
    orientation: "h",
    marker: { color: ["#d14b4b", "#b7791f", "#18875a", "#2563eb", "#0e7490"].reverse() },
    hovertemplate: "%{y}<br>%{x} questions<extra></extra>",
  }], {
    ...layoutBase,
    xaxis: { title: "2026 questions" },
    yaxis: { automargin: true },
  }, config);
}

function renderConfidenceGauge() {
  const labels = Object.keys(DATA.counts.confidence);
  const values = labels.map((k) => DATA.counts.confidence[k]);
  Plotly.newPlot("confidenceGauge", [{
    type: "pie",
    labels,
    values,
    hole: 0.58,
    marker: { colors: labels.map((label) => label === "High" ? "#18875a" : label === "Medium" ? "#b7791f" : "#d14b4b") },
    textinfo: "label+value",
  }], {
    ...layoutBase,
    margin: { t: 12, r: 12, b: 12, l: 12 },
    showlegend: false,
  }, config);
}

function renderCompare2025Chart() {
  const rows = DATA.reportInsights.compare2025.slice().sort((a, b) => number(b.y2026) - number(a.y2026));
  Plotly.newPlot("compare2025Chart", [
    {
      type: "bar",
      orientation: "h",
      y: rows.map((r) => r.subject).reverse(),
      x: rows.map((r) => number(r.y2025)).reverse(),
      name: "2025",
      marker: { color: "#94a3b8" },
      hovertemplate: "%{y}<br>2025: %{x}<extra></extra>",
    },
    {
      type: "bar",
      orientation: "h",
      y: rows.map((r) => r.subject).reverse(),
      x: rows.map((r) => number(r.y2026)).reverse(),
      name: "2026",
      marker: {
        color: rows.map((r) => number(r.delta) >= 0 ? "#18875a" : "#d14b4b").reverse(),
      },
      customdata: rows.map((r) => `${number(r.delta) > 0 ? "+" : ""}${r.delta} · ${r.direction}`).reverse(),
      hovertemplate: "%{y}<br>2026: %{x}<br>%{customdata}<extra></extra>",
    },
  ], {
    ...layoutBase,
    barmode: "group",
    xaxis: { title: "Questions" },
    yaxis: { automargin: true },
    legend: { orientation: "h", y: -0.16 },
  }, config);
}

function renderTypeChart() {
  const rows = DATA.reportInsights.questionTypes;
  Plotly.newPlot("typeChart", [{
    type: "pie",
    labels: rows.map((r) => r.type),
    values: rows.map((r) => number(r.count)),
    hole: 0.48,
    marker: { colors: COLORS },
    textinfo: "percent",
    hovertemplate: "%{label}<br>%{value} questions<extra></extra>",
  }], {
    ...layoutBase,
    margin: { t: 12, r: 12, b: 12, l: 12 },
    legend: { orientation: "h", y: -0.16, font: { size: 10 } },
  }, config);
}

function renderCurrentStaticChart() {
  const rows = DATA.reportInsights.currentStatic
    .slice()
    .sort((a, b) => (number(b.current) + number(b.static)) - (number(a.current) + number(a.static)));
  Plotly.newPlot("currentStaticChart", [
    {
      type: "bar",
      orientation: "h",
      y: rows.map((r) => r.subject).reverse(),
      x: rows.map((r) => number(r.static)).reverse(),
      name: "Static",
      marker: { color: "#2563eb" },
      hovertemplate: "%{y}<br>Static: %{x}<extra></extra>",
    },
    {
      type: "bar",
      orientation: "h",
      y: rows.map((r) => r.subject).reverse(),
      x: rows.map((r) => number(r.current)).reverse(),
      name: "Current-linked",
      marker: { color: "#b7791f" },
      hovertemplate: "%{y}<br>Current-linked: %{x}<extra></extra>",
    },
  ], {
    ...layoutBase,
    barmode: "stack",
    xaxis: { title: "Questions" },
    yaxis: { automargin: true },
    legend: { orientation: "h", y: -0.18 },
  }, config);
}

function renderFindings() {
  const grid = document.getElementById("findingGrid");
  grid.innerHTML = DATA.codexFindings.map((item) => `
    <article class="finding">
      <span>${item.label}</span>
      <strong>${item.metric}</strong>
      <h3>${item.title}</h3>
      <p>${item.detail}</p>
    </article>
  `).join("");
}

function renderReportInsights() {
  const report = DATA.reportInsights;
  document.getElementById("reportHeadline").textContent = report.headline;
  document.getElementById("reportTldr").textContent = report.tldr;

  document.getElementById("reportShiftGrid").innerHTML = report.shifts.map((item) => `
    <article class="finding">
      <span>${item.tag}</span>
      <h3>${item.title}</h3>
      <p>${item.detail}</p>
    </article>
  `).join("");

  document.getElementById("mutationGrid").innerHTML = report.mutations.map((item) => `
    <article class="mutation">
      <h3>${item.title}</h3>
      <p>${item.detail}</p>
    </article>
  `).join("");

  document.getElementById("prepList").innerHTML = report.prepRecommendations
    .map((item) => `<li>${item}</li>`)
    .join("");

  document.getElementById("caveatList").innerHTML = report.caveats
    .map((item) => `<article class="caveat">${item}</article>`)
    .join("");
}

function statusClass(confidence) {
  return confidence === "High" ? "status-high" : confidence === "Medium" ? "status-medium" : "status-low";
}

function renderTable(id, headers, rows, rowTemplate) {
  const table = document.getElementById(id);
  table.innerHTML = `
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(rowTemplate).join("")}</tbody>
  `;
}

function updateTables() {
  const rows = filteredMap();
  document.getElementById("resultCount").textContent = `${rows.length} rows`;
  renderTable("questionTable", ["No", "Subject", "Topic", "Signal", "Confidence", "Provisional Answer", "Status", "Question"], rows, (r) => `
    <tr>
      <td>${r.No}</td>
      <td>${r.Subject}</td>
      <td><strong>${r.Topic}</strong><br><span>${r.Unit}</span><br><span>${r["Topic ID"]}</span></td>
      <td>${r["Topic Signal"] || "Unsignalled"}</td>
      <td class="${statusClass(r["Mapping Confidence"])}">${r["Mapping Confidence"]}</td>
      <td>${r["UPSC Provisional Answer"] || r["Tentative Answer"] || ""}</td>
      <td>${r["Answer Status"] || ""}</td>
      <td>${r.Question}</td>
    </tr>
  `);

  const topRows = DATA.topTopics.slice(0, 24);
  renderTable("topicTable", ["Topic ID", "Subject", "Unit", "Topic", "History", "2026", "Signal"], topRows, (r) => `
    <tr>
      <td>${r["Topic ID"]}</td>
      <td>${r.Subject}</td>
      <td>${r.Unit}</td>
      <td>${r.Topic}</td>
      <td>${r["2011-2025 Count"]}</td>
      <td><strong>${r["2026 Count"]}</strong></td>
      <td>${r["Topic Signal"] || "Unsignalled"}</td>
    </tr>
  `);
}

function updateTraceView(renderChart = true) {
  if (!document.getElementById("traceCount")) return;
  const rows = filteredTraceRows();
  const summaryRows = traceSummaryRows();
  const questionCount = rows.length;
  const topicCount = new Set(rows.map((row) => row["Topic ID"])).size;
  const unitCount = new Set(rows.map((row) => `${row.Subject}|||${row.Unit}`)).size;
  const subjectCount = new Set(rows.map((row) => row.Subject)).size;

  document.getElementById("traceCount").textContent = `${questionCount.toLocaleString("en-IN")} PYQs`;
  document.getElementById("traceCrumb").textContent = [
    traceState.subject,
    traceState.unit,
    traceState.topic,
  ].filter((item) => item && item !== "All").join(" / ") || "All subjects";
  document.getElementById("traceSummary").innerHTML = `
    <article><strong>${subjectCount}</strong><span>subjects</span></article>
    <article><strong>${unitCount}</strong><span>units</span></article>
    <article><strong>${topicCount}</strong><span>topics</span></article>
    <article><strong>${questionCount.toLocaleString("en-IN")}</strong><span>PYQs</span></article>
  `;

  const topRows = summaryRows.slice(0, 20);
  renderTable("traceTopicTable", ["Subject", "Unit", "Topic", "Topic ID", "Total", "2026", "Years"], topRows, (r) => `
    <tr>
      <td>${r.Subject}</td>
      <td>${r.Unit}</td>
      <td><strong>${r.Topic}</strong></td>
      <td>${r["Topic ID"]}</td>
      <td><strong>${r["Total PYQs"]}</strong></td>
      <td>${r["PYQs 2026"]}</td>
      <td>${r["Years Asked"]}</td>
    </tr>
  `);

  const questionRows = rows
    .slice()
    .sort((a, b) => number(b.Year) - number(a.Year) || number(a["Q#"]) - number(b["Q#"]));
  renderTraceExamCards(questionRows);
  renderTable("traceQuestionTable", ["Year", "Q#", "Subject", "Unit / Topic", "Answer", "Question"], questionRows, (r) => `
    <tr>
      <td>${r.Year}</td>
      <td>${r["Set Question"] || r["Q#"]}</td>
      <td>${r.Subject}</td>
      <td><strong>${r.Topic}</strong><br><span>${r.Unit}</span><br><span>${r["Topic ID"]}</span></td>
      <td>${r.Answer}</td>
      <td>${r.Question}</td>
    </tr>
  `);
  document.getElementById("traceQuestionLimit").textContent = `Showing ${rows.length.toLocaleString("en-IN")} matching PYQs`;

  if (renderChart) {
    renderFullTraceTreemap();
  }
}

function renderTraceExamCards(rows) {
  const container = document.getElementById("traceExamCards");
  if (!container) return;
  const isTopicLevel = traceState.topic !== "All" && new Set(rows.map((row) => row["Topic ID"])).size <= 1;
  if (!isTopicLevel) {
    container.innerHTML = `
      <div class="exam-empty">
        Select a final topic in the treemap or Topic filter to see PYQs in real-exam format with all options.
      </div>
    `;
    return;
  }
  container.innerHTML = rows.map((row) => `
    <article class="exam-card">
      <div class="exam-card-head">
        <span>${row.Year} · Q${row["Set Question"] || row["Q#"]}</span>
        <span>${row["Topic ID"]}</span>
      </div>
      <p class="exam-question">${row.Question}</p>
      <div class="exam-options">
        ${["A", "B", "C", "D"].map((key) => `
          <div class="exam-option">
            <strong>${key}</strong>
            <span>${row[`Option ${key}`] || ""}</span>
          </div>
        `).join("")}
      </div>
      <div class="exam-answer">Answer: ${row.Answer || "Not available"}</div>
      <div class="exam-explanation">${row.Explanation || "Explanation not available."}</div>
    </article>
  `).join("");
}

function renderReports() {
  const leader = DATA.subjectCompare[0];
  const overIndexed = DATA.subjectCompare.filter((r) => number(r["Index vs Avg"]) > 1.5);
  const lowConfidence = DATA.syllabusMap.filter((r) => r["Mapping Confidence"] === "Low").length;
  const answerKey = DATA.answerKey || {};
  const report = [
    answerKey.source ? `${answerKey.source}: ${answerKey.changedCount} tentative answers changed and ${answerKey.droppedCount} question was dropped from scoring.` : "",
    `${leader.Subject} leads the 2026 paper with ${leader["2026 Count"]} questions, sharply above its historical average of ${leader["2011-2025 Avg/Yr"]} per year.`,
    `${overIndexed.map((r) => r.Subject).join(", ")} over-index against the 2011-2025 baseline, making them priority revision zones.`,
    `${DATA.meta.totals.rare2026} 2026 questions sit in rare or previously low-history syllabus zones. These should become a dedicated GyanGram coverage queue.`,
    `${lowConfidence} mappings are low-confidence and should be manually reviewed before importing into a production topic graph. This is exactly where the dashboard exposes uncertainty instead of hiding it.`,
  ].filter(Boolean);
  document.getElementById("reportBody").innerHTML = report.map((p) => `<p>${p}</p>`).join("");

  document.getElementById("rareList").innerHTML = DATA.rare2026.slice(0, 18).map((r) => `
    <article class="rare-item">
      <strong>Q${r.No}. ${r.Topic}</strong>
      <span>${r.Subject} / ${r.Unit}</span>
      <span>${r["Topic Signal"] || "Unsignalled"} / ${r["Mapping Confidence"]} confidence</span>
    </article>
  `).join("");
}

function renderAllCharts() {
  renderSubjectBar();
  renderTrendLine();
  renderSubjectDonut();
  renderUnitBubble();
  renderTopicTreemap();
  renderFullTraceTreemap();
  renderSignalBars();
  renderConfidenceGauge();
  renderCompare2025Chart();
  renderTypeChart();
  renderCurrentStaticChart();
}

function updateAll() {
  renderAllCharts();
  updateTables();
  updateTraceView(false);
  renderReports();
}

setKpis();
initControls();
renderFindings();
renderReportInsights();
updateAll();
