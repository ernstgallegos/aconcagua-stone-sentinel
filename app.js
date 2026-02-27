const els = {
  scenario: document.getElementById("scenario"),
  seed: document.getElementById("seed"),
  policy: document.getElementById("policy"),
  load: document.getElementById("load"),
  status: document.getElementById("status"),
  summaryPanel: document.getElementById("summary-panel"),
  timelinePanel: document.getElementById("timeline-panel"),
  summary: document.getElementById("summary"),
  turns: document.getElementById("turns"),
};

const bundledRuns = [
  { scenario: "narrow-weather-window", seed: 101, policy: "cautious" },
  { scenario: "false-stability-terrain", seed: 505, policy: "cautious" },
  { scenario: "accumulated-fatigue-trap", seed: 808, policy: "waiter" },
];

function runFileName(entry) {
  return `${entry.scenario}-seed${entry.seed}-${entry.policy}.jsonl`;
}

function parseJsonl(raw) {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function normalize(lines, source) {
  return {
    run: lines.filter((line) => line.turn),
    summary: lines.find((line) => line.summary)?.summary ?? null,
    source,
  };
}

function getSelection() {
  return {
    scenario: els.scenario.value,
    seed: Number(els.seed.value),
    policy: els.policy.value,
  };
}

function getAvailableForScenario(scenario) {
  return bundledRuns.filter((item) => item.scenario === scenario);
}

function syncDefaults() {
  const match = getAvailableForScenario(els.scenario.value)[0];
  if (!match) return;
  els.seed.value = String(match.seed);
  els.policy.value = match.policy;
}

function seedScenarios() {
  [...new Set(bundledRuns.map((item) => item.scenario))].forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    els.scenario.appendChild(option);
  });
  syncDefaults();
}

function metric(label, value) {
  return `<article class="metric"><p class="label">${label}</p><p class="value">${value}</p></article>`;
}

function flagClass(flag) {
  if (/risk/i.test(flag)) return "flag-high-risk";
  if (/exposure/i.test(flag)) return "flag-exposure";
  return "flag-default";
}

function render(data) {
  const { run, summary, source } = data;
  els.summaryPanel.hidden = false;
  els.timelinePanel.hidden = false;

  const fatiguePeak = Math.max(...run.map((turn) => Number(turn.state?.fatigue ?? 0)), 0);
  const exposurePeak = Math.max(...run.map((turn) => Number(turn.state?.exposure ?? 0)), 0);

  els.summary.innerHTML = [
    metric("Outcome", summary?.outcome ?? "unknown"),
    metric("Key constraint", summary?.key_constraint ?? "not reported"),
    metric("Total turns", summary?.total_turns ?? run.length),
    metric("Peak fatigue", fatiguePeak),
    metric("Peak exposure", exposurePeak),
    metric("Data source", source),
  ].join("");

  els.turns.innerHTML = "";
  run.forEach((turn) => {
    const item = document.createElement("article");
    item.className = "turn";
    const flags = (turn.flags || [])
      .map((flag) => `<span class="flag ${flagClass(flag)}">${flag}</span>`)
      .join(" ");

    item.innerHTML = `
      <h3>Turn ${turn.turn} · ${turn.decision}</h3>
      <p class="meta">Position: ${turn.state.position} · Altitude band: ${turn.state.altitude_band}</p>
      <p class="meta">Functional capacity: ${turn.state.functional_capacity} · Fatigue: ${turn.state.fatigue} · Exposure: ${turn.state.exposure}</p>
      ${flags ? `<div>${flags}</div>` : ""}
    `;
    els.turns.appendChild(item);
  });
}

async function fetchFromApi(selection) {
  const params = new URLSearchParams({
    scenario: selection.scenario,
    seed: String(selection.seed),
    policy: selection.policy,
  });
  const response = await fetch(`/api/run?${params.toString()}`);
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "API error");
  return body;
}

async function fetchStatic(selection) {
  const file = runFileName(selection);
  const response = await fetch(`/prototype/mra-v0/runs/${file}`);
  if (!response.ok) throw new Error(`Run not found: ${file}`);
  return normalize(parseJsonl(await response.text()), `prototype/mra-v0/runs/${file}`);
}

async function loadRun() {
  els.summaryPanel.hidden = true;
  els.timelinePanel.hidden = true;

  const selection = getSelection();
  const supported = bundledRuns.some((entry) =>
    entry.scenario === selection.scenario &&
    entry.seed === selection.seed &&
    entry.policy === selection.policy
  );

  if (!supported) {
    const options = getAvailableForScenario(selection.scenario)
      .map((entry) => `seed=${entry.seed}, policy=${entry.policy}`)
      .join(" | ");
    els.status.textContent = `Combination not bundled. Available: ${options || "none"}.`;
    return;
  }

  els.status.textContent = "Loading run...";
  try {
    const data = await fetchFromApi(selection);
    render(data);
    els.status.textContent = `Loaded ${data.summary?.total_turns ?? data.run.length} turns from API.`;
  } catch (error) {
    try {
      const fallback = await fetchStatic(selection);
      render(fallback);
      els.status.textContent = `Loaded ${fallback.summary?.total_turns ?? fallback.run.length} turns from static fallback.`;
    } catch (fallbackError) {
      els.status.textContent = `Load failed. API: ${error.message}. Static: ${fallbackError.message}.`;
    }
  }
}

seedScenarios();
els.scenario.addEventListener("change", syncDefaults);
els.load.addEventListener("click", loadRun);
loadRun();
