const fs = require("fs");
const path = require("path");

function parseJsonl(content) {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

module.exports = (req, res) => {
  const { scenario, seed, policy } = req.query;
  if (!scenario || !seed || !policy) {
    return res.status(400).json({ error: "scenario, seed, and policy are required" });
  }

  const safe = /^[a-z0-9-]+$/;
  if (!safe.test(scenario) || !safe.test(policy) || !/^\d+$/.test(String(seed))) {
    return res.status(400).json({ error: "invalid input format" });
  }

  const runFile = `${scenario}-seed${seed}-${policy}.jsonl`;
  const fullPath = path.join(process.cwd(), "prototype", "mra-v0", "runs", runFile);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({
      error: "run not found in bundled samples",
      expected: runFile,
    });
  }

  let lines;
  try {
    lines = parseJsonl(fs.readFileSync(fullPath, "utf8"));
  } catch (err) {
    return res.status(500).json({
      error: "run file is malformed or unreadable",
      file: runFile,
      detail: err.message,
    });
  }

  const summaryLine = lines.find((entry) => entry.summary);
  const run = lines.filter((entry) => entry.turn);

  return res.status(200).json({
    run,
    summary: summaryLine ? summaryLine.summary : null,
    source: `prototype/mra-v0/runs/${runFile}`,
  });
};
