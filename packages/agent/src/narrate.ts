import { generateText } from "ai";
import type { EvidenceBrief } from "@me/engine";
import { getModel, llmEnabled, PROVIDER_OPTS, containsUngroundedNumeral } from "./model.js";

export { llmEnabled };

/** A compact, factual brief for the model — only what the engine already decided. */
function factsFor(b: EvidenceBrief): string {
  if (b.abstained) {
    const near = b.nearest.map((p) => `${p.material.name} (${p.bestColorway.name})`).join(", ");
    return `The library cannot satisfy the request. Reason: ${b.abstainReason}. Closest in hand/colour: ${near || "none"}.`;
  }
  const picks = b.picks.map((p, i) => {
    const parts = [
      `#${i + 1} ${p.material.name} by ${p.material.brand}`,
      `earned by: ${p.earnedBy}`,
      p.tradeoff ? `trade-off: ${p.tradeoff}` : "",
      p.hazards[0] ? `hazard: ${p.hazards[0].message}` : "",
    ].filter(Boolean);
    return parts.join("; ");
  }).join("\n");
  const gates = b.intent.chips.filter((c) => c.kind === "gate").map((c) => c.label).join(", ");
  const anyHazard = b.picks.some((p) => p.hazards.length);
  const hazardLine = anyHazard ? "" : "\nNo substitution hazard applies to these picks — do NOT mention twins, lookalikes, or fibre changes.";
  return `User asked: "${b.query}".\nInferred gates: ${gates || "none"}.\nEligible: ${b.coverage.eligible} of ${b.coverage.total}.\nPicks:\n${picks}${hazardLine}`;
}

const SYSTEM = `You are a senior textile specifier writing a 2-3 sentence recommendation for a colleague.
Rules, strictly:
- Use ONLY the facts provided. Never invent a material, a property, or a use it isn't given.
- Do NOT state any numbers, measurements, or spec values (no Martindale figures, no percentages, no weeks). Those are shown separately. Refer to them qualitatively ("contract-grade", "warm", "long lead", "fully recycled").
- LEAD with the single top pick and why it wins; mention the runners-up only briefly. Name the top pick's trade-off once — never repeat the same trade-off for each option.
- If (and ONLY if) a substitution hazard is listed in the facts, surface it plainly — it's the most important thing to say. Never invent a hazard, a twin, a fibre change, a brand event, or any fact not given.
- Plain, confident, no hedging filler, no exclamation marks, no emoji. Sound like a trusted human expert.`;

/** Returns LLM prose, or null to fall back to the deterministic templated read. */
export async function narrate(b: EvidenceBrief): Promise<string | null> {
  if (!llmEnabled()) return null;
  if (b.unclear) return null; // don't narrate a bluff — the UI asks for clarification
  try {
    const { text } = await generateText({
      model: getModel(),
      system: SYSTEM,
      prompt: factsFor(b),
      temperature: 0.3,
      maxTokens: 400,
      providerOptions: PROVIDER_OPTS,
      abortSignal: AbortSignal.timeout(12_000),
    });
    const out = text.trim();
    if (containsUngroundedNumeral(out)) return null;
    return out || null;
  } catch {
    return null; // any failure → deterministic read; the demo never depends on this
  }
}
