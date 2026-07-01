import { generateText, tool } from "ai";
import { z } from "zod";
import {
  loadIndex, parseQuery, searchMaterials, getEvidenceOf, findAlternative,
  type MaterialIndex, type EvidenceBrief,
} from "@me/engine";
import { getModel, llmEnabled, PROVIDER_OPTS, containsUngroundedNumeral } from "./model.js";

const RULES = `Write a 2-3 sentence recommendation as a senior textile specifier.
- Use ONLY tool results. Never invent a material, property, or suitability.
- State NO numbers/measurements in prose (they are shown separately) — refer qualitatively.
- Lead with the pick, name what earned it and the trade-off; mention any substitution hazard.
- Plain, confident, no filler, no emoji.`;

export interface AgentResult { brief: EvidenceBrief; read: string | null }

/**
 * Bounded agent. The deterministic engine has ALREADY produced the grounded result
 * (facts + inclusion are never the model's). The model may call read-only tools to
 * inspect evidence or find a better-and-still-qualifying alternative, then narrate.
 */
export async function runAgent(query: string, idx: MaterialIndex = loadIndex()): Promise<AgentResult> {
  const brief = searchMaterials(idx, parseQuery(query));
  if (!llmEnabled() || brief.unclear) return { brief, read: null };

  const candidates = (brief.abstained ? brief.nearest : brief.picks)
    .map((p, i) => `#${i + 1} id=${p.material.id} ${p.material.name} — ${p.earnedBy}${p.tradeoff ? ` (trade-off: ${p.tradeoff})` : ""}`)
    .join("\n");

  try {
    const { text } = await generateText({
      model: getModel(),
      maxSteps: 5,
      temperature: 0.3,
      maxTokens: 800,
      providerOptions: PROVIDER_OPTS,
      abortSignal: AbortSignal.timeout(20_000),
      system: `${RULES}\n\nThe candidates below are already retrieved, gated for safety, and grounded.`,
      prompt: `Query: "${query}"\n${brief.abstained ? `The library cannot satisfy this: ${brief.abstainReason}\n` : ""}Candidates:\n${candidates}\n\nInspect evidence or look for a better alternative only if the question needs it, then write the recommendation.`,
      tools: {
        getEvidence: tool({
          description: "Full grounded evidence for a material id (specs, provenance, conflicts, hazards).",
          parameters: z.object({ id: z.string() }),
          execute: async ({ id }) => getEvidenceOf(idx, id) ?? { error: "unknown id" },
        }),
        findAlternative: tool({
          description: "Find a similar textile that is BETTER on an axis and still meets the brief's gates.",
          parameters: z.object({ id: z.string(), axis: z.enum(["durability", "recycled", "price", "lead"]) }),
          execute: async ({ id, axis }) => {
            const alt = findAlternative(idx, id, axis, brief.intent.hard);
            return alt.better
              ? { better: alt.better.name, delta: alt.delta, tradeoff: alt.tradeoff }
              : { better: null, note: alt.note };
          },
        }),
      },
    });
    const out = text.trim();
    if (containsUngroundedNumeral(out)) return { brief, read: null };
    return { brief, read: out || null };
  } catch {
    return { brief, read: null };
  }
}
