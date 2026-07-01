import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { FIBRES, type Library, type MaterialIndex } from "./types.js";
import { buildIndex } from "./enrich.js";

/** Find the repo root (the dir containing data/materials.json) by walking up from
 *  a set of candidate starts — robust to cwd and to being bundled by Next. */
function findRepoRoot(): string {
  const starts: string[] = [process.cwd()];
  try { starts.push(dirname(fileURLToPath(import.meta.url))); } catch { /* bundled */ }
  for (const start of starts) {
    let dir = start;
    for (let i = 0; i < 8; i++) {
      if (existsSync(resolve(dir, "data", "materials.json"))) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return process.cwd();
}

export const REPO_ROOT = findRepoRoot();
export const DATA_DIR = resolve(REPO_ROOT, "data");

let cached: MaterialIndex | null = null;

export function loadIndex(): MaterialIndex {
  if (cached) return cached;
  const raw = JSON.parse(readFileSync(resolve(DATA_DIR, "materials.json"), "utf8")) as Library;
  cached = buildIndex(raw);
  return cached;
}

/** Honest "shape of the library" for the empty state — computed, not hard-coded. */
export function libraryShape(idx: MaterialIndex) {
  const mills = new Set(idx.materials.map((m) => m.brand));
  const fibres = new Set<string>();
  for (const m of idx.materials) {
    for (const f of m.raw.composition.toLowerCase().match(/[a-z]+/g) ?? []) {
      if (FIBRES.includes(f)) fibres.add(f);
    }
  }
  const outdoor = idx.materials.filter((m) => m.raw.attributes.indoor_outdoor.includes("outdoor")).length;
  const noCerts = idx.materials.filter((m) => m.certifications.length === 0).length;
  // texture/material kinds genuinely absent (used for honest abstention)
  const blob = idx.materials.map((m) => m.textBlob).join(" ");
  const absent = ["velvet", "bouclé", "leather", "chenille"].filter((k) => {
    const norm = k.replace("é", "e");
    return !blob.includes(norm) && !blob.includes(k);
  });
  return {
    count: idx.materials.length,
    mills: [...mills],
    fibres: [...fibres],
    outdoorCount: outdoor,
    noCertCount: noCerts,
    absentKinds: absent,
  };
}
