export * from "./types.js";
export * from "./color.js";
export * from "./enrich.js";
export * from "./gates.js";
export * from "./parse.js";
export * from "./search.js";
export * from "./similar.js";
export { loadIndex, libraryShape, DATA_DIR, REPO_ROOT } from "./load.js";

import { loadIndex } from "./load.js";
import type { MaterialIndex } from "./types.js";
import { parseQuery } from "./parse.js";
import { searchMaterials, type EvidenceBrief } from "./search.js";

/** One-call deterministic answer (the always-correct spine; no LLM). */
export function ask(query: string, idx?: MaterialIndex): EvidenceBrief {
  const index = idx ?? loadIndex();
  return searchMaterials(index, parseQuery(query));
}

/** Grounded evidence for a material id — the only facts a tool/agent may cite. */
export function getEvidenceOf(idx: MaterialIndex, id: string) {
  const m = idx.byId.get(id);
  if (!m) return null;
  return {
    id: m.id, name: m.name, brand: m.brand,
    durabilityTier: m.durabilityTier, priceBand: m.priceBand, warmCool: m.warmCool,
    recycledPct: m.recycledPct, certifications: m.certifications,
    claims: m.claims.map((c) => ({ label: c.label, value: c.value, provenance: c.provenance, strength: c.strength })),
    conflicts: m.conflicts.map((c) => c.message),
    hazards: m.substitutionHazards.map((h) => h.message),
  };
}
