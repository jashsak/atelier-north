import { loadIndex, parseQuery, searchMaterials } from "@me/engine";
import { narrate } from "@me/agent";

export const runtime = "nodejs";

// The optional LLM narration for a query — fetched after the instant result renders,
// then swapped in. Recomputes the same deterministic brief (cheap) and narrates it.
// Facts never change; only the prose. Returns { read: null } with no key or on failure.
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json({ read: null });
  const brief = searchMaterials(loadIndex(), parseQuery(q));
  return Response.json({ read: await narrate(brief) });
}
