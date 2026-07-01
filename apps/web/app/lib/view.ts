import type { EvidenceBrief, Pick, EnrichedColorway } from "@me/engine";

export interface ViewColorway { name: string; hex: string; image: string; family: string; labelConflict: boolean }
export interface ViewPick {
  id: string; name: string; brand: string;
  durabilityTier: string; martindale: number; priceBand: string; leadTimeWeeks: number; recycledPct: number;
  fireRaw: string; certifications: string[]; composition: string; description: string;
  earnedBy: string; tradeoff: string | null;
  swatch: ViewColorway; colorways: ViewColorway[];
  evidenceShape: { symbol: string; label: string; strength: string }[];
  hazards: { message: string }[];
  conflicts: { kind: string; message: string; studioSays?: string; sheetSays?: string }[];
  claims: { key: string; label: string; value: string; provenance: string; strength: string }[];
}
export interface ViewBrief {
  query: string;
  read?: string | null; // LLM narration when a key is present; else null → templated
  unclear: boolean;
  abstained: boolean; abstainReason: string | null;
  coverage: { eligible: number; total: number; binding: string | null };
  chips: EvidenceBrief["intent"]["chips"];
  interpretations: string[];
  notes: string[];
  picks: ViewPick[];
  nearest: ViewPick[];
  excluded: { name: string; reason: string }[];
}

const imgUrl = (image: string) => "/swatch/" + image.replace(/^images\//, "");
const cw = (c: EnrichedColorway): ViewColorway => ({ name: c.name, hex: c.hex, image: imgUrl(c.image), family: c.derivedFamily, labelConflict: c.labelConflict });

function pick(p: Pick): ViewPick {
  const m = p.material;
  return {
    id: m.id, name: m.name, brand: m.brand,
    durabilityTier: m.durabilityTier, martindale: m.martindale, priceBand: m.priceBand,
    leadTimeWeeks: m.leadTimeWeeks, recycledPct: m.recycledPct,
    fireRaw: m.fire.raw, certifications: m.certifications,
    composition: m.raw.composition, description: m.raw.description,
    earnedBy: p.earnedBy, tradeoff: p.tradeoff,
    swatch: cw(p.bestColorway), colorways: m.colorways.map(cw),
    evidenceShape: p.evidenceShape, hazards: p.hazards.map((h) => ({ message: h.message })),
    conflicts: p.conflicts, claims: m.claims,
  };
}

export function toView(b: EvidenceBrief): ViewBrief {
  return {
    query: b.query, unclear: b.unclear, abstained: b.abstained, abstainReason: b.abstainReason,
    coverage: b.coverage, chips: b.intent.chips, interpretations: b.intent.interpretations,
    notes: b.notes, picks: b.picks.map(pick), nearest: b.nearest.map(pick), excluded: b.excludedSample,
  };
}
