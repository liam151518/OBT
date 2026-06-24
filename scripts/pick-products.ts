/**
 * pick-products.ts
 *
 * Selects and copies 15 product images (8 female + 7 male) from
 * `Product Designs/` to `public/products/`, hand-picked for color
 * variety. Run with:
 *
 *   npx tsx scripts/pick-products.ts
 *
 * Outputs go to `public/products/<slug>.png` where slug is the
 * product name + color in kebab-case (e.g. `f-halter-bra-pink.png`).
 *
 * Why hand-picked (vs algorithmic round-robin): the previous
 * algorithmic version produced too many dark/black images. Hand-
 * picking guarantees a visibly diverse 15-image set on the landing
 * page.
 */

import { copyFile, mkdir, access } from "node:fs/promises";
import { join, dirname, basename, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

type Pick = {
  /** product name (e.g. "halter-bra") */
  product: string;
  /** color in the filename (e.g. "pink") — used to find the source file */
  color: string;
  /** gender prefix used in the output slug */
  gender: "f" | "m";
};

const PICKS: Pick[] = [
  // Female (8) — diverse colors
  { gender: "f", product: "halter-bra",          color: "pink" },
  { gender: "f", product: "criss-cross-bra",     color: "navy-blue" },
  { gender: "f", product: "crop-tank",           color: "khaki" },
  { gender: "f", product: "halter-crop-tank",    color: "pink" },
  { gender: "f", product: "essential-hoodie",    color: "dark-reddish-purple" },
  { gender: "f", product: "flare-jeans",         color: "light-gray" },
  { gender: "f", product: "a-line-skirt",        color: "navy-blue" },
  { gender: "f", product: "track-jacket",        color: "plum-purple" },
  // Male (7) — diverse colors
  { gender: "m", product: "heavyweight-tank",    color: "royal-blue" },
  { gender: "m", product: "waffle-knit-tee",     color: "light-apricot" },
  { gender: "m", product: "boxy-tank",           color: "gray" },
  { gender: "m", product: "frayed-hoodie",       color: "brown" },
  { gender: "m", product: "snow-wash-sweatpants",color: "light-gray" },
  { gender: "m", product: "mesh-shorts",         color: "sky-blue" },
  { gender: "m", product: "quarter-zip-tee",     color: "static-blue" },
];

const SRC_BASE = join(ROOT, "Product Designs");
const DST_BASE = join(ROOT, "public", "products");

function slug(p: Pick): string {
  return `${p.gender}-${p.product}-${p.color}`;
}

/**
 * Find the source file matching `product` + `color` inside the
 * gender's product folder. Naming convention from the design team:
 *
 *   <Product Folder>/<Product Folder>-mockups-<N>(<Color>).png
 *
 * Returns the absolute path of the first matching file.
 */
async function findSource(p: Pick): Promise<string | null> {
  const candidates = [
    join(SRC_BASE, p.gender === "f" ? "Female" : "Male", p.product),
  ];
  for (const folder of candidates) {
    try {
      await access(folder);
    } catch {
      continue;
    }
    // Glob the folder for files that contain the color in parens.
    const { readdirSync } = await import("node:fs");
    const files = readdirSync(folder);
    const match = files.find((f) => {
      if (!f.toLowerCase().endsWith(".png")) return false;
      const lower = f.toLowerCase();
      const productName = basename(folder).toLowerCase();
      const productSlug = productName.replace(/\s+/g, "-");
      if (!lower.startsWith(productSlug.toLowerCase())) return false;
      return lower.includes(`(${p.color.toLowerCase()})`);
    });
    if (match) return join(folder, match);
  }
  return null;
}

async function main() {
  await mkdir(DST_BASE, { recursive: true });
  let copied = 0;
  let missing: string[] = [];

  for (const p of PICKS) {
    const src = await findSource(p);
    if (!src) {
      missing.push(slug(p));
      continue;
    }
    const dst = join(DST_BASE, `${slug(p)}${extname(src).toLowerCase()}`);
    await copyFile(src, dst);
    copied++;
    console.log(`✓ ${slug(p)}  ←  ${src.replace(ROOT + "/", "")}`);
  }

  console.log(`\n${copied}/${PICKS.length} copied to ${DST_BASE.replace(ROOT + "/", "")}`);
  if (missing.length) {
    console.warn(`Missing ${missing.length}:`);
    for (const m of missing) console.warn(`  - ${m}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
