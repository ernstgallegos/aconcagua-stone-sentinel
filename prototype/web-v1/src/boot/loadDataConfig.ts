/**
 * TS-side contract adapter for the data-config loading pipeline.
 *
 * Canonical authority layers (runtime):
 *   1. data/*.json            — raw JSON; shape = RawRouteNode / raw event objects
 *   2. loadDataConfigFiles()  — fetches + validates raw shape → returns DataConfig
 *                               (ui/helpers/data-config.js)
 *   3. normalizeRouteData()   — transforms DataConfig.nodes (RawRouteNode[]) into
 *                               NormalizedRouteData (RouteNode[], positions, …)
 *                               (ui/helpers/data-config.js)
 *
 * TypeScript mirrors runtime normalization:
 *   - DataConfig.nodes  is typed as RawRouteNode[]  (pre-normalization, from loadDataConfigFiles)
 *   - NormalizedRouteData is typed separately        (post-normalization, from normalizeRouteData)
 *   - assertDataConfig() can be applied directly to loadDataConfigFiles() output
 *
 * This module is a thin re-export adapter; it does not contain loading logic.
 */

export { assertDataConfig as assertNormalizedDataConfig, type DataConfig } from '../types/data-contracts.js';
