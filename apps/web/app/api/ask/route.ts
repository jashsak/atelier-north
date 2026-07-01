import { loadIndex, libraryShape, parseQuery, searchMaterials } from "@me/engine";
import { llmEnabled } from "@me/agent";
import { toView } from "../../lib/view.js";

export const runtime = "nodejs";

// The always-correct deterministic spine — returns instantly, no LLM on the critical path.
// The nicer LLM read is fetched separately (/api/narrate) and swapped in client-side.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const idx = loadIndex();
  if (!q) return Response.json({ shape: libraryShape(idx), llm: llmEnabled() });
  return Response.json({ brief: toView(searchMaterials(idx, parseQuery(q))), llm: llmEnabled() });
}
