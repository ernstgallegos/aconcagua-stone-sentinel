const scenarioSelect = document.getElementById("scenario");
const seedInput = document.getElementById("seed");
const policySelect = document.getElementById("policy");
const loadButton = document.getElementById("load");
const statusEl = document.getElementById("status");
const summaryPanel = document.getElementById("summary-panel");
const turnsPanel = document.getElementById("turns-panel");
const summaryEl = document.getElementById("summary");
const turnsEl = document.getElementById("turns");

const defaults = [
  "narrow-weather-window",
  "false-stability-terrain",
  "accumulated-fatigue-trap",
  "late-push",
  "weather-window",
];

for (const s of defaults) {
  const opt = document.createElement("option");
  opt.value = s;
  opt.textContent = s;
  scenarioSelect.appendChild(opt);
}

function renderRun(payload) {
  const { run, summary } = payload;
  summaryPanel.hidden = false;
  turnsPanel.hidden = false;

  summaryEl.innerHTML = `
    <p><strong>Outcome:</strong> ${summary.outcome}</p>
    <p><strong>Constraint:</strong> ${summary.key_constraint}</p>
    <p><strong>Total turns:</strong> ${summary.total_turns}</p>
  `;

  turnsEl.innerHTML = "";
  run.forEach((turn) => {
    const div = document.createElement("article");
    div.className = "turn";
    const flags = (turn.flags || []).map((f) => `<span class=\"flag\">${f}</span>`).join("");
    div.innerHTML = `
      <h3>Turn ${turn.turn} · ${turn.decision}</h3>
      <p class="meta">Position: ${turn.state.position} · Altitude band: ${turn.state.altitude_band}</p>
      <p class="meta">Functional capacity: ${turn.state.functional_capacity} · Fatigue: ${turn.state.fatigue} · Exposure: ${turn.state.exposure}</p>
      ${flags ? `<p>${flags}</p>` : ""}
    `;
    turnsEl.appendChild(div);
  });
}

async function loadRun() {
  statusEl.textContent = "Loading run...";
  summaryPanel.hidden = true;
  turnsPanel.hidden = true;
  const params = new URLSearchParams({
    scenario: scenarioSelect.value,
    seed: String(seedInput.value),
    policy: policySelect.value,
  });

  try {
    const res = await fetch(`/api/run?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Unknown API error");
    }
    renderRun(data);
    statusEl.textContent = `Loaded ${data.summary.total_turns} turns.`;
  } catch (error) {
    statusEl.textContent = `Failed: ${error.message}`;
  }
}

loadButton.addEventListener("click", loadRun);
loadRun();
