# Design context

Persistent aesthetic decisions. Every UI choice inherits these so the build works to intent, not guesswork.

## Character

Warm, considered, lived-in editorial — a studio's working archive of textiles it knows first-hand, not a cold luxury catalogue. The reference is the *swatch on the studio table*, not a museum wall. Calm and quiet by default; the material supplies the warmth and the colour.

## Typography (two families, by role)

- **Display — Gilda Display** (refined high-contrast serif). Used *only* at decision-weight moments: the wordmark, a pick's name, the recommendation read, the abstention headline. The serif is a signal that "this is a considered statement," never decoration. Never in body or UI chrome.
- **Everything else — Inter.** UI, body (−0.011em tracking), labels, and spec values with `tabular-nums`. No third (mono) face — restraint over a "lab" affectation.
- Hierarchy comes from size / weight / colour, not more fonts.

## Colour — a scarce, semantic system

- **Ground:** a *visibly warm* paper neutral (`--paper #faf7f1`), never a dead grey. Recessed surfaces slightly darker (`--paper-2`), lifted/raised surfaces lighter (`--raised`).
- **Ink:** `#1f1c17` primary, with `--ink-2` / `--ink-3` for secondary/tertiary.
- **The swatches are the only saturated colour on the page.** Each swatch card is born from its own dominant colour (the image fades in over its hex, so no grey flash).
- **Caution is tiered and rare.** `--oxblood #6d2230` = *real harm only* (a hard-gate violation, a substitution hazard). `--amber #936414` = soft signals (label-vs-swatch conflict, thin evidence). A clean happy-path query trips no oxblood, so when it appears the eye snaps to it.

## Space, surface, motion

- **Radius has meaning:** `0` for data/spec rows (precise), `--r-control 7px` for inputs/controls, `--r-card 4px` for the swatch mount. Not "varied" — assigned.
- **Hairlines** are warm (`--hair`), 1px, used to structure rather than decorate.
- **Depth encodes state**, not theme: raised cards lift, excluded items recede.
- **Motion is restrained.** One calm entrance on results (`rise`, ~360ms, ease-out, 8px travel, small per-card stagger). No `transition-all`, no glow, no spinner ceremony. The query input never animates. `prefers-reduced-motion` is honoured. Custom ease: `cubic-bezier(0.23, 1, 0.32, 1)`.

## Progressive disclosure (don't overload)

- **Tier 1 (calm default):** the query, a one-line read, ~3 swatch cards — each showing *only the one spec that earned it*, the evidence-shape glyphs, and the trade-off.
- **Tier 2 (on tap):** "See the evidence" opens the full claim table (every value + provenance) and the colourway row.
- **Tier 3 (deliberate):** excluded-with-reasons, and (in the agent layer) compare / swatch inspection.
- The default screen shows few things, beautifully. Depth is always one interaction away, never all at once.

## Memorable element

The **evidence-shape glyph row** — interrogable confidence (tested / spec / inferred / missing / conflicted) instead of a fake percentage — paired with swatch-as-only-colour. Together they say *evidence-first* at a glance.

## Anti-patterns (do not)

Purple/AI gradients · `transition-all` · spinner-as-loading-state · confidence percentages · 3D fabric drape or parallax (a lie about the material) · skeuomorphic "mounted swatch" shadows · index numbering (`001/147`) cosplay · Gilda Display at small sizes · oxblood used decoratively · a mascot or chat persona.
