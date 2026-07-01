# Take-Home Exercise: Material Evidence Assistant

Thanks for taking the time. This is scoped to about 3 hours; please don't pour a weekend into it. We're a senior team hiring a senior engineer, so the instructions are deliberately light. We want to see the problem you choose to solve and the judgement you bring, not your ability to follow a spec. A small, sharp build with a short write-up is the goal.

Use any LLM APIs, libraries, frameworks, and AI coding assistants you like. We can provide an API key. If a direction grabs you there's room to go further (see the end), but it's optional.

## The scenario

You're building an AI assistant for a fictional interior design studio, **Atelier North**. The studio keeps a private library of **upholstery textiles** it has specified or sampled: 147 designs, each available in several colourways, with real swatch images.

A designer should be able to ask the library questions in plain language and get useful, trustworthy help finding and comparing materials. For example:

> "I'm doing a warm, sustainable scheme for a hotel lounge. What hard-wearing upholstery would you suggest, and why?"

Build something that helps a designer here. Working out what "helps" means, and where an assistant like this should be careful, is part of the exercise.

## What you're given

In `data/`:

| Path | What it is |
|---|---|
| `materials.json` | 147 textile designs. Each has a name, brand, composition, pattern, weight, a short description, a set of attributes (fire rating, abrasion/Martindale, lead time, price tier, recycled content, certifications, intended use, colour temperature), and a list of **colourways**. |
| `images/<design>/` | Swatch images, one per colourway (~500 in total). Each colourway in `materials.json` points to its image. |

A `schema` block at the top of `materials.json` explains the less-obvious fields. The data is shaped like the real thing: some fields are richer than others, some designs are close cousins, and the studio's own notes don't always agree with the manufacturer's. Read a good slice of it before you design anything.

How you use the swatch images is up to you.

## What we'd like back

A small **TypeScript** project. A CLI or minimal API is fine for 3 hours; don't sink time into UI unless you want to. Python is fine for ingestion or experimentation, but the product-facing layer should be meaningfully TypeScript. Please include:

1. **The working prototype**, with a README and easy local setup. It should run from a clean clone.
2. **A short architecture memo** (~600–900 words; bullets are fine). Cover the decisions that mattered, the main trade-off you made against the clock, and what you'd do next with more time. Tell us how the system behaves when the evidence is thin, missing, or inconsistent.
3. **A short product and evaluation note.** Who is the user, and what makes this feel like a considered tool rather than a generic chatbot? Where could it be wrong or harmful, and what should the UX do about that? And how would you measure whether it's any good? Describing the eval approach is enough; you don't need to build a harness.
4. **A short AI-usage note.** What you used AI tools for, one place one steered you wrong, and one decision you made yourself.

A few questions a designer might ask, to test against (not exhaustive; anticipating the rest is part of the exercise):

- "Three warm, durable options for a high-traffic hotel lobby, with your reasoning."
- "What's the most sustainable thing in the library, and how do you know?"
- "I need something for a poolside cabana. What works?"
- "Find me a deep green that feels like quiet luxury."

## How we'll read it

We care most about judgement. A small system that makes clear, defensible trade-offs and behaves sensibly under ambiguity beats a big one that answers everything confidently and is sometimes wrong. We're watching how the assistant behaves when the evidence is thin, conflicting, or absent, and the taste in what you build and what you leave out.

### Going further (optional)

The 3-hour core is the whole ask, and a strong submission can stop there. We've left the data and scenario open, so follow anything that pulls you. A few README notes on what you tried and why are worth more than a polished result. Skipping all of it costs you nothing. Please tell us roughly how long you spent, so we read your work in the right light.

Have fun with it.

## Submitting

- Push to a **private Git repo** and share access with `daniel.howells@materia.com`, or reply to the thread with a zip.
- Questions are welcome at `daniel.howells@materia.com`; asking good ones is a positive signal.
