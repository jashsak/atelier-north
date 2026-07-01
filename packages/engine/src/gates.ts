import type { DurabilityTier, EnrichedMaterial } from "./types.js";

export interface HardConstraints {
  minDurability?: DurabilityTier;
  requireContractFire?: boolean;
  outdoor?: boolean;
  /** a material/texture kind that MUST be present (e.g. "velvet") — used for honest no-match */
  requiredKind?: string;
  /** a fibre that MUST be in the composition (e.g. "wool") — honest no-match if absent */
  requiredFibre?: string;
}

export interface SoftPrefs {
  warm?: "warm" | "cool" | "neutral";
  colorPhrase?: { phrase: string; hex: string };
  sustainable?: boolean;
  lowerLeadTime?: boolean;
  maxPriceRank?: number;
  aesthetic?: string[];
  /** "quiet luxury" proxy — prefer muted, low-sheen, higher-tier */
  lowSheen?: boolean;
}

export const TIER_RANK: Record<DurabilityTier, number> = {
  residential: 1, "general-contract": 2, "severe-contract": 3,
};

/** Does a material pass every hard gate? If not, why (the first failing reason)? */
export function gateCheck(m: EnrichedMaterial, hard: HardConstraints): { pass: boolean; reason?: string } {
  if (hard.minDurability && TIER_RANK[m.durabilityTier] < TIER_RANK[hard.minDurability]) {
    return { pass: false, reason: `${m.martindale.toLocaleString()} Martindale — below ${hard.minDurability.replace("-", " ")} for this use` };
  }
  if (hard.requireContractFire && !m.fire.contractRated) {
    return { pass: false, reason: `no contract fire rating (${m.fire.cigaretteOnly ? "cigarette-only" : m.fire.raw || "none"})` };
  }
  if (hard.outdoor && !m.raw.attributes.indoor_outdoor.includes("outdoor")) {
    return { pass: false, reason: "indoor-only — not rated for outdoor exposure" };
  }
  if (hard.requiredKind && !m.textBlob.includes(hard.requiredKind)) {
    return { pass: false, reason: `not a ${hard.requiredKind}` };
  }
  if (hard.requiredFibre && !m.raw.composition.toLowerCase().includes(hard.requiredFibre)) {
    return { pass: false, reason: `no ${hard.requiredFibre} in composition` };
  }
  return { pass: true };
}

/** Apply gates across the corpus → eligible vs excluded-with-reason (never silent). */
export function applyGates(materials: EnrichedMaterial[], hard: HardConstraints) {
  const eligible: EnrichedMaterial[] = [];
  const excluded: { m: EnrichedMaterial; reason: string }[] = [];
  for (const m of materials) {
    const r = gateCheck(m, hard);
    if (r.pass) eligible.push(m);
    else excluded.push({ m, reason: r.reason! });
  }
  return { eligible, excluded };
}
