import type { EvidenceBrief, Pick } from "./search.js";
import { hexToRgb } from "./color.js";

// ── tiny ANSI helpers (truecolor swatch chips so the terminal shows the material) ──
const esc = (s: string) => `\x1b[${s}m`;
const reset = esc("0");
const bold = (s: string) => esc("1") + s + reset;
const dim = (s: string) => esc("2") + s + reset;
const italic = (s: string) => esc("3") + s + reset;
function chip(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return esc(`48;2;${r};${g};${b}`) + "   " + reset; // 3-space colour block
}
const GLYPH_DIM = new Set(["✕", "◌"]);

function renderPick(p: Pick, i: number): string {
  const m = p.material;
  const lines: string[] = [];
  lines.push(`  ${bold(`${i + 1}. ${m.name}`)} ${dim(`· ${m.brand}`)}  ${chip(p.bestColorway.hex)} ${dim(p.bestColorway.name)}`);
  lines.push(`     ${esc("32") + "✓" + reset} ${p.earnedBy}`);
  const shape = p.evidenceShape.map((g) => (GLYPH_DIM.has(g.symbol) ? dim(`${g.symbol} ${g.label}`) : `${g.symbol} ${g.label}`)).join("   ");
  lines.push(`     ${dim("evidence:")} ${shape}`);
  if (p.tradeoff) lines.push(`     ${italic(dim("trade-off: " + p.tradeoff))}`);
  for (const h of p.hazards) lines.push(`     ${esc("31") + "⚠ " + reset}${dim(h.message)}`);
  for (const c of p.conflicts) lines.push(`     ${esc("33") + "⚠ " + reset}${dim(c.message)}`);
  return lines.join("\n");
}

export function formatBrief(b: EvidenceBrief): string {
  const out: string[] = [];
  out.push("");
  out.push(bold(`“${b.query}”`));
  out.push(dim(`${b.coverage.eligible} of ${b.coverage.total} textiles meet these constraints` + (b.coverage.binding ? ` · binding constraint: ${b.coverage.binding}` : "")));
  // constraints (chips)
  if (b.intent.chips.length) {
    out.push("");
    for (const c of b.intent.chips) {
      const tag = c.kind === "gate" ? esc("31") + "gate" + reset : dim("pref");
      out.push(`  ${tag}  ${c.label} ${dim(`— ${c.detail} (${c.why})`)}`);
    }
  }
  out.push("");

  if (b.unclear) {
    out.push(bold("I'm not sure what you're specifying yet.") );
    out.push(dim("  Tell me the piece, the space, or the look — e.g. \"warm durable seating for a hotel lobby\" or \"a deep green wool\"."));
    if (b.notes.length) { out.push(""); for (const n of b.notes) out.push(dim("  · " + n)); }
    out.push("");
    return out.join("\n");
  }

  if (b.abstained) {
    out.push(bold(esc("33") + "Honest answer: " + reset) + b.abstainReason);
    if (b.nearest.length) {
      out.push(dim("  Closest in hand and colour:"));
      b.nearest.forEach((p, i) => out.push(renderPick(p, i)));
    }
  } else {
    b.picks.forEach((p, i) => { out.push(renderPick(p, i)); out.push(""); });
  }

  if (b.excludedSample.length && !b.abstained) {
    out.push(dim("  Excluded (with reason):"));
    for (const e of b.excludedSample.slice(0, 3)) out.push(dim(`    – ${e.name}: ${e.reason}`));
  }
  if (b.notes.length) {
    out.push("");
    for (const n of b.notes) out.push(dim("  · " + n));
  }
  out.push("");
  return out.join("\n");
}
