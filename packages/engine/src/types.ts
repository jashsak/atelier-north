// ── Raw corpus shape (data/materials.json) ──────────────────────────────────

export interface RawColorway {
  name: string;
  color_family: string;
  warm_cool: string;
  hex: string;
  image: string;
}

export interface RawAttributes {
  fiber_summary: string;
  recycled_content_pct: number;
  fire_rating: string;
  abrasion_martindale: number;
  indoor_outdoor: string;
  lead_time_weeks: number;
  price_tier: string; // "$".."$$$$" — relative band, no currency
  warm_cool: string;
  aesthetic_tags: string[];
  application: string[];
  space_use: string[];
  certifications: string[];
}

export interface RawMaterial {
  id: string;
  name: string;
  brand: string;
  type: string;
  pattern: string;
  composition: string;
  weight: string;
  description: string;
  attributes: RawAttributes;
  colorways: RawColorway[];
  notes?: string;
  related?: string[];
}

export interface Library {
  library: string;
  note_to_reader: string;
  schema: Record<string, string>;
  materials: RawMaterial[];
}

// ── Derived / enriched shape (all computed deterministically in TS) ──────────

export type DurabilityTier = "residential" | "general-contract" | "severe-contract";

/** Parsed from the free-text fire_rating string. */
export interface FireProfile {
  raw: string;
  en1021: boolean; // EN 1021 parts 1/2 (match/cigarette)
  bs7176: "Low" | "Medium" | "High" | null;
  imo: boolean; // marine
  cigaretteOnly: boolean; // EN 1021-1 only, no part 2 / no hazard class
  contractRated: boolean; // carries a contract hazard class (BS 7176 or IMO)
}

/** A field's source, per the corpus note_to_reader contract. */
export type Provenance = "cut-sheet" | "studio-record";

export interface EnrichedColorway extends RawColorway {
  /** Colour family classified from the hex itself (ground truth vs the label). */
  derivedFamily: string;
  /** label-vs-hex conflict: the recorded color_family disagrees with the pixels. */
  labelConflict: boolean;
  hsl: { h: number; s: number; l: number };
  lab: { L: number; a: number; b: number };
}

/** A single, sourced, machine-checkable fact the agent is allowed to cite. */
export interface Claim {
  key: string; // e.g. "durability", "fire", "recycled"
  label: string; // human label, e.g. "Abrasion"
  value: string; // rendered value, e.g. "100,000 Martindale (severe contract)"
  provenance: Provenance;
  /** evidence strength for the confidence/evidence-shape glyph row */
  strength: "tested" | "spec" | "inferred" | "missing" | "conflicted";
}

/** A detected contradiction in the record (studio note vs structured spec, etc.). */
export interface Conflict {
  kind: "note-vs-spec" | "label-vs-hex";
  message: string;
  studioSays?: string;
  sheetSays?: string;
}

/** A confusable near-twin a designer might mis-spec (from `related` + spec gap). */
export interface SubstitutionHazard {
  otherId: string;
  otherName: string;
  message: string; // "looks near-identical but is residential (28k); not for a lobby"
  martindaleDelta: number;
}

export interface MaterialIndex {
  meta: { library: string; note: string; schema: Record<string, string> };
  materials: EnrichedMaterial[];
  byId: Map<string, EnrichedMaterial>;
}

export interface EnrichedMaterial {
  raw: RawMaterial;
  id: string;
  name: string;
  brand: string;
  durabilityTier: DurabilityTier;
  martindale: number;
  fire: FireProfile;
  recycledPct: number;
  priceBand: string; // relative, no currency
  priceRank: number; // 1..4
  leadTimeWeeks: number;
  warmCool: string;
  aestheticTags: string[];
  spaceUse: string[];
  certifications: string[];
  /** lowercase haystack of pattern+composition+description for material/texture matching */
  textBlob: string;
  colorways: EnrichedColorway[];
  conflicts: Conflict[];
  substitutionHazards: SubstitutionHazard[];
  /** the exact set of properties the agent may assert about this material */
  claims: Claim[];
}

/** The fibre vocabulary this corpus's `composition` strings use. */
export const FIBRES = ["wool", "linen", "cotton", "viscose", "polyester", "nylon", "mohair", "polyacrylic", "acrylic"];
