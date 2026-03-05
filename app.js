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
  { scenario: "late-push", seed: 222, policy: "cautious" },
  { scenario: "weather-window", seed: 151, policy: "cautious" },
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
  const article = document.createElement("article");
  article.className = "metric";
  const labelEl = document.createElement("p");
  labelEl.className = "label";
  labelEl.textContent = label;
  const valueEl = document.createElement("p");
  valueEl.className = "value";
  valueEl.textContent = String(value);
  article.append(labelEl, valueEl);
  return article;
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

  els.summary.replaceChildren(...[
    metric("Outcome", summary?.outcome ?? "unknown"),
    metric("Key constraint", summary?.key_constraint ?? "not reported"),
    metric("Total turns", summary?.total_turns ?? run.length),
    metric("Peak fatigue", fatiguePeak),
    metric("Peak exposure", exposurePeak),
    metric("Data source", source),
  ]);

  els.turns.replaceChildren();
  run.forEach((turn) => {
    const item = document.createElement("article");
    item.className = "turn";
    const title = document.createElement("h3");
    title.textContent = `Turn ${turn.turn} · ${turn.decision}`;
    const metaPosition = document.createElement("p");
    metaPosition.className = "meta";
    metaPosition.textContent = `Position: ${turn.state.position} · Altitude band: ${turn.state.altitude_band}`;
    const metaBody = document.createElement("p");
    metaBody.className = "meta";
    metaBody.textContent = `Functional capacity: ${turn.state.functional_capacity} · Fatigue: ${turn.state.fatigue} · Exposure: ${turn.state.exposure}`;
    item.append(title, metaPosition, metaBody);

    const flags = turn.flags || [];
    if (flags.length) {
      const flagWrap = document.createElement("div");
      flags.forEach((flag) => {
        const chip = document.createElement("span");
        chip.className = `flag ${flagClass(flag)}`;
        chip.textContent = flag;
        flagWrap.appendChild(chip);
      });
      item.appendChild(flagWrap);
    }
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
    console.error("API run load failed", error);
    try {
      const fallback = await fetchStatic(selection);
      render(fallback);
      els.status.textContent = `Loaded ${fallback.summary?.total_turns ?? fallback.run.length} turns from static fallback.`;
    } catch (fallbackError) {
      console.error("Static fallback run load failed", fallbackError);
      els.status.textContent = "Run could not be loaded.";
    }
  }
}

seedScenarios();
els.scenario.addEventListener("change", syncDefaults);
els.load.addEventListener("click", loadRun);
loadRun();
