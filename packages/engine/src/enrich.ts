import type {
  RawMaterial, EnrichedMaterial, EnrichedColorway, FireProfile,
  DurabilityTier, Claim, Conflict, SubstitutionHazard, Library, MaterialIndex,
} from "./types.js";
import { hexToHsl, hexToLab, familyFromHex, anchorForFamily, deltaE } from "./color.js";
import { TIER_RANK } from "./gates.js";

/** ΔE above which a colourway's recorded label disagrees with its swatch.
 *  Calibrated against all 496 colourways → ~3% flag rate: present but never crying wolf. */
const LABEL_CONFLICT_DELTA_E = 26;

// ── Durability (schema: ~25k residential, ~40k+ general contract, 100k+ severe) ──
export function durabilityTier(martindale: number): DurabilityTier {
  if (martindale >= 100_000) return "severe-contract";
  if (martindale >= 40_000) return "general-contract";
  return "residential";
}

// ── Fire rating (parsed from the free-text string) ──────────────────────────
export function parseFire(raw: string): FireProfile {
  const s = raw || "";
  const bsMatch = s.match(/BS\s*7176[^.;]*?(Low|Medium|High)\s*Hazard/i);
  const bs7176 = bsMatch ? (bsMatch[1]![0]!.toUpperCase() + bsMatch[1]!.slice(1).toLowerCase()) as FireProfile["bs7176"] : null;
  const imo = /IMO/i.test(s);
  const hasPart2 = /1021-1\s*&\s*2|1021-2/i.test(s);
  const cigaretteOnly = /cigarette/i.test(s) && !hasPart2;
  return {
    raw: s,
    en1021: /EN\s*1021/i.test(s),
    bs7176,
    imo,
    cigaretteOnly,
    contractRated: bs7176 !== null || imo,
  };
}

const PRICE_RANK: Record<string, number> = { "$": 1, "$$": 2, "$$$": 3, "$$$$": 4 };

function enrichColorways(m: RawMaterial): EnrichedColorway[] {
  return m.colorways.map((c) => {
    const lab = hexToLab(c.hex);
    const derivedFamily = familyFromHex(c.hex);
    const anchor = anchorForFamily(c.color_family);
    // Conflict by perceptual distance between the label's prototype and the swatch —
    // not by family spelling — and only when we have an anchor to judge against.
    const labelConflict = anchor ? deltaE(hexToLab(anchor), lab) > LABEL_CONFLICT_DELTA_E : false;
    return { ...c, derivedFamily, labelConflict, hsl: hexToHsl(c.hex), lab };
  });
}

function detectConflicts(m: RawMaterial, cw: EnrichedColorway[], martindale: number): Conflict[] {
  const out: Conflict[] = [];
  const note = (m.notes ?? "").toLowerCase();
  // Rule: a positive self-claim of durability on a sub-contract textile.
  const selfDurabilityClaim = /(wears? well|hard-?wearing|holds up|durable|heavy[- ]use)/i.test(note);
  if (selfDurabilityClaim && martindale < 40_000) {
    out.push({
      kind: "note-vs-spec",
      message: `Studio note implies it wears well, but it is rated ${martindale.toLocaleString()} Martindale — below general-contract (40,000).`,
      studioSays: m.notes,
      sheetSays: `${martindale.toLocaleString()} Martindale (residential)`,
    });
  }
  // Rule: the recorded colour label disagrees with the swatch hex. Surface only the
  // single clearest case per material (calibrated, quiet — not a flag on every card).
  const lying = cw
    .filter((c) => c.labelConflict)
    .sort((a, b) => deltaE(hexToLab(anchorForFamily(b.color_family)!), b.lab) - deltaE(hexToLab(anchorForFamily(a.color_family)!), a.lab));
  const worst = lying[0];
  if (worst) {
    out.push({
      kind: "label-vs-hex",
      message: `Colourway "${worst.name}" is labelled ${worst.color_family}, but the swatch reads ${worst.derivedFamily} (${worst.hex}). Trusting the swatch.`,
      studioSays: `label: ${worst.color_family}`,
      sheetSays: `swatch: ${worst.derivedFamily} ${worst.hex}`,
    });
  }
  return out;
}

function buildClaims(m: RawMaterial, fire: FireProfile, tier: DurabilityTier, hasLabelConflict: boolean): Claim[] {
  const a = m.attributes;
  const claims: Claim[] = [];
  claims.push({
    key: "durability", label: "Abrasion", provenance: "cut-sheet", strength: "tested",
    value: `${a.abrasion_martindale.toLocaleString()} Martindale (${tier.replace("-", " ")})`,
  });
  claims.push(
    fire.contractRated || fire.en1021
      ? { key: "fire", label: "Fire", provenance: "cut-sheet", strength: "spec", value: fire.raw }
      : { key: "fire", label: "Fire", provenance: "cut-sheet", strength: "missing", value: "no rating recorded" },
  );
  claims.push({
    key: "recycled", label: "Recycled content", provenance: "cut-sheet", strength: a.recycled_content_pct > 0 ? "spec" : "missing",
    value: `${a.recycled_content_pct}% recycled`,
  });
  claims.push({ key: "price", label: "Price band", provenance: "studio-record", strength: "spec", value: `${a.price_tier} (relative to this library)` });
  claims.push({ key: "lead", label: "Lead time", provenance: "studio-record", strength: "spec", value: `${a.lead_time_weeks} weeks` });
  claims.push({
    key: "certs", label: "Certifications", provenance: "cut-sheet",
    strength: a.certifications.length ? "spec" : "missing",
    value: a.certifications.length ? a.certifications.join(", ") : "none recorded",
  });
  claims.push({
    key: "colour", label: "Colour", provenance: "studio-record",
    strength: hasLabelConflict ? "conflicted" : "spec",
    value: m.colorways.map((c) => c.name).join(", "),
  });
  return claims;
}

export function enrichMaterial(m: RawMaterial): EnrichedMaterial {
  const a = m.attributes;
  const tier = durabilityTier(a.abrasion_martindale);
  const fire = parseFire(a.fire_rating);
  const colorways = enrichColorways(m);
  const conflicts = detectConflicts(m, colorways, a.abrasion_martindale);
  const hasLabelConflict = colorways.some((c) => c.labelConflict);
  return {
    raw: m,
    id: m.id,
    name: m.name,
    brand: m.brand,
    durabilityTier: tier,
    martindale: a.abrasion_martindale,
    fire,
    recycledPct: a.recycled_content_pct,
    priceBand: a.price_tier,
    priceRank: PRICE_RANK[a.price_tier] ?? 0,
    leadTimeWeeks: a.lead_time_weeks,
    warmCool: a.warm_cool,
    aestheticTags: a.aesthetic_tags ?? [],
    spaceUse: a.space_use ?? [],
    certifications: a.certifications ?? [],
    textBlob: `${m.pattern} ${m.composition} ${m.description} ${(a.aesthetic_tags ?? []).join(" ")}`.toLowerCase(),
    colorways,
    conflicts,
    substitutionHazards: [], // filled in a second pass (needs the whole index)
    claims: buildClaims(m, fire, tier, hasLabelConflict),
  };
}

/** Second pass: substitution hazards from `related` + a material-spec gap. */
export function linkSubstitutionHazards(byId: Map<string, EnrichedMaterial>): void {
  for (const m of byId.values()) {
    const related = m.raw.related ?? [];
    const hazards: SubstitutionHazard[] = [];
    for (const rid of related) {
      const other = byId.get(rid);
      if (!other) continue;
      const delta = other.martindale - m.martindale;
      const crossesTier = TIER_RANK[other.durabilityTier] !== TIER_RANK[m.durabilityTier];
      if (!crossesTier && Math.abs(delta) < 20_000) continue; // genuinely interchangeable
      const lower = m.martindale < other.martindale ? m : other;
      const msg =
        m === lower
          ? `Looks near-identical to ${other.name}, but ${m.name} is only ${m.martindale.toLocaleString()} Martindale (${m.durabilityTier.replace("-", " ")}) — don't mistake it for the contract-grade twin.`
          : `Looks near-identical to ${other.name}, but ${other.name} is only ${other.martindale.toLocaleString()} Martindale (${other.durabilityTier.replace("-", " ")}) — easy to mis-spec for a high-traffic job.`;
      hazards.push({ otherId: other.id, otherName: other.name, message: msg, martindaleDelta: Math.abs(delta) });
    }
    m.substitutionHazards = hazards;
  }
}

/** Pure: turn parsed corpus JSON into an index. No filesystem access — safe in a browser bundle. */
export function buildIndex(raw: Library): MaterialIndex {
  const materials = raw.materials.map(enrichMaterial);
  const byId = new Map(materials.map((m) => [m.id, m]));
  linkSubstitutionHazards(byId);
  return {
    meta: { library: raw.library, note: raw.note_to_reader, schema: raw.schema },
    materials,
    byId,
  };
}
