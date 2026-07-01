import type { ViewBrief } from "./view.js";

// Templated "read" — the deterministic prose floor (works with no API key).
// The LLM agent replaces this with richer narration, but never changes the facts.
export function synthRead(b: ViewBrief): string {
  if (b.abstained) return b.abstainReason ?? "Nothing in the library meets this.";
  if (!b.picks.length) return "No clear match.";
  const lead = b.picks[0]!;
  const n = b.picks.length;
  const hasGates = b.chips.some((c) => c.kind === "gate");
  const scope = `${n} option${n > 1 ? "s" : ""} that ${hasGates ? "clear the brief's hard requirements" : "fit the brief"}`;
  let read = `${scope}. I'd lead with ${lead.name} — ${lead.earnedBy}`;
  if (lead.tradeoff) read += `, though ${lead.tradeoff}`;
  read += ".";
  const twin = b.picks.find((p) => p.hazards.length)?.hazards[0];
  if (twin) read += ` Note: ${twin.message}`;
  return read;
}
