# Architecture memo

## How it's built

A deterministic engine makes every decision and computes every number. An optional LLM sits on top and only writes the prose. That split is the core design choice — everything else follows from it.

The engine (`packages/engine`) loads the 147 records and works out, for each one: a durability tier (from the Martindale thresholds — 25k / 40k / 100k), a fire class (parsed from the free-text rating), recycled %, price band, lead time, and colour in LAB space. It also builds a list of exactly which properties the LLM is allowed to state about each material.

Search works in two steps: hard gates first (use-case → required durability, fire rating, indoor/outdoor), then a plain weighted score ranks what's left. The LLM only sees this finished result and writes a sentence about it — it can never put a number on screen that the engine didn't compute.

## The decisions that mattered

- **No embeddings.** 147 rows fit in a prompt. Gates plus a simple score are easier to explain and just as good at this size — embeddings would start to earn their cost around 10,000+ items.
- **The LLM writes, it doesn't decide.** It reads a vague brief, decides when to look something up, and explains a trade-off — that's real work. But ranking, gating, and abstaining are all fixed logic. With no API key the app still runs fully, using a plain rule-based parser and templated sentences instead of LLM prose. Same facts either way — only the wording changes.
- **Safety checks always run.** The engine checks abstention and evidence quality on every query, no matter how it was asked. The LLM can only affect how much gets written, never whether a bad match slips through.
- **Colour trusts the photo, not the label.** The `color_family` field is written by the studio, and it's sometimes wrong — a colour recorded as "olive" that's actually grey. Colour matching uses the actual hex value, and the app flags cases where the label and the swatch disagree instead of picking one silently.

## How it behaves when the data is thin, missing, or contradicts itself

This is the part of the brief I focused on most.

- **Something doesn't exist** → say so. "A deep green velvet" gets "Atelier North doesn't carry velvet," plus the closest options in hand and colour.
- **Coverage is thin** → say what's missing. A poolside request returns the six indoor/outdoor fabrics and notes that wet/UV/chlorine resistance isn't recorded — check with the manufacturer.
- **A field is missing** → lower confidence, explained. 27 records have no certifications, so a "most sustainable" answer leans on recycled % and composition and says what's missing. Every pick shows a small row of tags (tested / on spec / inferred / missing / conflicting) instead of a made-up confidence score.
- **Two sources disagree** → show both. If the studio's colour label and the swatch photo disagree, both are shown, each labelled with its source.
- **Two materials look like the same thing but aren't** → warn. Haldal (100k Martindale, contract-grade) and Aerdal (28k, residential) look near-identical; the app catches this from the data's own `related` field and warns before you spec the wrong one.
- **Some things just aren't recorded at all** (cleaning codes, roll width, local fire codes) → say that plainly instead of guessing.

## The trade-off I made against the clock

The three-hour core is the engine plus these four documents — on its own that already answers the brief: a recommender that gives real reasons and knows when to say no. I spent more time than that because the reviewer cares about design and the swatch photos deserved a proper interface, so I also built the web app and the LLM layer.

To stay on budget I skipped: real visual similarity from the swatch images (using simpler structured proxies instead), an eval harness scored by a second LLM, saved boards/export, and full mobile polish. With more time, in that order, those are what I'd build next.

## What's actually guaranteed

Every number on screen comes from the engine and traces back to a record. Gates and abstention work the same way with or without the LLM. What's not guaranteed is the LLM's judgement — it might pick a defensible-but-debatable option, or phrase something a little awkwardly. That's exactly why the engine, not the model, decides what's suitable: the model is only ever describing an answer someone else already checked.
