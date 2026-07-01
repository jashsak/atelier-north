# Product & evaluation note

## Who it's for

A senior interior designer / FF&E specifier choosing upholstery for real projects. Their unmet need isn't search — it's a *trustworthy second opinion*. Their rep is biased to one line; a sampling warehouse has breadth but no judgement and will happily let them spec something that won't pass code or won't arrive in time. What they lack is "an unbiased senior colleague who never forgets a fire rating and tells me the truth." They navigate in use-cases ("hotel lobby", "poolside") and *defend* in numbers (Martindale, BS 7176) — so the tool leads with plain-language outcomes and keeps the spec as the receipt underneath.

## What makes it a considered tool, not a generic chatbot

1. **It shows its reasoning and lets you correct it.** A query becomes visible, labelled **gates vs preferences** ("Heavy-duty seating — inferred from 'lobby'"). The machine's assumptions are on the table, not hidden in a prompt.
2. **Every claim is grounded.** Numbers come from the record, not the model; tap any spec to see its source (manufacturer cut-sheet vs studio record).
3. **It quantifies its own doubt.** An evidence-shape row — *tested / spec / inferred / missing / conflicted* — instead of a false "92% confident." You can see *what* the recommendation rests on.
4. **It refuses well.** "No velvets" returns the closest in hand, not a hallucinated match. The honesty is the feature.
5. **It knows the data's traps.** Confusable twins, label-vs-swatch colour conflicts, and the fields the library simply can't evidence are all surfaced.

The interface embodies this: swatch-forward (the material is the decision), calm by default with evidence one tap away (progressive disclosure), and a scarce colour system where oxblood means "real harm" and nothing else — so a clean session feels clean and a warning lands.

## Where it can be wrong or harmful — and what the UX does

- **Speccing an under-rated textile into a high-traffic job** (the central harm). Mitigation: hard durability/fire gates per use-case; under-spec items are surfaced as *excluded, with the reason*; the twin warning fires on near-identical lookalikes.
- **Presenting a contested value as fact.** Mitigation: per-field provenance; the studio-label-vs-swatch conflict is shown, not silently resolved.
- **False precision.** Mitigation: price is always a *relative band, no currency*; no invented performance numbers; confidence is shown as evidence shape, not a percentage.
- **Over-trust in the LLM's prose.** Mitigation: the model never emits facts and may only assert each material's allowed claims; suitability is the engine's, not the model's. The memo is explicit that grounding is numeric, not a truth oracle.
- **A defensible-but-arguable lead pick.** Mitigation: the reasoning and trade-off are always shown, and the excluded set is inspectable, so the designer stays in control.

## How I'd measure whether it's any good

Layered, because a single score hides which layer broke.

- **Retrieval** — a golden set of ~40 designer queries (the four examples + intent slices: durability / sustainability / colour / use-fit) with expected materials. Track recall@k and whether the right item is in the top few.
- **Grounding** — automated: every number rendered must exist in the record (zero untraceable facts); the agent's prose must contain no spec numerals (those belong to the engine). This is asserted by the committed test suite today (`pnpm test`); there's no CI pipeline wired up yet, so it runs on demand rather than on every push.
- **Safety invariant** — a sofa/lobby query never returns sub-threshold as an unqualified pick. Unit-tested today.
- **Abstention calibration** — 25–30% of the eval set is negative/absent (velvet, bouclé, impossible constraint combos). Over-refusing is a UX problem; under-refusing is a safety problem. Measure both rates.
- **Helpfulness & routing** — LLM-as-judge against a written rubric (does the read name the spec that earned the pick and the real trade-off? did it route a judgement query through evidence rather than guessing?), calibrated monthly against a handful of human labels; a stronger judge than the model under test.

**What's actually built:** a committed fixture of behaviour tests (`pnpm test`) asserting the gates, the abstention on velvet, the poolside qualification, the twin flag, and that every rendered fact traces to the index. I'd scale it to the ~40-query judge-scored harness above with more time; I kept it small and deterministic to protect the clock and to prove the point without hand-waving.
