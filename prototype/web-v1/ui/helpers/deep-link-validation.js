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
  const character = resolveCharacter?.(params.character);
  const scenario = resolveScenario?.(params.scenario);
  if (!character || !scenario) {
    return { ok: false, reason: 'invalid character/scenario' };
  }
  const seed = parseSeedParam(params.seed, scenario.seeds || []);
  if (seed == null) return { ok: false, reason: 'invalid seed' };
  return { ok: true, character, scenario, seed };
}

export function validateDebriefParams({ params, resolveCharacter, resolveScenario, validOutcomes }) {
  const base = validateSelectionParams({ params, resolveCharacter, resolveScenario });
  if (!base.ok) return base;
  if (params.outcome && !validOutcomes.has(params.outcome)) {
    return { ok: false, reason: 'invalid outcome' };
  }
  return base;
}
