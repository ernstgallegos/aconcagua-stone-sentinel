/**
 * TS-side contract adapter for the data-config loading pipeline.
 *
 * Canonical loading path (runtime):
 *   ui/helpers/data-config.js  →  loadDataConfigFiles()  →  normalizeRouteData()
 *
 * This module does NOT duplicate that loading logic. It exports a single
 * assertion function that can be applied to an already-loaded *and* already-
 * normalized config object to confirm it satisfies the TypeScript DataConfig
 * contract.
 *
 * Call assertNormalizedDataConfig() AFTER normalizeRouteData() has run.
 * Passing raw (pre-normalization) data will throw because raw route nodes
 * carry nodeId, not the normalized id field that RouteNode requires.
 */

export { assertDataConfig as assertNormalizedDataConfig, type DataConfig } from '../types/data-contracts.js';
