import { FIBRES, type EnrichedMaterial, type MaterialIndex } from "./types.js";
import { type HardConstraints, gateCheck } from "./gates.js";
import { deltaE } from "./color.js";

function fibreSet(m: EnrichedMaterial): Set<string> {
  const c = m.raw.composition.toLowerCase();
  return new Set(FIBRES.filter((f) => c.includes(f)));
}
function weightGsm(m: EnrichedMaterial): number {
  const match = m.raw.weight.match(/(\d+)\s*g/i);
  return match ? parseInt(match[1]!, 10) : 0;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 0;
  const inter = [...a].filter((x) => b.has(x)).length;
  return inter / (a.size + b.size - inter);
}
function minColorDelta(a: EnrichedMaterial, b: EnrichedMaterial): number {
  let best = Infinity;
  for (const x of a.colorways) for (const y of b.colorways) best = Math.min(best, deltaE(x.lab, y.lab));
  return best;
}

/** Texture-first similarity (Daniel's law: match the material, then rank by colour). */
export function textureSimilarity(a: EnrichedMaterial, b: EnrichedMaterial): number {
  let s = 0;
  if (a.raw.pattern.toLowerCase() === b.raw.pattern.toLowerCase()) s += 1;
  const wa = weightGsm(a), wb = weightGsm(b);
  if (wa && wb) s += Math.max(0, 1 - Math.abs(wa - wb) / 600); // weight closeness
  s += jaccard(fibreSet(a), fibreSet(b)) * 1.5; // shared fibre / hand
  const tagsA = new Set(a.aestheticTags), tagsB = new Set(b.aestheticTags);
  s += jaccard(tagsA, tagsB) * 0.5;
  return s;
}

export interface SimilarResult { material: EnrichedMaterial; textureScore: number; colorDeltaE: number }

export function findSimilar(idx: MaterialIndex, id: string, k = 5): SimilarResult[] {
  const a = idx.byId.get(id);
  if (!a) return [];
  return idx.materials
    .filter((m) => m.id !== id)
    .map((m) => ({ material: m, textureScore: textureSimilarity(a, m), colorDeltaE: minColorDelta(a, m) }))
    // texture-first: sort by texture desc, then colour distance asc
    .sort((x, y) => (y.textureScore - x.textureScore) || (x.colorDeltaE - y.colorDeltaE))
    .slice(0, k);
}

export type BetterAxis = "durability" | "recycled" | "price" | "lead";

const axisValue: Record<BetterAxis, (m: EnrichedMaterial) => number> = {
  durability: (m) => m.martindale,
  recycled: (m) => m.recycledPct,
  price: (m) => -m.priceRank, // cheaper is better
  lead: (m) => -m.leadTimeWeeks, // shorter is better
};

export interface Alternative {
  base: EnrichedMaterial;
  better: EnrichedMaterial | null;
  axis: BetterAxis;
  delta: string;
  tradeoff: string | null;
  note?: string;
}

/**
 * "Similar but BETTER" — same texture neighbourhood, strictly better on `axis`,
 * AND still satisfies the original query's hard gates (an upgrade you can spec).
 */
export function findAlternative(idx: MaterialIndex, id: string, axis: BetterAxis, hard: HardConstraints = {}): Alternative {
  const base = idx.byId.get(id);
  if (!base) return { base: base!, better: null, axis, delta: "", tradeoff: null };
  const val = axisValue[axis];
  const candidates = findSimilar(idx, id, 12)
    .filter((s) => s.textureScore >= 1) // genuinely same family
    .map((s) => s.material)
    .filter((m) => gateCheck(m, hard).pass) // MUST still qualify for the job
    .filter((m) => val(m) > val(base))
    .sort((a, b) => val(b) - val(a));

  const better = candidates[0] ?? null;
  if (!better) {
    return { base, better: null, axis, delta: "", tradeoff: null, note: `Nothing similar is better on ${axis} while still meeting the brief.` };
  }
  const deltas: Record<BetterAxis, string> = {
    durability: `${better.martindale.toLocaleString()} vs ${base.martindale.toLocaleString()} Martindale`,
    recycled: `${better.recycledPct}% vs ${base.recycledPct}% recycled`,
    price: `${better.priceBand} vs ${base.priceBand}`,
    lead: `${better.leadTimeWeeks} vs ${base.leadTimeWeeks} weeks`,
  };
  // honest cost of the upgrade
  let tradeoff: string | null = null;
  if (better.priceRank > base.priceRank) tradeoff = `costs ${better.priceRank - base.priceRank} price band more`;
  else if (better.leadTimeWeeks > base.leadTimeWeeks) tradeoff = `${better.leadTimeWeeks - base.leadTimeWeeks} weeks longer lead`;
  return { base, better, axis, delta: deltas[axis], tradeoff };
}
