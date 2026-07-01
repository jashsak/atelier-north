# Architecture memo

## The shape of the thing

A deterministic **engine** owns every decision and every number; an optional **LLM agent** sits on top and only narrates. This single choice drives everything else.

The engine (`packages/engine`, pure TypeScript, unit-tested) loads the 147 records and derives an index: durability tier from the schema's Martindale thresholds (25k / 40k / 100k), a fire-hazard class parsed from the free-text rating string, recycled %, a relative price band, lead time, per-colourway colour in LAB, and — per material — a small, explicit **claim vocabulary** (the exact properties anything is allowed to assert about it). Retrieval is filter-then-rank: hard **gates** (use-case → required durability + fire + indoor/outdoor) reduce the set; a transparent weighted score ranks the survivors. The agent receives the structured result and writes prose — it cannot put a number on screen that the engine didn't compute.

## The decisions that mattered

**No embeddings / vector DB.** 147 rows fit in a prompt. A vector index here would add opacity and latency for no recall gain; gates plus a legible weighted score are more defensible *and* more in the spirit of "the value is the enriched data, not the model." (Embeddings would start to matter around ~10k items.)

**The LLM is the intelligence, but out of the decision loop.** The model interprets a vague brief, decides when to dig for evidence, and narrates trade-offs — that's real intelligence. But ranking, gating, abstention, and the confidence read are deterministic. So the system is trustworthy *and* the demo never depends on the model being fast or correct: with no API key it runs on a rule-based parser and templated prose; with a key the same engine output is re-narrated. **One engine, two narrations** — toggling the model changes the wording, never the facts.

**Safety is path-independent.** Abstention and the evidence-shape are computed by the engine on *every* query. The agent may route a simple query through one hop and a hard one through a short tool loop, but routing only changes narration effort — it can never skip a safety check. An under-spec textile cannot appear as an unqualified pick for a stated use; that's a unit test, not a hope.

**Colour trusts the swatch, not the label.** The `color_family` labels are studio-derived and drift from the pixels (a colourway labelled "olive" whose hex reads grey). So colour matching uses the hex (LAB ΔE), and a calibrated check (~3% of 496 colourways, not a third) **surfaces** the label-vs-swatch disagreement rather than silently picking a side.

## Behaviour when the evidence is thin, missing, or inconsistent

This is the centre, not an edge case.

- **Absent kinds → honest abstention.** The library genuinely has no velvets or bouclés, so "a deep green velvet" returns *"Atelier North's library holds no velvets,"* plus the closest in hand and colour, flagged "verify before specifying." No confident fake.
- **Thin coverage → qualified match.** Poolside surfaces the 6 indoor/outdoor textiles *and* states that no wet/UV/chlorine spec is recorded — confirm with the maker.
- **Missing fields → lower, explained confidence.** 27 records have no certifications, so "most sustainable" reasons over recycled content + composition and says what would raise confidence. Each pick shows an **evidence-shape** glyph row (tested / spec / inferred / missing / conflicted) instead of a false percentage.
- **Conflicting voices → surfaced, not resolved.** The studio colour label vs the swatch is shown as a conflict, each side sourced.
- **Confusable twins → a warning.** Haldal (100k, contract) and Aerdal (28k, residential) are near-identical; the engine links them from the data's own `related` field plus a spec gap and warns before you spec the wrong one for a lobby.
- **What the library can't evidence at all** (cleaning codes, roll width, jurisdiction-specific fire compliance) is named as absent rather than invented.

## The trade-off against the clock

The honest ~3-hour core is the **engine + the four documents** — that alone answers the brief (a defensible, abstaining recommender, runnable headless). I went further because the reviewer judges with a designer's eye and the swatch images were too good to leave on the table: a swatch-forward web surface and a grounded agent layer. To protect the clock I **deliberately deferred**: visual/CLIP embeddings for true texture similarity (the engine uses cheap structured texture proxies + the `related` graph instead), Claude-vision swatch inspection (designed as a lazy, finalists-only tool — see the agent package), an LLM-as-judge eval harness, per-project boards/export, and mobile-perfect polish. Each is named here so the cut is a decision, not an omission.

## What's guaranteed, and what isn't

Guaranteed: every number shown is the engine's, traceable to a record; gates hold; abstention fires deterministically; the same facts appear with or without the LLM. **Not** guaranteed: the model's *judgement* — it can still choose a defensible-but-arguable lead pick or phrase a trade-off awkwardly. That's exactly why suitability lives in the engine and the model is confined to language. The grounding is a numeric-and-claim-vocabulary guarantee, not a truth oracle — and the product is honest about that distinction, because pretending otherwise is the failure mode the brief warns against.
