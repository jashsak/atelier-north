# AI-usage note

## What I used it for

- **Reading the data fast.** Finding the patterns that shaped the product: two materials that look identical but aren't, colour labels that don't match the photos, and real gaps (no velvet, no bouclé, only 6 indoor/outdoor items, 27 with no certifications).
- **The mechanical work.** Setting up the monorepo, the colour math, the fire-rating parser, the React components, the test scaffolding.
- **Stress-testing the plan before building.** I had it critique the design from a few angles — a design lead, a search engineer, "would this survive a live demo" — before writing any code.

## Where it steered me wrong

Its first instinct was to over-build: vector search over 147 rows, a second AI pass to fact-check the first one's writing, a fuzzy "similar materials" graph, and colour extracted from pixels and treated as ground truth. All four sound reasonable, and together they're more than a three-hour project needs — some are even worse than the simple version. A vector index adds complexity with no real benefit at this size. A second model checking the first model's writing gives false confidence, not a real guarantee. Pixel colour isn't more "true" than the label — it's just a different guess, this time thrown off by shadows and lighting.

Later it swung the other way and tried to reduce the LLM to a template with no real judgement — which throws away the part where it actually reads a vague brief and decides what to check.

The same pattern showed up again, smaller, wiring up the model itself. The first model I tried was deprecated and returned errors. The faster replacement made up a fact — a material name that doesn't exist in the data — so I dropped it. The next one silently returned nothing at all; it turned out to be a "thinking" model spending its whole budget reasoning instead of answering, fixed with one config flag. None of this showed up by reading code — only by running it and noticing the output was wrong, then empty.

## What I decided myself

I cut all of it and picked one rule instead: the engine decides every fact, and the LLM only writes about what the engine already found. That one decision removes the need for a fact-checking pass (the model can't state a fact on its own), removes the need for vector search (a simple score is enough at this size), and means the demo can't be embarrassed by the model, because nothing it says can change what's actually recommended. I also decided that comparing the label to the photo should only ever flag a disagreement, not declare a winner, and that image inspection should only ever run on a couple of finalists, not on all 147 items.

The same habit applied to writing these docs. An earlier draft claimed the tests run "in CI" — plausible, and wrong: this repo has no CI set up, only a test command you run yourself. Same lesson, smaller scale: check what's actually true before it goes in the doc, not just when the story is about a hallucinated fact.

*Time: about a focused day. The engine and these four documents are the honest three-hour core; the web app and the LLM layer are the "going further" part.*
