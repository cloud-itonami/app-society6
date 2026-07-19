/**
 * society6 kotoba — barrel. kotoba-E2E split (ADR-2605181100): public COFOG
 * service catalog plaintext + per-person well-becoming score sealed via kotoba
 * E2E. Cross-app SQL compute (dojo RW) + WSend promotion dispatch stay etzhayyim via
 * consent-capability.
 */
export * from "./types.js";
export {
  registerCofog,
  getCofog,
  cofogExists,
  listCofog,
  recordScore,
  listScores,
  getScore,
  coverage,
} from "./registry.js";
