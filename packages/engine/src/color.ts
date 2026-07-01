// Colour utilities. The corpus `color_family` labels are unreliable (e.g. aerdal's
// "Olive" is hex #8e7041, a brown), so colour reasoning works from the hex, and we
// classify a family from the pixels to *surface* the label-vs-hex conflict.

export interface RGB { r: number; g: number; b: number }
export interface HSL { h: number; s: number; l: number }
export interface LAB { L: number; a: number; b: number }

export function hexToRgb(hex: string): RGB {
  const h = hex.replace("#", "").trim();
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return {
    r: parseInt(n.slice(0, 2), 16),
    g: parseInt(n.slice(2, 4), 16),
    b: parseInt(n.slice(4, 6), 16),
  };
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s, l };
}

function srgbToLinear(c: number): number {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function rgbToLab({ r, g, b }: RGB): LAB {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  // sRGB D65 -> XYZ
  let x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  let y = (R * 0.2126 + G * 0.7152 + B * 0.0722) / 1.0;
  let z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  x = f(x); y = f(y); z = f(z);
  return { L: 116 * y - 16, a: 500 * (x - y), b: 200 * (y - z) };
}

export function hexToLab(hex: string): LAB { return rgbToLab(hexToRgb(hex)); }
export function hexToHsl(hex: string): HSL { return rgbToHsl(hexToRgb(hex)); }

/** CIE76 ΔE — perceptual distance. Adequate for ranking; ΔE2000 is the upgrade path. */
export function deltaE(a: LAB, b: LAB): number {
  return Math.sqrt((a.L - b.L) ** 2 + (a.a - b.a) ** 2 + (a.b - b.b) ** 2);
}

/** Coarse colour family classified from the actual pixels (LAB-based, not the label). */
export function familyFromHex(hex: string): string {
  const { L, a, b } = hexToLab(hex);
  const C = Math.hypot(a, b); // chroma
  const hue = (Math.atan2(b, a) * 180) / Math.PI; // LAB hue angle (deg)
  // neutrals first — low chroma is grey/cream/stone, never a saturated hue
  if (C < 9) {
    if (L < 20) return "black";
    if (L < 45) return "charcoal";
    if (L < 68) return "grey";
    if (L < 85) return "stone";
    return "off-white";
  }
  // low-chroma warm neutrals (the beige/taupe/brown zone where labels drift)
  if (C < 20 && hue >= 40 && hue <= 100) {
    if (L > 82) return "cream";
    if (L > 62) return "beige";
    if (L > 42) return "taupe";
    return "brown";
  }
  if (C < 16) { // low-chroma cool
    if (L > 72) return "off-white";
    if (L < 45) return "charcoal";
    return "grey";
  }
  // chromatic — by LAB hue angle
  if (hue < 25 || hue >= 345) return L < 35 ? "maroon" : "red";
  if (hue < 55) return L < 38 ? "brown" : C < 35 ? "camel" : "terracotta";
  if (hue < 95) return L < 45 ? "olive" : C < 38 ? "khaki" : "ochre";
  if (hue < 165) return L < 38 ? "forest" : "green";
  if (hue < 200) return "teal";
  if (hue < 270) return L < 42 ? "navy" : "blue";
  if (hue < 330) return "violet";
  return "plum";
}

/** The label's prototypical colour, for ΔE-based label-vs-swatch conflict checks. */
export function anchorForFamily(family: string): string | null {
  const f = family.toLowerCase().trim();
  if (COLOR_ANCHORS[f]) return COLOR_ANCHORS[f]!;
  const extra: Record<string, string> = {
    beige: "#d8c8ad", maroon: "#5a1f24", khaki: "#9a8f5c", sand: "#cdbb96",
  };
  return extra[f] ?? null;
}

/** Named anchor colours for descriptive queries ("deep green", "oxblood"...). */
export const COLOR_ANCHORS: Record<string, string> = {
  "deep green": "#21503a", "forest": "#13452f", "emerald": "#0f7a52", "olive": "#5b5a2a",
  green: "#2f7d3a", sage: "#9aa88c",
  "deep blue": "#1b2a4a", navy: "#1b2440", blue: "#2f5fa8", teal: "#1f6b66",
  oxblood: "#5e2129", burgundy: "#5c1f27", red: "#a32a2a", terracotta: "#b5623f",
  ochre: "#b5882f", mustard: "#c8932a", camel: "#b08a5a", taupe: "#9c8a76", tan: "#b29a7d",
  charcoal: "#2c2f33", grey: "#8b877e", gray: "#8b877e", stone: "#b8ad9c", cream: "#efe6d4",
  ivory: "#f3ecda", white: "#f5f1e8", black: "#1a1c1e", chocolate: "#3a2a22", espresso: "#3a2723",
  rust: "#9c4a2a", plum: "#5a2f4a", mauve: "#9a7d8a", blush: "#d8b3a6", pink: "#d98da0",
};

/** Resolve a free-text colour phrase to an anchor hex, if recognised. */
export function resolveColorPhrase(text: string): { phrase: string; hex: string } | null {
  const t = text.toLowerCase();
  // prefer the longest matching anchor ("deep green" before "green")
  const keys = Object.keys(COLOR_ANCHORS).sort((a, b) => b.length - a.length);
  // word-boundary match so "tan" doesn't fire inside "stain", "teal" inside "steal", etc.
  for (const k of keys) {
    const rx = new RegExp(`\\b${k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (rx.test(t)) return { phrase: k, hex: COLOR_ANCHORS[k]! };
  }
  return null;
}
