import type { HardConstraints, SoftPrefs } from "./gates.js";
import { resolveColorPhrase } from "./color.js";

export interface Chip {
  kind: "gate" | "preference";
  label: string; // designer-facing, e.g. "Heavy-duty seating"
  detail: string; // the spec receipt, e.g. "40,000+ Martindale (general contract)"
  why: string; // "inferred from 'lobby'" | "you said"
  source: "inferred" | "stated";
}

export interface ParsedIntent {
  query: string;
  hard: HardConstraints;
  soft: SoftPrefs;
  chips: Chip[];
  /** how many picks the designer asked for ("three ...") */
  count: number;
  /** interpretations we made for vague aesthetic terms, to state out loud */
  interpretations: string[];
  /** dimensions the designer asked for that the library simply can't evidence */
  unsupported: string[];
  /** true when we found no meaningful signal to recommend on — ask, don't bluff */
  unclear: boolean;
}

const has = (t: string, ...words: string[]) => words.some((w) => t.includes(w));

const CONTRACT_WORDS = [
  "lobby", "hotel", "hospitality", "restaurant", "banquette", "bar", "reception",
  "lounge", "commercial", "contract", "high-traffic", "high traffic", "office",
  "workplace", "waiting room", "public", "airport", "lobby seating",
];
const RESIDENTIAL_WORDS = ["residential", "home", "house", "bedroom", "guest room", "guestroom", "living room", "domestic", "headboard"];
const OUTDOOR_WORDS = ["poolside", "pool", "outdoor", "exterior", "patio", "cabana", "terrace", "marine", "yacht", "deck"];
const MATERIAL_KINDS = ["velvet", "bouclé", "boucle", "leather", "chenille", "suede", "corduroy"];
// Deliberately narrower than @me/engine's FIBRES vocabulary (no "polyacrylic") — a designer
// asking for a fibre by name doesn't say "polyacrylic", so it's excluded from query parsing.
const FIBRES = ["wool", "linen", "cotton", "viscose", "polyester", "nylon", "mohair", "acrylic"];
// hand-feel words → the aesthetic tag we approximate them with (the library records no true "hand")
const HANDFEEL: Record<string, string> = {
  soft: "warm-handed", plush: "warm-handed", "warm-handed": "warm-handed",
  lustrous: "lustrous", silky: "lustrous", crisp: "tonal", textured: "textured", nubby: "textured",
};
// style words → aesthetic tags the corpus actually carries
const STYLE: Record<string, string> = {
  tonal: "tonal", minimal: "minimal", calm: "tonal", understated: "minimal",
  luxe: "quiet-luxury", luxurious: "quiet-luxury", refined: "quiet-luxury",
};
// dimensions a designer asks for that this library genuinely cannot evidence
const UNSUPPORTED: { rx: RegExp; label: string }[] = [
  { rx: /wipe|bleach|clean(?:able|ing)?|stain[- ]?resist|crypton|washable|scrubbable/i, label: "cleanability / cleaning code" },
  { rx: /railroad|repeat|roll width|usable width|\bwidth\b/i, label: "roll width / railroad / repeat" },
  { rx: /pet[- ]?friendly|pet[- ]?proof|kid[- ]?proof|child[- ]?proof|scratch/i, label: "pet / child durability" },
  { rx: /\bcal\b|tb ?117|title ?19|jurisdiction|\bcode\b(?! )/i, label: "jurisdiction-specific fire compliance" },
];

const NUMS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, a: 1, an: 1 };
const GENERAL_CONTRACT_DETAIL = "40,000+ Martindale (general contract)";

export function parseQuery(query: string): ParsedIntent {
  const t = query.toLowerCase();
  const hard: HardConstraints = {};
  const soft: SoftPrefs = {};
  const chips: Chip[] = [];
  const interpretations: string[] = [];

  // ── count ("three warm options") ──
  let count = 3;
  const numMatch = t.match(/\b(\d+|one|two|three|four|five|six)\b/);
  if (numMatch) {
    const n = NUMS[numMatch[1]!] ?? parseInt(numMatch[1]!, 10);
    if (!Number.isNaN(n)) count = n;
  }

  // ── use-case → durability + fire gates (inferred) ──
  const contractHit = CONTRACT_WORDS.find((w) => t.includes(w));
  const outdoorHit = OUTDOOR_WORDS.find((w) => t.includes(w));
  const residentialHit = RESIDENTIAL_WORDS.find((w) => t.includes(w));
  if (contractHit) {
    hard.minDurability = "general-contract";
    hard.requireContractFire = true;
    chips.push({ kind: "gate", label: "Heavy-duty seating", detail: GENERAL_CONTRACT_DETAIL, why: `inferred from "${contractHit}"`, source: "inferred" });
    chips.push({ kind: "gate", label: "Passes commercial fire", detail: "BS 7176 / EN 1021 contract hazard class", why: `inferred from "${contractHit}"`, source: "inferred" });
  } else if (residentialHit) {
    hard.minDurability = "residential";
    chips.push({ kind: "gate", label: "Residential-grade", detail: "25,000+ Martindale", why: `inferred from "${residentialHit}"`, source: "inferred" });
  }
  if (outdoorHit) {
    hard.outdoor = true;
    chips.push({ kind: "gate", label: "Outdoor-rated", detail: "indoor/outdoor capable", why: `inferred from "${outdoorHit}"`, source: "inferred" });
  } else if (contractHit) {
    chips.push({ kind: "gate", label: "Indoor", detail: "interior use", why: `inferred from "${contractHit}"`, source: "inferred" });
  }

  // ── requested material/texture kind → hard requiredKind (drives honest no-match) ──
  const kind = MATERIAL_KINDS.find((k) => t.includes(k));
  if (kind) {
    const norm = kind === "bouclé" ? "boucle" : kind;
    hard.requiredKind = norm;
    chips.push({ kind: "gate", label: `Must be ${kind}`, detail: "material/texture requirement", why: "you said", source: "stated" });
  }

  // ── warmth (stated) ──
  if (has(t, "warm")) { soft.warm = "warm"; chips.push({ kind: "preference", label: "Warm tones", detail: "warm colour temperature", why: "you said", source: "stated" }); }
  else if (has(t, "cool")) { soft.warm = "cool"; chips.push({ kind: "preference", label: "Cool tones", detail: "cool colour temperature", why: "you said", source: "stated" }); }
  else if (has(t, "neutral")) { soft.warm = "neutral"; chips.push({ kind: "preference", label: "Neutral tones", detail: "neutral colour temperature", why: "you said", source: "stated" }); }

  // ── sustainability (stated) ──
  if (has(t, "sustainab", "eco", "recycled", "environmental", "green credential")) {
    soft.sustainable = true;
    chips.push({ kind: "preference", label: "Sustainable", detail: "recycled content / certifications", why: "you said", source: "stated" });
  }

  // ── lead time / price (stated) ──
  if (has(t, "fast", "quick", "short lead", "in stock", "soon", "urgent")) { soft.lowerLeadTime = true; chips.push({ kind: "preference", label: "Shorter lead time", detail: "lower weeks-to-ship", why: "you said", source: "stated" }); }
  if (has(t, "budget", "affordable", "cheap", "inexpensive")) { soft.maxPriceRank = 2; chips.push({ kind: "preference", label: "Mid / lower price", detail: "≤ $$ band (relative)", why: "you said", source: "stated" }); }

  // ── colour phrase (stated) ──
  const colour = resolveColorPhrase(t);
  if (colour) { soft.colorPhrase = colour; chips.push({ kind: "preference", label: `Colour: ${colour.phrase}`, detail: "matched on the swatch, not the label", why: "you said", source: "stated" }); }

  // ── aesthetic vibes → defensible proxies, stated out loud ──
  if (has(t, "quiet luxury", "quiet-luxury")) {
    soft.aesthetic = [...(soft.aesthetic ?? []), "quiet-luxury"];
    soft.lowSheen = true;
    interpretations.push("reading “quiet luxury” as low-sheen, muted saturation, higher price band — adjust if that's not your read");
    chips.push({ kind: "preference", label: "Quiet luxury", detail: "low-sheen · muted · higher-tier", why: "interpreted", source: "inferred" });
  }
  // ── fibre (hard: "wool" must contain wool, else honest no-match) ──
  const fibre = FIBRES.find((f) => new RegExp(`\\b${f}\\b`).test(t));
  if (fibre) { hard.requiredFibre = fibre; chips.push({ kind: "gate", label: `${fibre[0]!.toUpperCase()}${fibre.slice(1)}`, detail: "must be in the composition", why: "you said", source: "stated" }); }

  // ── hand-feel → approximated by aesthetic tags, said out loud (the library records no true "hand") ──
  const feel = Object.keys(HANDFEEL).find((w) => t.includes(w));
  if (feel) {
    soft.aesthetic = [...(soft.aesthetic ?? []), HANDFEEL[feel]!];
    interpretations.push(`hand-feel isn't recorded — approximating "${feel}" by weave/aesthetic; verify by sample`);
    chips.push({ kind: "preference", label: `${feel[0]!.toUpperCase()}${feel.slice(1)} hand`, detail: `approximated via ${HANDFEEL[feel]}`, why: "interpreted", source: "inferred" });
  }

  // ── style words → aesthetic tags ──
  for (const w of Object.keys(STYLE)) if (t.includes(w)) soft.aesthetic = [...(soft.aesthetic ?? []), STYLE[w]!];

  // durable (without a use-case) still implies contract-ish durability
  if (!hard.minDurability && has(t, "durable", "hard-wearing", "hard wearing", "tough", "resilient")) {
    hard.minDurability = "general-contract";
    chips.push({ kind: "gate", label: "Durable", detail: GENERAL_CONTRACT_DETAIL, why: "you said", source: "stated" });
  }

  // ── dimensions this library can't evidence — name them, don't silently drop ──
  const unsupported = UNSUPPORTED.filter((u) => u.rx.test(t)).map((u) => u.label);

  // ── low-signal: did we find anything to recommend on? if not, ask rather than bluff ──
  const hasGate = !!(hard.minDurability || hard.requireContractFire || hard.outdoor || hard.requiredKind || hard.requiredFibre);
  const hasPref = !!(soft.warm || soft.colorPhrase || soft.sustainable || soft.lowerLeadTime || soft.maxPriceRank || (soft.aesthetic && soft.aesthetic.length));
  const unclear = !hasGate && !hasPref;

  return { query, hard, soft, chips, count, interpretations, unsupported, unclear };
}
