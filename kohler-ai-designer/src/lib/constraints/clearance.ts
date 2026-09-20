import type { ClearanceRule, PlacedProduct } from "./types";

export const GENERIC_DESIGN_CLEARANCE_RULES: ClearanceRule[] = [
  { role: "toilet", frontM: 0.6, leftM: 0.2, rightM: 0.2, notes: "Generic design heuristic; not a KOHLER installation requirement." },
  { role: "toilet_bowl", frontM: 0.6, leftM: 0.2, rightM: 0.2, notes: "Generic design heuristic; not a KOHLER installation requirement." },
  { role: "basin", frontM: 0.6, leftM: 0.15, rightM: 0.15, notes: "Generic design heuristic; not a KOHLER installation requirement." },
  { role: "basin_faucet", frontM: 0.6, notes: "Generic design heuristic; not a KOHLER installation requirement." },
  { zone: "shower", frontM: 0.6, notes: "Generic design heuristic; not a KOHLER installation requirement." },
  { role: "bath", frontM: 0.6, notes: "Generic design heuristic; not a KOHLER installation requirement." },
];

export function findClearanceRule(product: PlacedProduct, rules: ClearanceRule[]): ClearanceRule | undefined {
  return rules.find((rule) => rule.role === product.role) ?? rules.find((rule) => rule.zone === product.bathroomZone);
}

export function getRequiredClearance(rule: ClearanceRule | undefined): number {
  if (!rule) return 0;
  return Math.max(rule.frontM ?? 0, rule.rearM ?? 0, rule.leftM ?? 0, rule.rightM ?? 0);
}
