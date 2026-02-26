const scenarioSelect = document.getElementById("scenario");
const seedInput = document.getElementById("seed");
const policySelect = document.getElementById("policy");
const loadButton = document.getElementById("load");
const statusEl = document.getElementById("status");
const summaryPanel = document.getElementById("summary-panel");
const turnsPanel = document.getElementById("turns-panel");
const summaryEl = document.getElementById("summary");
const turnsEl = document.getElementById("turns");

const bundledRuns = [
  { scenario: "narrow-weather-window", seed: 101, policy: "cautious" },
  { scenario: "false-stability-terrain", seed: 505, policy: "cautious" },
  { scenario: "accumulated-fatigue-trap", seed: 808, policy: "waiter" },
];

function runFileName({ scenario, seed, policy }) {
  return `${scenario}-seed${seed}-${policy}.jsonl`;
}

function parseJsonl(content) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function normalizePayload(lines, source) {
  const summaryLine = lines.find((entry) => entry.summary);
  const run = lines.filter((entry) => entry.turn);
  return {
    run,
    summary: summaryLine ? summaryLine.summary : null,
    source,
  };
}

function setScenarioOptions() {
  const scenarios = [...new Set(bundledRuns.map((entry) => entry.scenario))];
  scenarios.forEach((scenario) => {
    const opt = document.createElement("option");
    opt.value = scenario;
    opt.textContent = scenario;
    scenarioSelect.appendChild(opt);
  });
}

function syncInputsForScenario() {
  const scenario = scenarioSelect.value;
  const firstMatch = bundledRuns.find((entry) => entry.scenario === scenario);
  if (!firstMatch) {
    return;
  }

  seedInput.value = String(firstMatch.seed);
  policySelect.value = firstMatch.policy;
}

function formatAvailableRuns(scenario) {
  const available = bundledRuns
    .filter((entry) => entry.scenario === scenario)
    .map((entry) => `seed=${entry.seed}, policy=${entry.policy}`)
    .join(" | ");
  return available || "none";
}

function renderRun(payload) {
  const { run, summary } = payload;
  summaryPanel.hidden = false;
  turnsPanel.hidden = false;

  summaryEl.innerHTML = summary
    ? `
      <p><strong>Outcome:</strong> ${summary.outcome}</p>
      <p><strong>Constraint:</strong> ${summary.key_constraint}</p>
      <p><strong>Total turns:</strong> ${summary.total_turns}</p>
    `
    : "<p>No summary line was found in this run file.</p>";

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

async function fetchFromApi(params) {
  const res = await fetch(`/api/run?${params.toString()}`);
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Unknown API error");
  }
  return data;
}

async function fetchFromStaticJsonl(selection) {
  const fileName = runFileName(selection);
  const res = await fetch(`/prototype/mra-v0/runs/${fileName}`);
  if (!res.ok) {
    throw new Error(`static run not found: ${fileName}`);
  }
  const content = await res.text();
  const parsed = parseJsonl(content);
  return normalizePayload(parsed, `prototype/mra-v0/runs/${fileName}`);
}

const preferStaticLocal = ["127.0.0.1", "localhost"].includes(window.location.hostname) && window.location.port === "4173";

async function loadRun() {
  statusEl.textContent = "Loading run...";
  summaryPanel.hidden = true;
  turnsPanel.hidden = true;

  const selection = {
    scenario: scenarioSelect.value,
    seed: Number(seedInput.value),
    policy: policySelect.value,
  };

  const supported = bundledRuns.some(
    (entry) =>
      entry.scenario === selection.scenario &&
      entry.seed === selection.seed &&
      entry.policy === selection.policy,
  );

  if (!supported) {
    statusEl.textContent = `Combination not bundled for ${selection.scenario}. Available: ${formatAvailableRuns(selection.scenario)}`;
    return;
  }

  const params = new URLSearchParams({
    scenario: selection.scenario,
    seed: String(selection.seed),
    policy: selection.policy,
  });

  if (preferStaticLocal) {
    try {
      const fallbackData = await fetchFromStaticJsonl(selection);
      renderRun(fallbackData);
      statusEl.textContent = `Loaded ${fallbackData.summary?.total_turns ?? fallbackData.run.length} turns via local static mode.`;
      return;
    } catch (fallbackError) {
      statusEl.textContent = `Failed local static mode (${fallbackError.message}).`;
      return;
    }
  }

  try {
    const data = await fetchFromApi(params);
    renderRun(data);
    statusEl.textContent = `Loaded ${data.summary?.total_turns ?? data.run.length} turns from API.`;
  } catch (apiError) {
    try {
      const fallbackData = await fetchFromStaticJsonl(selection);
      renderRun(fallbackData);
      statusEl.textContent = `Loaded ${fallbackData.summary?.total_turns ?? fallbackData.run.length} turns via static fallback (no serverless API).`;
    } catch (fallbackError) {
      statusEl.textContent = `Failed API (${apiError.message}) and static fallback (${fallbackError.message}).`;
    }
  }
}

setScenarioOptions();
scenarioSelect.addEventListener("change", syncInputsForScenario);
syncInputsForScenario();
loadButton.addEventListener("click", loadRun);
loadRun();
