import React from "react";

// What a designer scans the read for is the DECISION PHRASE, not a bare noun.
// "abrasion" alone is useless; "high abrasion resistance" / "less abrasion resistance" is
// the point. "lead time" alone is weak; "lead time is longer" is the thing. So we match
// whole phrases — an attribute plus the qualifier words that give it meaning — and the
// words the designer actually asked about. Never material/brand names (those are the cards).

// Degree / polarity / quality words that MODIFY an attribute (only meaningful attached to one).
const QUAL = [
  "contract-grade", "heavy-duty", "hard-wearing", "near-identical", "exceptional", "excellent",
  "superior", "sophisticated", "residential", "recorded", "slightly", "premium", "budget",
  "warmest", "coolest", "warmer", "cooler", "stronger", "highest", "longest", "shorter", "lowest",
  "robust", "subtle", "muted", "lustrous", "matte", "crisp", "fully", "deep", "true", "quiet",
  "general", "severe", "strong", "solid", "good", "poor", "high", "higher", "low", "lower", "less",
  "more", "most", "no", "without", "lacks", "lacking", "longer", "better", "ideal",
];
// The attributes / qualities that carry a specifying decision.
const ATTR = [
  "colour match", "color match", "lead time", "contract-grade", "residential-grade", "abrasion",
  "durability", "martindale", "certifications", "certification", "certified", "recycled",
  "sustainability", "sustainable", "warmth", "contract", "colour", "color", "sheen", "price",
  "fire", "tones", "tone", "hue", "shade", "luxury", "wear", "hand", "lead", "warm", "cool",
];
// Trailing nouns that complete an attribute phrase.
const TRAIL = ["resistance", "rating", "content", "standards", "band", "match", "class", "time"];
// Comparatives, for the "<attribute> is longer/higher/…" pattern.
const COMP = ["longer", "shorter", "higher", "lower", "warmer", "cooler", "better", "worse", "ideal"];

const STOP = new Set([
  "the", "a", "an", "for", "and", "or", "of", "to", "in", "on", "with", "is", "are", "be", "its", "it",
  "that", "this", "also", "some", "something", "me", "need", "want", "looking", "option", "options",
  "three", "two", "one", "few", "please", "find", "show", "give", "really", "very", "good", "strong",
  "excellent", "nice", "by", "feels", "like", "you", "your", "can", "what", "which",
]);

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const alt = (arr: string[]) => arr.slice().sort((a, b) => b.length - a.length).map(esc).join("|");

function queryTerms(q: string): string[] {
  const words = q.toLowerCase().match(/[a-z][a-z-]{2,}/g) ?? [];
  return [...new Set(words.filter((w) => !STOP.has(w)))];
}

/** Character ranges in `text` that should be emphasised (merged, non-overlapping). */
function emphasisRanges(text: string, query: string): [number, number][] {
  const patterns: RegExp[] = [
    // qualified attribute:  (qual ){0,3} attr ( trail )?   → "high abrasion resistance", "no recorded certifications"
    new RegExp(`\\b(?:(?:${alt(QUAL)})\\s+){0,3}(?:${alt(ATTR)})(?:\\s+(?:${alt(TRAIL)}))?\\b`, "gi"),
    // attribute … is/reads comparative:  "lead time is longer", "abrasion resistance reads lower"
    new RegExp(`\\b(?:${alt(ATTR)})(?:\\s+(?:${alt(TRAIL)}))?(?:\\s+\\w+){0,2}?\\s+(?:is|are|runs|reads)\\s+(?:${alt(QUAL)}\\s+)?(?:${alt(COMP)})\\b`, "gi"),
  ];
  const qt = queryTerms(query);
  if (qt.length) patterns.push(new RegExp(`\\b(?:${alt(qt)})\\b`, "gi")); // echo what they asked about

  const ranges: [number, number][] = [];
  for (const rx of patterns) for (const m of text.matchAll(rx)) if (m[0].trim()) ranges.push([m.index!, m.index! + m[0].length]);
  ranges.sort((a, b) => a[0] - b[0]);

  const merged: [number, number][] = [];
  for (const [s, e] of ranges) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  return merged;
}

/** Renders the read with filler dimmed and the decision phrases at full ink. */
export function EmphasizedRead({ text, query }: { text: string; query: string }) {
  const ranges = emphasisRanges(text, query);
  const nodes: React.ReactNode[] = [];
  let i = 0;
  for (const [s, e] of ranges) {
    if (s > i) nodes.push(<span key={i} style={{ color: "var(--read-dim)" }}>{text.slice(i, s)}</span>);
    nodes.push(<span key={s} style={{ color: "var(--ink)" }}>{text.slice(s, e)}</span>);
    i = e;
  }
  if (i < text.length) nodes.push(<span key={i} style={{ color: "var(--read-dim)" }}>{text.slice(i)}</span>);
  return <>{nodes}</>;
}
