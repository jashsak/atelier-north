# Product & evaluation note

## Who it's for

A specifier choosing upholstery for a real project — an interior designer or FF&E buyer. Their problem isn't finding fabric, it's trusting a recommendation. A sales rep is biased toward what they sell. A big sampling library has plenty of choice but no judgement, and won't stop you speccing something that fails code or arrives too late. What they want is a colleague who holds every constraint at once and tells the truth, even when the answer is "we don't have that." They think in situations ("hotel lobby," "poolside") but need to defend the choice in numbers (Martindale, fire class) — so the app leads with a plain-language answer and keeps the spec underneath as backup.

## Why this isn't just a chatbot

1. **It shows its reasoning.** Every query becomes a visible list of gates and preferences ("Heavy-duty seating — inferred from 'lobby'"), so you can see and correct what it assumed.
2. **Every number is real.** Numbers come from the record, not the model. Tap any spec to see where it came from.
3. **It shows how sure it is.** A row of tags — tested / on spec / inferred / missing / conflicting — instead of a made-up confidence percentage.
4. **It says no when it should.** "We don't carry velvet" plus the closest alternative, instead of a confident wrong answer.
5. **It knows where this data is tricky.** It catches near-identical materials, colour labels that don't match the photo, and specs the library simply doesn't record.

The interface follows the same idea: the swatch is the main event, everything else is one tap away, and a single warning colour is reserved for things that actually matter — so when it shows up, it means something.

## Where this could go wrong, and what the app does about it

- **Speccing something under-rated into a demanding job** — the worst-case failure. The app hard-gates by durability and fire rating per use-case, shows excluded items with the reason, and warns on near-identical lookalikes.
- **Stating a disputed value as fact.** Every field shows its source, and label-vs-photo disagreements are shown, not resolved silently.
- **Fake precision.** Price is shown as a relative band, never an invented number. Confidence is shown as a set of tags, never a made-up percentage.
- **Trusting the LLM's wording too much.** The model can only describe facts the engine already checked — it can't state a property the engine didn't give it.
- **A defensible but debatable top pick.** The reasoning and trade-off are always visible, and the excluded list is one click away, so the designer can check the work.

## How I'd check it's actually good

- **Does it find the right thing?** A test set of around 40 realistic queries (durability, sustainability, colour, use-case) with known correct answers, checked automatically.
- **Does every number trace back to real data?** Automated — no number should appear that isn't in the source data, and the LLM's sentences should never contain a spec number themselves (those come from the engine).
- **Does it ever recommend something unsafe?** A lobby query should never return an under-rated fabric as a confident pick. Tested today.
- **Does it know when to say no?** Around a quarter of the test set should be things the library genuinely can't provide (velvet, impossible combinations). Saying no too often is annoying; saying yes when it shouldn't is dangerous — both get measured.
- **Is the writing actually useful?** Judged by a second, stronger model against a simple rubric: does it name the real reason for the pick and the real trade-off?

**What's built today:** a small test suite (`pnpm test`) that checks the gates, the velvet abstention, the poolside case, the twin warning, and that every number shown traces back to the data. It's small and deterministic on purpose — the honest core, not the full plan above, which I'd build out with more time.
