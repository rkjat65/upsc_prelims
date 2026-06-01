const DATA = window.DASHBOARD_DATA;

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
let fullTraceNodeLookup = {};

function number(value) {
  return Number(value || 0);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

function populateSelect(id, values, label = "All") {
  const select = document.getElementById(id);
  select.innerHTML = "";
  [label, ...values].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
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

function renderTable(id, headers, rows, rowTemplate) {
  document.getElementById(id).innerHTML = `
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map(rowTemplate).join("")}</tbody>
  `;
}

function renderFullTraceTreemap() {
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
    labels.push(row.Topic);
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

  document.getElementById("fullTopicTreemap").on("plotly_click", (event) => {
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
    if (node.level === "topic") {
      document.getElementById("trace-pyqs").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

function updateTraceView(renderChart = true) {
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

  renderTable("traceTopicTable", ["Subject", "Unit", "Topic", "Topic ID", "Total", "2026", "Years"], summaryRows.slice(0, 60), (r) => `
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

  if (renderChart) renderFullTraceTreemap();
}

function renderTraceExamCards(rows) {
  const isTopicLevel = traceState.topic !== "All" && new Set(rows.map((row) => row["Topic ID"])).size <= 1;
  const container = document.getElementById("traceExamCards");
  if (!isTopicLevel) {
    container.innerHTML = `
      <div class="exam-empty">
        Select a final topic in the treemap or Topic filter to see real-exam cards with options, answer, and explanation.
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

function initTrace() {
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
  updateTraceView();
}

initTrace();
