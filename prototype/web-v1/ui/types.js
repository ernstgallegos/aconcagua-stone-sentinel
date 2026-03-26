/**
 * @typedef {Object} CharacterEngine
 * @property {number} [fatigueResistance]
 * @property {number} [exposureResistance]
 * @property {number} [confidenceStability]
 * @property {number} [riskTolerance]
 */

/**
 * @typedef {Object} Scenario
 * @property {string} id
 * @property {string} name
 * @property {number} max_turns
 * @property {number[]} seeds
 */

/**
 * @typedef {Object} DecisionWindowEffect
 * @property {boolean} exceeded
 * @property {number} overMs
 * @property {number} [confidencePenalty]
 * @property {number} [noiseIncrease]
 */

/**
 * @typedef {Object} TurnLogEntry
 * @property {number} turn
 * @property {number} day
 * @property {string} time
 * @property {string} node
 * @property {string} stage
 * @property {string} decision
 * @property {boolean} moved
 * @property {boolean} blocked
 * @property {string[]} flags
 * @property {DecisionWindowEffect} [decisionWindowEffect]
 */

/**
 * @typedef {'Strategic Retreat'|'Rescue'|'Collapse (Fatigue)'|'Collapse (Exposure)'|'Resource Exhaustion'|'Expedition Window Closed'|'Permit Expired'|'Fatality'|'High Point Return'|'Summit and Safe Return'} Outcome
 */

/**
 * @typedef {Object} GameState
 * @property {number} turn
 * @property {number} day
 * @property {number} minutesOfDay
 * @property {Scenario|null} scenario
 * @property {{id:string,name:string,engine:CharacterEngine}|null} character
 * @property {TurnLogEntry[]} turnLog
 * @property {Outcome} finalOutcome
 */

export {};
