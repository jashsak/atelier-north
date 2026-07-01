# AI-usage note

## What I used AI for

- **Reading the corpus fast.** Profiling all 147 records to find the structure that matters — the confusable twins (Haldal/Aerdal), the colour labels that disagree with their hex, the genuine gaps (no velvets, no bouclés, only 6 indoor/outdoor, 27 with no certs). The product is built around those findings.
- **Scaffolding and the mechanical layers.** The monorepo wiring, the colour maths (sRGB→LAB, ΔE), the fire-rating string parser, the React components, and the test fixtures.
- **A pressure-test loop.** I ran several adversarial critiques of the design before building — a "staff designer" lens, a "senior retrieval engineer" lens, and a "would this survive a live demo" lens. Most of the sharpest cuts below came out of that.

## One place it steered me wrong

AI's first instinct was to **over-build**: it proposed embeddings/vector retrieval over the 147 rows, a post-hoc "groundedness validator" that re-checks the model's prose, a broad fuzzy "cousin graph", and k-means colour extraction sold as ground truth. Each sounds rigorous; together they're a research project, not a three-hour take-home — and several are actively worse than the simpler thing. Embeddings add opacity at this scale; a prose-validator half-works and advertises a guarantee it can't keep; "colour truth from pixels" just swaps one unreliable signal (the label) for another (a shadow-contaminated average).

It also, on a later swing, *over-corrected* — it tried to minimise the LLM down to a templated garnish, which throws away the genuine intelligence (interpreting a vague brief, deciding when to fetch evidence, naming trade-offs).

The same instinct showed up again, in miniature, wiring the model itself. `gemini-2.0-flash` is deprecated and 404s, so the reflex fix was `gemini-2.5-flash-lite` for speed — it hallucinated a fact (a residential "twin" name that doesn't exist in the data), so I rejected it rather than accept a faster-but-wrong model. `gemini-2.5-flash` was next, and it silently returned empty text: it's a thinking model, and by default it spends its whole budget reasoning before it ever writes the answer. Fixed by setting `thinkingConfig.thinkingBudget: 0`. None of this was visible from a diff — it only surfaced by running the model and noticing the output was wrong, then empty. That's the actual test: not whether the agent can pick a model, but whether you check what it picked against real behaviour before you trust it.

## One decision I made myself

I cut all of it — the embeddings, the validator, the "cousin graph," the k-means "truth" — and settled the architecture on a principle AI did not volunteer: **a deterministic engine owns every decision and number; the LLM is the intelligence layer but sits out of the decision loop, narrating grounded results.** From that one decision the hard problems dissolve — no validator (the model can't emit facts in the first place), no embeddings (gates + a legible score), and a demo that can't be embarrassed because the facts never depend on the model. I also made the calls that the *image colour* is a label-vs-swatch **conflict detector**, not "truth", and that Claude-vision belongs only as a lazy, finalists-only inspection tool — not in the ranking hot path.

The same check applied to these documents, not just the code. A draft of the product-and-eval note claimed the grounding tests run "in CI today" — plausible, and wrong: there's no CI pipeline in this repo, only a test suite you run by hand. A reviewer could have disproved that in ten seconds with `ls .github/workflows`. Caught and corrected to say what's actually true — the checks are real, but they run on demand, not on every push. It's the smallest instance of the same failure mode: AI states a capability with confidence; the discipline is checking it against the actual repo before it ships, not just when it's a hallucinated textile.

The throughline: AI is excellent at producing *more*. The judgement was in choosing *less*, checking what it claims against what's actually true, and deciding where the model is allowed to speak.

*Time: ~a focused day. The engine + these documents are the ~3-hour core; the web surface and agent layer are the deliberate "going further".*
