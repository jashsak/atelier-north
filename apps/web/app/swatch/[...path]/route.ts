import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { DATA_DIR } from "@me/engine";

// Serves swatch images straight from the repo's data/ dir — no copy, no build step,
// so it works from a clean clone. Path is e.g. /swatch/haldal/c01.webp
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const rel = normalize(path.join("/")).replace(/^(\.\.[/\\])+/, "");
  const file = join(DATA_DIR, "images", rel);
  if (!file.startsWith(join(DATA_DIR, "images"))) return new Response("no", { status: 403 });
  try {
    const buf = await readFile(file);
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
