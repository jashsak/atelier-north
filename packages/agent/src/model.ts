import { createGoogleGenerativeAI } from "@ai-sdk/google";

const apiKey = () => process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

/** Is the optional LLM layer available? If not, the app uses the deterministic path. */
export const llmEnabled = () => !!apiKey();

const MODEL = process.env.ME_MODEL ?? "gemini-2.5-flash";

/** The shared Gemini model handle. */
export function getModel() {
  const google = createGoogleGenerativeAI({ apiKey: apiKey() });
  return google(MODEL);
}

/** Disable Gemini 2.5 "thinking" — we want fast, concise narration, not reasoning tokens
 *  eating the output budget. */
export const PROVIDER_OPTS = { google: { thinkingConfig: { thinkingBudget: 0 } } } as const;

/** Grounding guard: true if the model smuggled a spec numeral or invented a unit into its prose. */
export const containsUngroundedNumeral = (text: string): boolean =>
  /\b\d{3,}\b|\d+\s*(martindale|weeks?|%)|martindale\s*\d/i.test(text);
