import type { EnrichedMaterial, EnrichedColorway, Conflict, SubstitutionHazard, MaterialIndex } from "./types.js";
import { type HardConstraints, type SoftPrefs, applyGates, gateCheck } from "./gates.js";
import { type ParsedIntent } from "./parse.js";
import { deltaE, hexToLab, familyFromHex } from "./color.js";

// colour-family groups so "deep green" rewards swatches that actually read green
const HUE_GROUP: Record<string, string> = {
  black: "dark", charcoal: "dark", grey: "neutral", stone: "neutral", "off-white": "light", cream: "light", beige: "brown", taupe: "brown", brown: "brown", camel: "brown",
  olive: "green", khaki: "green", forest: "green", green: "green", teal: "teal",
  navy: "blue", blue: "blue", violet: "purple", plum: "purple",
  red: "red", maroon: "red", terracotta: "red", ochre: "yellow",
};
const hgroup = (f: string) => HUE_GROUP[f] ?? f;

export interface EvidenceGlyph { symbol: string; label: string; strength: "tested" | "spec" | "inferred" | "missing" | "conflicted" }

export interface Pick {
  material: EnrichedMaterial;
  score: number;
  earnedBy: string;
  tradeoff: string | null;
  bestColorway: EnrichedColorway;
  evidenceShape: EvidenceGlyph[];
  hazards: SubstitutionHazard[];
  conflicts: Conflict[];
}

export interface EvidenceBrief {
  query: string;
  intent: ParsedIntent;
  picks: Pick[];
  excludedSample: { name: string; reason: string }[];
  coverage: { eligible: number; total: number; binding: string | null };
  abstained: boolean;
  abstainReason: string | null;
  /** too little signal to recommend — the UI asks for clarification instead of bluffing */
  unclear: boolean;
  nearest: Pick[];
  notes: string[];
}

const GLYPH = { tested: "▮", spec: "▮", inferred: "◌", missing: "✕", conflicted: "⚠" } as const;

function evidenceShape(m: EnrichedMaterial): EvidenceGlyph[] {
  return m.claims
    .filter((c) => ["durability", "fire", "recycled", "colour"].includes(c.key))
    .map((c) => ({ symbol: GLYPH[c.strength], label: c.label, strength: c.strength }));
}

function bestColorwayFor(m: EnrichedMaterial, soft: SoftPrefs): { cw: EnrichedColorway; dE?: number } {
  if (soft.colorPhrase) {
    const target = hexToLab(soft.colorPhrase.hex);
    let best = m.colorways[0]!, bestD = Infinity;
    for (const c of m.colorways) {
      const d = deltaE(c.lab, target);
      if (d < bestD) { bestD = d; best = c; }
    }
    return { cw: best, dE: bestD };
  }
  // otherwise prefer a colourway matching warmth, else the first
  if (soft.warm) {
    const m2 = m.colorways.find((c) => c.warm_cool === soft.warm);
    if (m2) return { cw: m2 };
  }
  return { cw: m.colorways[0]! };
}

function sustainabilityScore(m: EnrichedMaterial): number {
  let s = m.recycledPct / 100; // 0..1
  s += Math.min(m.certifications.length, 3) * 0.12;
  if (/recycled/i.test(m.raw.composition)) s += 0.1;
  return s;
}

interface Scored { m: EnrichedMaterial; score: number; cw: EnrichedColorway; dE?: number; reasons: string[] }

function scoreMaterial(m: EnrichedMaterial, soft: SoftPrefs): Scored {
  let score = 0;
  const reasons: string[] = [];
  const { cw, dE } = bestColorwayFor(m, soft);

  if (soft.colorPhrase && dE !== undefined) {
    let cs = Math.max(0, 1 - dE / 60);
    // trust the swatch's hue: a near-black that's ΔE-close to "deep green" shouldn't win
    const targetGroup = hgroup(familyFromHex(soft.colorPhrase.hex));
    const swatchGroup = hgroup(cw.derivedFamily);
    if (targetGroup !== swatchGroup) cs *= swatchGroup === "dark" ? 0.35 : 0.5;
    score += cs * 3;
    if (cs > 0.55) reasons.push(`${cw.name} reads close to ${soft.colorPhrase.phrase} (swatch ${cw.hex})`);
  }
  if (soft.warm) {
    if (m.warmCool === soft.warm) { score += 1; reasons.push(`reads ${soft.warm}`); }
    else if (m.warmCool === "neutral") score += 0.3;
  }
  if (soft.sustainable) {
    const ss = sustainabilityScore(m);
    score += ss * 2;
    const bits: string[] = [];
    if (m.recycledPct >= 50) bits.push(`${m.recycledPct}% recycled`);
    if (m.certifications.length) bits.push(m.certifications.join(", "));
    if (bits.length) reasons.push(bits.join(" · "));
  }
  if (soft.lowSheen) {
    if (m.aestheticTags.includes("quiet-luxury")) { score += 0.8; reasons.push("tagged quiet-luxury"); }
    if (cw.hsl.s < 0.35) score += 0.4; // muted
    if (m.priceRank >= 3) score += 0.2; // higher-tier
    if (/lustrous|sheen|glossy|shiny/.test(m.textBlob)) score -= 0.5;
  }
  for (const tag of soft.aesthetic ?? []) if (m.aestheticTags.includes(tag)) score += 0.3;
  if (soft.lowerLeadTime) score += Math.max(0, (16 - m.leadTimeWeeks) / 16);
  if (soft.maxPriceRank && m.priceRank > soft.maxPriceRank) { score -= 1; reasons.push(`above your price band (${m.priceBand})`); }
  // durability headroom — a mild, always-on quality signal
  score += Math.min(m.martindale, 100_000) / 100_000 * 0.4;

  return { m, score, cw, dE, reasons };
}

function tradeoffFor(s: Scored, soft: SoftPrefs, rankInWarm?: { rank: number; total: number }): string | null {
  const m = s.m;
  if (m.leadTimeWeeks >= 10) return `long ${m.leadTimeWeeks}-week lead time`;
  if (soft.sustainable && m.recycledPct === 0) return "no recycled content — its case rests on fibre, not recycling";
  if (soft.warm && rankInWarm && rankInWarm.rank > 1) return `not the warmest option (the warmer ones fell below your durability gate)`;
  if (m.priceRank === 4) return "top price band (relative to this library)";
  if (m.certifications.length === 0) return "no certifications recorded — absence isn't proof of absence";
  return null;
}

/** Which single gate removed the most candidates? (diagnostic coverage) */
function bindingConstraint(materials: EnrichedMaterial[], hard: HardConstraints): string | null {
  const keys: (keyof HardConstraints)[] = ["minDurability", "requireContractFire", "outdoor", "requiredKind", "requiredFibre"];
  let worst: { key: string; removed: number } | null = null;
  for (const k of keys) {
    if (hard[k] === undefined) continue;
    const solo = { [k]: hard[k] } as HardConstraints;
    const removed = materials.filter((m) => !gateCheck(m, solo).pass).length;
    if (!worst || removed > worst.removed) worst = { key: k, removed };
  }
  if (!worst) return null;
  const label: Record<string, string> = {
    minDurability: "durability", requireContractFire: "fire class", outdoor: "outdoor rating", requiredKind: "material type", requiredFibre: "fibre",
  };
  return label[worst.key] ?? worst.key;
}

function toPick(s: Scored, soft: SoftPrefs, warmRank?: { rank: number; total: number }): Pick {
  const earnedBy = s.reasons[0] ?? `${s.m.durabilityTier.replace("-", " ")} · ${s.m.martindale.toLocaleString()} Martindale`;
  return {
    material: s.m, score: s.score, earnedBy,
    tradeoff: tradeoffFor(s, soft, warmRank),
    bestColorway: s.cw,
    evidenceShape: evidenceShape(s.m),
    hazards: s.m.substitutionHazards,
    conflicts: s.m.conflicts,
  };
}

export interface SearchOpts { count?: number }

export function searchMaterials(idx: MaterialIndex, intent: ParsedIntent, opts: SearchOpts = {}): EvidenceBrief {
  const count = opts.count ?? intent.count ?? 3;
  const { hard, soft } = intent;
  const notes = [...intent.interpretations];
  for (const u of intent.unsupported) notes.push(`This library doesn't record ${u} — verify that with the maker.`);

  // ── too little signal to recommend: ask, don't bluff ──
  if (intent.unclear) {
    return {
      query: intent.query, intent, picks: [], excludedSample: [],
      coverage: { eligible: idx.materials.length, total: idx.materials.length, binding: null },
      abstained: false, abstainReason: null, unclear: true, nearest: [], notes,
    };
  }

  const { eligible, excluded } = applyGates(idx.materials, hard);
  const binding = bindingConstraint(idx.materials, hard);
  const coverage = { eligible: eligible.length, total: idx.materials.length, binding };

  // ── abstention is unconditional + engine-owned ──
  if (eligible.length === 0) {
    // nearest neighbours ignoring the most-restrictive gate (usually requiredKind)
    const relaxed: HardConstraints = { ...hard };
    if (hard.requiredKind) delete relaxed.requiredKind;
    else if (hard.requiredFibre) delete relaxed.requiredFibre;
    else if (hard.outdoor) delete relaxed.outdoor;
    const { eligible: near } = applyGates(idx.materials, relaxed);
    const scoredNear = near.map((m) => scoreMaterial(m, soft)).sort((a, b) => b.score - a.score).slice(0, 3);
    const reason = hard.requiredKind
      ? `Atelier North's library holds no ${hard.requiredKind}s.`
      : `Nothing in the library meets every constraint${binding ? ` — the binding one is ${binding}` : ""}.`;
    return {
      query: intent.query, intent, picks: [], excludedSample: excluded.slice(0, 4).map((e) => ({ name: e.m.name, reason: e.reason })),
      coverage, abstained: true, abstainReason: reason, unclear: false,
      nearest: scoredNear.map((s) => toPick(s, soft)),
      notes: [...notes, hard.requiredKind ? "Showing the closest in hand and colour instead — verify before specifying." : ""].filter(Boolean),
    };
  }

  const scored = eligible.map((m) => scoreMaterial(m, soft)).sort((a, b) => b.score - a.score);
  // warmth ranking for trade-off honesty
  const warmRanked = soft.warm ? [...scored].filter((s) => s.m.warmCool === soft.warm) : [];
  const picks = scored.slice(0, count).map((s) => {
    const wr = soft.warm ? { rank: warmRanked.findIndex((x) => x.m.id === s.m.id) + 1, total: warmRanked.length } : undefined;
    return toPick(s, soft, wr);
  });

  // thin-evidence note
  if (soft.sustainable) {
    const noCert = idx.materials.filter((m) => m.certifications.length === 0).length;
    notes.push(`${noCert} of ${idx.materials.length} textiles record no certifications — a missing cert isn't proof of absence.`);
  }
  if (coverage.eligible <= 2 && binding) notes.push(`Only ${coverage.eligible} meet every constraint — the binding one is ${binding}; relax it to widen the field.`);
  if (hard.outdoor) notes.push("These are indoor/outdoor-rated, but the library records no wet/UV/chlorine spec — for sustained poolside exposure, confirm with the maker.");

  return {
    query: intent.query, intent, picks,
    excludedSample: excluded.slice(0, 4).map((e) => ({ name: e.m.name, reason: e.reason })),
    coverage, abstained: false, abstainReason: null, unclear: false, nearest: [], notes,
  };
}
