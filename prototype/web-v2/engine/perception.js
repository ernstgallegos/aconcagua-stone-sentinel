/**
 * Perception Model — mediates what the player "sees" of the mountain's state.
 * Information is always partial; signals include noise and bias.
 */

/**
 * Calculate player perception from systemic state.
 * @param {object} state - Current game state
 * @param {number} ep - Environmental Pressure
 * @param {number} bt - Body Tolerance
 * @param {number} pressureDelta - EP - BT
 * @param {object} character - Character data with engine stats
 * @returns {object} Perception signals visible to player
 */
export function calculatePerception(state, ep, bt, pressureDelta, character) {
  const engine = character.engine;
  const guardrails = engine.perceptionGuardrails || {};

  // Confidence: how certain is the player about conditions?
  const baseConfidence = 60;
  const deltaEffect = -Math.abs(pressureDelta) * 0.4;
  const stabilityBonus = (engine.confidenceStability || 1.0) * 10;
  const biasEffect = (engine.perceptionBias || 0) * -1.5;

  let confidence = baseConfidence + deltaEffect + stabilityBonus + biasEffect;

  // Clamp with guardrails
  const minConfidence = guardrails.minConfidence || 20;
  confidence = Math.max(minConfidence, Math.min(95, confidence));

  // Noise: how reliable are the signals?
  const baseNoise = 15;
  const weatherNoise = (state.weather.windSpeed || 0) * 4;
  const fatigueNoise = state.body.fatigue * 0.15;
  const biasNoise = Math.abs(engine.perceptionBias || 0) * 1.2;

  let noise = baseNoise + weatherNoise + fatigueNoise + biasNoise;
  const maxNoise = guardrails.maxNoise || 30;
  noise = Math.min(maxNoise, Math.max(0, noise));

  // Trend: is pressure improving or worsening?
  const rawTrend = pressureDelta;
  let trendEstimate;
  if (rawTrend < -10) trendEstimate = 'improving';
  else if (rawTrend > 15) trendEstimate = 'worsening';
  else trendEstimate = 'stable';

  // Apply perception noise to trend (can flip at high noise)
  if (noise > 25 && Math.abs(rawTrend) < 20) {
    trendEstimate = 'uncertain';
  }

  // Mountain pressure (derived, not raw EP)
  const perceivedPressure = ep + (engine.perceptionBias || 0) * 2;
  let pressureLabel;
  if (perceivedPressure < 30) pressureLabel = 'Low';
  else if (perceivedPressure < 50) pressureLabel = 'Moderate';
  else if (perceivedPressure < 70) pressureLabel = 'High';
  else pressureLabel = 'Critical';

  // Confidence label
  let confidenceLabel;
  if (confidence >= 70) confidenceLabel = 'Clear';
  else if (confidence >= 45) confidenceLabel = 'Partial';
  else confidenceLabel = 'Obscured';

  return {
    confidenceLevel: Math.round(confidence),
    confidenceLabel,
    noiseLevel: Math.round(noise),
    trendEstimate,
    pressureLabel,
    perceivedPressure: Math.round(perceivedPressure)
  };
}
