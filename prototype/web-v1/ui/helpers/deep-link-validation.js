export const DEEP_LINK_SCREEN_IDS = new Set([
  'title',
  'fatal-error',
  'expedition-setup',
  'game',
  'debrief',
  'summit-success',
  'part2-character',
  'journal',
  'onboarding',
  'mendoza_room',
  'team_presentation',
  'after_circle',
  'guides',
  'briefing_night',
  'departure_road',
  'future_cta',
]);

export function isKnownDeepLinkScreen(screenId, part2NarrativeIds = []) {
  if (!screenId) return false;
  return DEEP_LINK_SCREEN_IDS.has(screenId) || part2NarrativeIds.includes(screenId);
}

export function parseSeedParam(seedValue, allowedSeeds = []) {
  if (seedValue == null || seedValue === '') {
    return allowedSeeds[0] ?? null;
  }
  const parsed = Number.parseInt(String(seedValue), 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  if (Array.isArray(allowedSeeds) && allowedSeeds.length && !allowedSeeds.includes(parsed)) return null;
  return parsed;
}

export function validateSelectionParams({ params, resolveCharacter, resolveScenario }) {
  const hasCharacterParam = params.character != null && params.character !== '';
  const hasScenarioParam = params.scenario != null && params.scenario !== '';

  const character = hasCharacterParam ? resolveCharacter?.(params.character) ?? null : null;
  const scenario = hasScenarioParam ? resolveScenario?.(params.scenario) ?? null : null;

  if ((hasCharacterParam && !character) || (hasScenarioParam && !scenario)) {
    return { ok: false, reason: 'invalid character/scenario' };
  }

  const hasSeedParam = params.seed != null && params.seed !== '';
  const seed = parseSeedParam(params.seed, scenario?.seeds || []);
  if (hasSeedParam && seed == null) return { ok: false, reason: 'invalid seed' };
  return { ok: true, character, scenario, seed };
}

export function validateDebriefParams({ params, resolveCharacter, resolveScenario, validOutcomes }) {
  if (params.outcome && !validOutcomes.has(params.outcome)) {
    return { ok: false, reason: 'invalid outcome' };
  }
  const base = validateSelectionParams({ params, resolveCharacter, resolveScenario });
  if (!base.ok) return base;
  return { ok: true, character: base.character, scenario: base.scenario, seed: base.seed };
}
