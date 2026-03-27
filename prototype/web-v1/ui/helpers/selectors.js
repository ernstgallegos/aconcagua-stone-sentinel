export function getConfiguredScenarios(config) {
  return config?.scenariosWebV1?.predefinedScenarios || [];
}

export function getRandomScenarioConfig(config) {
  return config?.scenariosWebV1?.randomScenario || {};
}
