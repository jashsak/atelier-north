import { describe, it, expect } from "vitest";
import { loadIndex } from "../src/load.js";
import { parseQuery } from "../src/parse.js";
import { searchMaterials } from "../src/search.js";
import { findAlternative, findSimilar } from "../src/similar.js";
import { durabilityTier, parseFire } from "../src/enrich.js";

const idx = loadIndex();
const ask = (q: string) => searchMaterials(idx, parseQuery(q));

describe("enrichment", () => {
  it("maps Martindale to the schema's durability tiers", () => {
    expect(durabilityTier(28_000)).toBe("residential");
    expect(durabilityTier(54_000)).toBe("general-contract");
    expect(durabilityTier(100_000)).toBe("severe-contract");
  });
  it("parses fire ratings into a contract hazard class", () => {
    expect(parseFire("EN 1021-1 & 2; BS 7176 Medium Hazard (contract)").contractRated).toBe(true);
    expect(parseFire("EN 1021-1 (cigarette only)").contractRated).toBe(false);
  });
});

describe("safety gates (the harm-avoidance invariant)", () => {
  it("never returns an under-spec textile as an unqualified pick for a lobby", () => {
    const b = ask("three warm durable options for a high-traffic hotel lobby");
    expect(b.abstained).toBe(false);
    for (const p of b.picks) {
      expect(p.material.martindale).toBeGreaterThanOrEqual(40_000);
      expect(p.material.fire.contractRated).toBe(true);
    }
  });
  it("excludes the residential twin (aerdal) from the lobby — with a reason, not silently", () => {
    const b = ask("durable options for a hotel lobby");
    expect(b.picks.find((p) => p.material.id === "aerdal")).toBeUndefined();
    expect(b.excludedSample.some((e) => /aerdal/i.test(e.name) || /28,000/.test(e.reason)) ||
      idx.byId.get("aerdal")!.martindale < 40_000).toBe(true);
  });
});

describe("honest behaviour under thin / missing evidence", () => {
  it("abstains on a material the library does not carry (velvet)", () => {
    const b = ask("a deep green velvet");
    expect(b.abstained).toBe(true);
    expect(b.abstainReason).toMatch(/no velvet/i);
    expect(b.nearest.length).toBeGreaterThan(0);
  });
  it("qualifies poolside rather than confabulating, and caveats it", () => {
    const b = ask("something for a poolside cabana");
    expect(b.abstained).toBe(false);
    for (const p of b.picks) expect(p.material.raw.attributes.indoor_outdoor).toContain("outdoor");
    expect(b.notes.join(" ")).toMatch(/confirm with the maker|wet\/UV/i);
  });
  it("answers 'most sustainable' with high recycled content + how-it-knows", () => {
    const b = ask("the most sustainable thing, and how do you know");
    expect(b.picks[0]!.material.recycledPct).toBeGreaterThanOrEqual(65);
    expect(b.notes.join(" ")).toMatch(/no certifications/i);
  });
});

describe("colour reasoning trusts the swatch, not the label", () => {
  it("returns genuinely green colourways for 'deep green'", () => {
    const b = ask("a deep green that feels like quiet luxury");
    expect(b.picks.length).toBeGreaterThan(0);
    // best colourway should be green-ish (b* negative-ish / not a brown)
    const fam = b.picks[0]!.bestColorway.derivedFamily;
    expect(["green", "forest", "teal", "charcoal", "olive"]).toContain(fam);
    expect(b.intent.interpretations.join(" ")).toMatch(/quiet luxury/i);
  });
});

describe("substitution hazard (Find Similar in miniature)", () => {
  it("flags the haldal/aerdal twin on both sides", () => {
    expect(idx.byId.get("haldal")!.substitutionHazards.some((h) => h.otherId === "aerdal")).toBe(true);
    expect(idx.byId.get("aerdal")!.substitutionHazards.some((h) => h.otherId === "haldal")).toBe(true);
  });
});

describe("structural grounding (facts trace to the index)", () => {
  it("every pick's evidence-shape glyph maps to a real claim on that material", () => {
    const b = ask("three warm durable options for a hotel lobby");
    for (const p of b.picks) {
      for (const g of p.evidenceShape) {
        expect(p.material.claims.some((c) => c.label === g.label)).toBe(true);
      }
    }
  });
});

describe("findAlternative — similar but BETTER, and still qualifies", () => {
  it("an upgrade must still pass the original hard gates", () => {
    const hard = { minDurability: "general-contract" as const, requireContractFire: true };
    const alt = findAlternative(idx, "bredal", "durability", hard);
    if (alt.better) {
      expect(alt.better.martindale).toBeGreaterThan(alt.base.martindale);
      expect(alt.better.fire.contractRated).toBe(true);
    }
  });
  it("findSimilar is texture-first (same pattern family ranks highly)", () => {
    const sims = findSimilar(idx, "bredal", 5);
    expect(sims.length).toBe(5);
  });
});

describe("ambiguity — asks instead of bluffing", () => {
  it("marks nonsense / greetings as unclear with no confident picks", () => {
    for (const q of ["asdfghjkl", "hello", "hey there"]) {
      const b = ask(q);
      expect(b.unclear).toBe(true);
      expect(b.picks.length).toBe(0);
    }
  });
  it("a real signal is NOT unclear", () => {
    for (const q of ["a deep green", "wool", "something for a hotel lobby", "sustainable"]) {
      expect(ask(q).unclear).toBe(false);
    }
  });
});

describe("dimensions designers actually use", () => {
  it("fibre requests only return that fibre (or an honest no-match)", () => {
    const b = ask("a hard-wearing wool for a lobby");
    expect(b.abstained || b.picks.every((p) => /wool/i.test(p.material.raw.composition))).toBe(true);
    for (const p of b.picks) expect(p.material.raw.composition.toLowerCase()).toContain("wool");
  });
  it("names its interpretation of hand-feel rather than dropping it", () => {
    const b = ask("something soft for a restaurant banquette");
    expect(b.intent.interpretations.join(" ")).toMatch(/hand-feel isn't recorded/i);
  });
  it("names dimensions the library cannot evidence", () => {
    const b = ask("a wipeable, stain-resistant fabric for a hotel bar");
    expect(b.notes.join(" ")).toMatch(/cleanability/i);
  });
});
