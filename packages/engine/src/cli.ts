import { loadIndex, libraryShape } from "./load.js";
import { parseQuery } from "./parse.js";
import { searchMaterials } from "./search.js";
import { formatBrief } from "./format.js";

const query = process.argv.slice(2).join(" ").trim();
const idx = loadIndex();

if (!query) {
  const s = libraryShape(idx);
  console.log(`\nMaterial Evidence — ${idx.meta.library}`);
  console.log(`${s.count} textiles · ${s.mills.length} mills · ${s.fibres.join(", ")}` + (s.absentKinds.length ? ` · no ${s.absentKinds.join(", ")}` : ""));
  console.log(`Try:  pnpm ask "three warm durable options for a high-traffic hotel lobby"`);
  console.log(`      pnpm ask "the most sustainable thing, and how do you know"`);
  console.log(`      pnpm ask "a deep green that feels like quiet luxury"`);
  console.log(`      pnpm ask "a deep green velvet"   (honest no-match)\n`);
  process.exit(0);
}

console.log(formatBrief(searchMaterials(idx, parseQuery(query))));
