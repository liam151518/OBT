/**
 * generate-product-data.ts
 *
 * Emits `src/data/products.ts` from two authoritative sources:
 *   - ~/Desktop/New Catalog.csv (Tapstitch export: product codes, sizes,
 *     variant counts, Design URLs, color names + IDs)
 *   - Product Designs/{Female,Male}/<Product>/ on disk (mockup PNG files)
 *
 * For each product, picks ONE representative color/variant deterministically
 * (seeded by product code) and locks it — same color shows on every reload,
 * no SSR flicker, no reshuffling on navigation. The representative variant
 * is the one rendered on /shop and the landing page product scatter.
 *
 * Also emits a typed `getProductBySlug` helper for /product/[slug] lookup
 * (the detail page that we're NOT building yet, but that the tile link
 * needs to resolve cleanly).
 *
 * Run with:
 *   npx tsx scripts/generate-product-data.ts
 *
 * Re-run whenever:
 *   - The CSV changes (new product, removed product, color added/removed)
 *   - A product is added/removed from `Product Designs/`
 *   - You want to re-roll the representative color picks (delete the
 *     generated file first; picks are deterministic from product code so
 *     they're stable across re-runs unless you change the seed strategy)
 */

import { mkdir, writeFile, access, readFile, copyFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { join, dirname, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const CSV_PATH = join(process.env.HOME ?? "~", "Desktop", "New Catalog.csv");
const PRODUCT_DESIGNS_DIR = join(ROOT, "Product Designs");
const OUT_PATH = join(ROOT, "src", "data", "products.ts");
const PUBLIC_PRODUCTS_DIR = join(ROOT, "public", "products");

/* -------------------------------------------------------------------------
 * 1. Color name → hex accent map
 *
 * We need a single accent hex per color name so the shader retints
 * consistently. These were picked to roughly match the actual product
 * color (verified against the hand-picked 15 scatter in
 * src/components/landing/product-scatter.tsx). If a color isn't in this
 * map, we fall back to a deterministic hash of the color name (gray-ish).
 * ----------------------------------------------------------------------- */

const COLOR_ACCENTS: Record<string, string> = {
  // Neutrals
  "Black": "#1a1a1a",
  "White": "#e8e8e8",
  "Gray": "#7a7a7e",
  "Light Gray": "#c8c5c0",
  "Light Grey": "#c8c5c0", // British, per Catalog
  "Medium Gray": "#9a9a9e",
  "Medium Grey": "#9a9a9e",
  "Dark Gray": "#4a4a4e",
  "Dark Grey": "#4a4a4e",
  "Charcoal Gray": "#3a3a3e",
  "Flower Gray": "#b8b5b0",
  "Pirate Gray": "#5a5a5e",
  // Blues
  "Navy Blue": "#2a3a6e",
  "Royal Blue": "#3a5fb8",
  "Sky Blue": "#8ac4d8",
  "Blue": "#4a6fb8",
  "Jeans Blue": "#4a6a9a",
  "Lake Blue": "#5a8ac0", // Catalog spells lowercase 'b'; normalise
  "Lake blue": "#5a8ac0",
  "Static Blue": "#4a5a7a",
  "Gray Blue": "#7a8aa0",
  "Dark Blue": "#2a3a5e",
  // Reds / pinks
  "Red": "#c8424a",
  "Wine Red": "#7a2a3a",
  "Brick Red": "#a8424a",
  "Dark Reddish Purple": "#5a2a3a",
  "Pink": "#f4a3b5",
  "Rose Pink": "#e88aa0",
  // Earth tones
  "Brown": "#5a3a28",
  "Coffee": "#5a3a20",
  "Light Coffee": "#8a6a4a",
  "Beige": "#c8b89a",
  "Khaki": "#b8a07e",
  "Apricot": "#e8b89a",
  "Light Apricot": "#eac8a8",
  "Mild Apricot": "#e8c0a8",
  "Yellow": "#e8c84a",
  "Orange": "#e8924a",
  // Greens
  "Army Green": "#4a5a3a",
  "Light Green": "#8ac8a0",
  "Blackish Green": "#2a3a2a",
  "Gray Green": "#7a8a7a",
  "Retro Green": "#5a7a4a",
  // Purples
  "Purple": "#7a4a8a",
  "Lavender": "#b8a0d8",
  "Light Purple": "#c8b0e0",
  "Plum Purple": "#7a3a5a",
  "Dark Purple": "#4a2a5a",
  "Ash Purple": "#8a7a9a",
  "Gray Purple": "#8a7a9a",
  // Washes / variants
  "Black with White": "#3a3a3e",
  "Dusk Black": "#2a2a2e",
  "Washed Black": "#3a3a3e",
  "Black Beauty": "#1a1a2a",
  "Yellow with Brown": "#a8905a",
  "Coffee with Blue": "#5a5a7a",
  "Flower Gray with Dark Gray": "#9a9892",
};

/** Stable fallback for unknown color names — hash to a muted gray. */
function fallbackAccent(colorName: string): string {
  let h = 0;
  for (let i = 0; i < colorName.length; i++) {
    h = ((h << 5) - h + colorName.charCodeAt(i)) | 0;
  }
  // Map to a narrow band of muted grays so unknown colors don't pop.
  const v = 90 + Math.abs(h % 50); // 90..140
  const hex = v.toString(16).padStart(2, "0");
  return `#${hex}${hex}${hex}`;
}

function accentFor(colorName: string): string {
  // Normalise: the catalog has both "Lake blue" and (per MD note) "Lake Blue".
  const direct = COLOR_ACCENTS[colorName];
  if (direct) return direct;
  const titleCase = colorName
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return COLOR_ACCENTS[titleCase] ?? fallbackAccent(colorName);
}

/* -------------------------------------------------------------------------
 * 2. CSV parser — minimal, no deps. Splits on commas, respects double-quoted
 * fields (the only quoted column is "Size" which contains commas).
 * ----------------------------------------------------------------------- */

type CsvRow = {
  designName: string;
  productCode: string;
  sizes: string[];
  colorId: string;
  designUrl: string;
  colorName: string;
};

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

async function loadCatalog(): Promise<CsvRow[]> {
  let raw: string;
  try {
    raw = await readFile(CSV_PATH, "utf8");
  } catch {
    throw new Error(`Could not read catalog CSV at ${CSV_PATH}`);
  }
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const header = parseCsvLine(lines[0]).map((h) => h.trim());
  const idx = {
    designName: header.indexOf("Design Name"),
    productCode: header.indexOf("Product Code"),
    sizes: header.indexOf("Size"),
    colorId: header.indexOf("Color ID"),
    designUrl: header.indexOf("Design URL"),
    colorName: header.indexOf("Color Name"),
  };
  for (const [k, v] of Object.entries(idx)) {
    if (v === -1) throw new Error(`CSV missing column: ${k}`);
  }
  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    return {
      designName: cols[idx.designName].trim(),
      productCode: cols[idx.productCode].trim(),
      sizes: cols[idx.sizes].split(",").map((s) => s.trim()).filter(Boolean),
      colorId: cols[idx.colorId].trim(),
      designUrl: cols[idx.designUrl].trim(),
      colorName: cols[idx.colorName].trim(),
    };
  });
}

/* -------------------------------------------------------------------------
 * 3. Walk Product Designs/ to discover which color mockups exist on disk
 * for each product. Some products have color tags that don't match the
 * catalog (e.g. "Babby Blue" typo) — we keep the on-disk tag as-is and
 * let the user decide later. The catalog spellings are authoritative for
 * variant metadata; the disk spellings are authoritative for file paths.
 * ----------------------------------------------------------------------- */

type DiskMockup = {
  /** file name only, e.g. "Halter Bra-mockups-3(Yellow).png" */
  file: string;
  /** color tag as it appears in the file name, e.g. "Yellow" */
  diskColorTag: string;
  /**
   * Numeric suffix from the filename's `mockups-N(...)` segment.
   * Used to sort images in ascending order per color so the
   * lowest-numbered image is always first in `images[]`. `Infinity`
   * for files that don't follow the mockups-N pattern (degraded
   * to end-of-list).
   */
  numericSuffix: number;
};

async function discoverDiskMockups(gender: "Female" | "Male", productFolder: string): Promise<DiskMockup[]> {
  const folder = join(PRODUCT_DESIGNS_DIR, gender, productFolder);
  try {
    await access(folder);
  } catch {
    return [];
  }
  const files = readdirSync(folder).filter((f) => f.toLowerCase().endsWith(".png"));
  return files.map((file) => {
    // Extract the LAST (Color) group in the filename. Some files have
    // multiple (Color) groups (e.g. "A-Line Skirt-mockups-3(Babby Blue)(Sky Blue).png")
    // — we use the LAST one as the canonical color tag per the Catalog note.
    const matches = [...file.matchAll(/\(([^()]+)\)/g)];
    const diskColorTag = matches.length ? matches[matches.length - 1][1] : "";
    // Extract the `mockups-N` number. Falls back to Infinity so the
    // file sorts to the end of its color group rather than the start.
    const n = /-mockups-(\d+)/.exec(file);
    const numericSuffix = n ? parseInt(n[1], 10) : Infinity;
    return { file, diskColorTag, numericSuffix };
  });
}

/* -------------------------------------------------------------------------
 * 4. Derive a slug from the catalog product name. We lowercase, replace
 * spaces with hyphens, drop punctuation.
 * ----------------------------------------------------------------------- */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* -------------------------------------------------------------------------
 * 5. Seeded random — stable per-product color pick. Same product code →
 * same representative color across re-runs and across the user's reloads.
 *
 * We use a tiny FNV-1a hash of the product code as the seed, then a
 * mulberry32 PRNG (same one used in product-scatter.tsx) to pick one of
 * the product's available variants.
 * ----------------------------------------------------------------------- */

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------------
 * 6. Category inference. Mirrors the catalog MD's table — single source of
 * truth until we wire up a real CMS. Anything not matching falls through
 * to "Other".
 * ----------------------------------------------------------------------- */

function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("hoodie") || n.includes("crew")) return "Hoodies & Crews";
  if (n.includes("jacket") || n.includes("track jacket")) return "Jackets";
  if (n.includes("tank")) return "Tanks";
  if (n.includes("jogger") || n.includes("sweatpant") || n.includes("waist pant")) return "Joggers & Sweatpants";
  if (n.includes("legging")) return "Leggings";
  if (n.includes("jean")) return "Jeans";
  if (n.includes("short")) return "Shorts";
  if (n.includes("skirt")) return "Skirts";
  if (n.includes("bra")) return "Bras";
  if (n.includes("bodysuit")) return "Bodysuits";
  if (n.includes("crop")) return "Crops";
  if (n.includes("long sleeve")) return "Long Sleeves";
  if (n.includes("tee") || n.includes("shirt")) return "Tees";
  if (n.includes("quarter-zip") || n.includes("quarter zip")) return "Quarter-Zip";
  return "Other";
}

/* -------------------------------------------------------------------------
 * 7. Disk folder aliasing. Catalog says "One-Shoulder Crop"; disk has
 * "One-ShoulderCrop" (no space). We try the catalog spelling first; if
 * no folder matches, we try a few canonical aliases.
 * ----------------------------------------------------------------------- */

const DISK_FOLDER_ALIASES: Record<string, string> = {
  "One-Shoulder Crop": "One-ShoulderCrop",
};

function resolveDiskFolder(name: string, gender: "Female" | "Male"): { folder: string; aliasUsed: boolean } {
  const primary = name;
  const aliases = [primary, DISK_FOLDER_ALIASES[primary] ?? "", primary.replace(/\s+/g, ""), primary.replace(/-/g, " ")];
  for (const candidate of aliases) {
    if (!candidate) continue;
    if (readdirSync_safe(join(PRODUCT_DESIGNS_DIR, gender, candidate)).length > 0) {
      return { folder: candidate, aliasUsed: candidate !== primary };
    }
  }
  return { folder: primary, aliasUsed: false };
}

function readdirSync_safe(p: string): string[] {
  try {
    return readdirSync(p);
  } catch {
    return [];
  }
}

/* -------------------------------------------------------------------------
 * 8. Match catalog variants to disk mockups. We match by color name
 * (case-insensitive, ignoring leading "the"/"a"/"an"), preferring exact
 * matches over fuzzy matches. Variants with no disk mockup are kept in the
 * catalog data but flagged as `missing` — useful for a future admin UI.
 * ----------------------------------------------------------------------- */

function normaliseColorKey(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function findMockupsForColor(mockups: DiskMockup[], catalogColor: string): DiskMockup[] {
  const target = normaliseColorKey(catalogColor);
  // 1. Exact normalised match — preferred.
  let matched = mockups.filter((m) => normaliseColorKey(m.diskColorTag) === target);
  // 2. Substring match either direction.
  if (!matched.length) {
    matched = mockups.filter(
      (m) =>
        normaliseColorKey(m.diskColorTag).includes(target) ||
        target.includes(normaliseColorKey(m.diskColorTag)),
    );
  }
  // 3. Strip common color prefixes and try again. Catches
  //    "Washed Black" on disk vs "Black" in catalog, etc.
  if (!matched.length) {
    const stripPrefix = (s: string) =>
      s.replace(
        /^(washed|light|dark|medium|deep|bright|matte|soft|vintage|faded|snow|acid|retro|distressed)\s+/i,
        "",
      ).trim();
    matched = mockups.filter(
      (m) => stripPrefix(normaliseColorKey(m.diskColorTag)) === stripPrefix(target),
    );
  }
  // Sort by numeric suffix ascending so the lowest-numbered mockup
  // (typically the front view) is always index 0 in `images[]`. Falls
  // back to filename order for files without a `mockups-N` segment.
  return [...matched].sort((a, b) => a.numericSuffix - b.numericSuffix);
}

/**
 * Back-compat: return the first mockup of a color, or null. Used by
 * the representative-color picker (which only needs a single image).
 */
function findMockupForColor(mockups: DiskMockup[], catalogColor: string): DiskMockup | null {
  return findMockupsForColor(mockups, catalogColor)[0] ?? null;
}

/* -------------------------------------------------------------------------
 * 9. Main: build the typed product array, emit src/data/products.ts.
 * ----------------------------------------------------------------------- */

type ProductOut = {
  slug: string;
  name: string;
  productCode: string;
  gender: "female" | "male";
  category: string;
  sizes: string[];
  variantCount: number;
  representative: {
    colorName: string;
    src: string;
    width: number;
    height: number;
  };
  accent: string;
  tapstitchUrl: string;
  diskFolder: string;
  aliasUsed: boolean;
  variants: {
    colorName: string;
    colorId: string;
    /** Public URL of the FIRST image for this variant (the "hero").
     *  null when the disk mockup is missing. */
    src: string | null;
    /** ALL images for this variant, in display order (typically
     *  front-view then back-view). Empty when no mockups found. */
    images: string[];
    /** Hex accent for the variant color (used to retint the shader
     *  on the product detail page when this variant is selected). */
    accent: string;
  }[];
  /** Runtime-only: path of the disk file the representative was picked from.
   *  Used after the loop to copy the actual PNG into public/products/.
   *  Not serialised into the TS output. */
  _repDiskFile?: string;
};

async function main() {
  const rows = await loadCatalog();

  // Group CSV rows by (Design Name, Product Code) to form products.
  type Group = {
    name: string;
    code: string;
    sizes: Set<string>;
    variants: { colorName: string; colorId: string; designUrl: string }[];
  };
  const groups = new Map<string, Group>();
  for (const row of rows) {
    const key = `${row.designName}|${row.productCode}`;
    let g = groups.get(key);
    if (!g) {
      g = { name: row.designName, code: row.productCode, sizes: new Set(), variants: [] };
      groups.set(key, g);
    }
    for (const s of row.sizes) g.sizes.add(s);
    g.variants.push({
      colorName: row.colorName,
      colorId: row.colorId,
      designUrl: row.designUrl,
    });
  }

  const out: ProductOut[] = [];

  for (const g of groups.values()) {
    const slug = slugify(g.name);

    // Decide gender from the catalog MD convention (28 female / 17 male).
    // The CSV doesn't carry a gender column, so we use the disk folder's
    // gender as the source of truth: try Female first, then Male.
    let gender: "female" | "male" | null = null;
    let diskFolder = "";
    let aliasUsed = false;
    for (const g_ of ["Female", "Male"] as const) {
      const { folder, aliasUsed: a } = resolveDiskFolder(g.name, g_);
      if (folder) {
        // Probe: does the folder actually exist?
        const probe = readdirSync_safe(join(PRODUCT_DESIGNS_DIR, g_, folder));
        if (probe.length > 0) {
          gender = g_.toLowerCase() as "female" | "male";
          diskFolder = folder;
          aliasUsed = a;
          break;
        }
      }
    }
    if (!gender) {
      console.warn(`[skip] No disk folder for "${g.name}" (code ${g.code})`);
      continue;
    }

    const mockups = await discoverDiskMockups(gender === "female" ? "Female" : "Male", diskFolder);

    // Map each catalog variant to its disk mockups. Most colors have
    // 2 images on disk (typically front + back views); we collect them
    // all and emit them as `images[]` so the detail-page gallery can
    // cycle through them. `src` stays as the first image for
    // backwards-compat with anything that only needs a single image
    // (landing/shop tiles, OG tags, etc.).
    const productSlug = slugify(g.name);
    const variants = g.variants.map((v) => {
      const matches = findMockupsForColor(mockups, v.colorName);
      const colorSlug = slugify(v.colorName);
      const images = matches.map(
        (m, i) =>
          `/products/${gender}-${productSlug}-${colorSlug}-${i + 1}.png`,
      );
      return {
        colorName: v.colorName,
        colorId: v.colorId,
        src: images[0] ?? null,
        images,
        accent: accentFor(v.colorName),
      };
    });

    // Deterministic per-product color pick: seed by product code, pick
    // a variant from those that have a disk mockup.
    const candidates = variants.filter((v) => v.src !== null);
    if (candidates.length === 0) {
      console.warn(`[skip] "${g.name}" has no disk mockups`);
      continue;
    }
    const rand = mulberry32(fnv1a(g.code));
    const pickIndex = Math.floor(rand() * candidates.length);
    const picked = candidates[pickIndex];

    const accent = accentFor(picked.colorName);

    // Representative src path under /public. We copy the file into
    // public/products/ at generator time so the URL is stable across
    // disk reorganisations. We point to the picked variant's FIRST
    // image so the representative always matches one of the gallery
    // thumbnails on the detail page (otherwise the hero would jump
    // when a tile is clicked).
    const representativeSrc = picked.images[0] ?? null;

    // Find the disk mockup file matching the picked color so we can
    // copy it into public/products/ after the loop. We use the same
    // 3-tier matcher as the per-variant logic so disk-tag mismatches
    // (e.g. "Washed Black" on disk vs "Black" in catalog) don't break
    // the representative copy. findMockupsForColor now sorts by
    // numeric suffix ascending so the lowest-numbered mockup (the
    // one that lands at `images[0]` for the variant) is what gets
    // copied to public/products/.
    const repMockup = findMockupForColor(mockups, picked.colorName);

    out.push({
      slug: productSlug,
      name: g.name,
      productCode: g.code,
      gender,
      category: inferCategory(g.name),
      sizes: [...g.sizes],
      variantCount: variants.length,
      representative: {
        colorName: picked.colorName,
        src: representativeSrc,
        width: 1500,
        height: 1875,
      },
      accent,
      tapstitchUrl: picked.colorName ? variants.find((v) => v.colorName === picked.colorName)?.colorId ?? "" : "",
      diskFolder,
      aliasUsed,
      variants: variants.map((v) => ({
        colorName: v.colorName,
        colorId: v.colorId,
        src: v.src,
        images: v.images,
        accent: v.accent,
      })),
    });

    // Use the first variant's design URL as the canonical buy link.
    out[out.length - 1].tapstitchUrl = g.variants[0]?.designUrl ?? "";
    if (repMockup) {
      out[out.length - 1]._repDiskFile = repMockup.file;
    }
  }

  // Stable sort: female first, then male, alphabetical within each.
  out.sort((a, b) => {
    if (a.gender !== b.gender) return a.gender === "female" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  // Copy representative PNGs (and ALL variant PNGs we have on disk) into
  // public/products/ so the runtime can serve them as static assets.
  await mkdir(PUBLIC_PRODUCTS_DIR, { recursive: true });
  let copiedRep = 0;
  let copiedVar = 0;
  for (const p of out) {
    const genderDir = p.gender === "female" ? "Female" : "Male";

    // Copy the representative file (for the landing scatter + shop grid).
    if (p._repDiskFile) {
      const src = join(PRODUCT_DESIGNS_DIR, genderDir, p.diskFolder, p._repDiskFile);
      const repFileName = basename(p.representative.src);
      try {
        await access(src);
        await copyFile(src, join(PUBLIC_PRODUCTS_DIR, repFileName));
        copiedRep++;
      } catch (e) {
        console.warn(`[copy-fail] rep for ${p.name}: ${(e as Error).message}`);
      }
    }

    // Copy every variant image we have on disk into public/products/.
    // Each variant typically has 2 images (front + back); we use the
    // same 3-tier matcher as the data builder so disk filenames and
    // catalog color names stay in sync. Naming: each image is suffixed
    // with its index in the matched list (`-1.png`, `-2.png`, …) so
    // the order is deterministic and the URL stays stable across runs.
    const mockups = await discoverDiskMockups(genderDir as "Female" | "Male", p.diskFolder);
    for (const v of p.variants) {
      if (!v.images.length) continue;
      const matches = findMockupsForColor(mockups, v.colorName);
      for (let i = 0; i < v.images.length; i++) {
        const match = matches[i];
        if (!match) continue;
        const publicUrl = v.images[i];
        const fileName = basename(publicUrl);
        const src = join(PRODUCT_DESIGNS_DIR, genderDir, p.diskFolder, match.file);
        try {
          await access(src);
          await copyFile(src, join(PUBLIC_PRODUCTS_DIR, fileName));
          copiedVar++;
        } catch (e) {
          // Individual variant copy failures are non-fatal; the gallery
          // falls back to the next available image.
          console.warn(`[copy-fail] ${p.name}/${v.colorName}#${i + 1}: ${(e as Error).message}`);
        }
      }
    }
  }

  // Strip the runtime-only field before serialisation.
  for (const p of out) delete (p as { _repDiskFile?: string })._repDiskFile;

  console.log(`✓ Copied ${copiedRep} representative + ${copiedVar} variant PNGs into public/products/`);

  // Emit the TS file.
  const header = `/**
 * AUTO-GENERATED by scripts/generate-product-data.ts — do not edit by hand.
 *
 * Regenerate with:
 *   npx tsx scripts/generate-product-data.ts
 *
 * Source of truth:
 *   - ~/Desktop/New Catalog.csv          (product codes, sizes, variants)
 *   - Product Designs/{Female,Male}/    (mockup PNG files)
 *
 * For each product we pick ONE representative variant deterministically
 * (seeded by the Tapstitch product code) and lock it. Same product always
 * shows the same color on every reload. Re-rolls are a script edit away.
 */

export type Gender = "female" | "male";

export type ProductVariant = {
  colorName: string;
  colorId: string;
  /** Public URL of the FIRST image for this variant (the "hero").
   *  null when the disk mockup is missing. */
  src: string | null;
  /** ALL images for this variant, in display order (typically
   *  front-view then back-view). Empty when no mockups were found. */
  images: string[];
  /** Hex accent for the variant color (used to retint the shader
   *  on the product detail page when this variant is selected). */
  accent: string;
};

export type Product = {
  /** kebab-case slug from the catalog name, e.g. "halter-bra" */
  slug: string;
  /** Display name, e.g. "Halter Bra" */
  name: string;
  /** Tapstitch SKU, e.g. "WT0063" */
  productCode: string;
  gender: Gender;
  category: string;
  /** Adult sizes in stock order, e.g. ["S","M","L","XL"] */
  sizes: string[];
  /** How many color variants this product has on Tapstitch */
  variantCount: number;
  /** The single variant shown in the landing scatter + shop grid */
  representative: {
    colorName: string;
    /** Public URL, e.g. "/products/f-halter-bra-pink.png" */
    src: string;
    width: number;
    height: number;
  };
  /** Hex color used to retint the background shader on hover/focus */
  accent: string;
  /** Tapstitch Design URL — the eventual "Buy" link */
  tapstitchUrl: string;
  /** On-disk folder name (may differ from \`slug\` when aliased) */
  diskFolder: string;
  /** True when we had to fall back to an alias folder name */
  aliasUsed: boolean;
  /** All variants from the catalog, with their public src if it exists */
  variants: ProductVariant[];
};

export const PRODUCTS: Product[] = `;

  const body =
    "  " +
    JSON.stringify(out, null, 2)
      .replace(/"(\w+)":/g, "$1:") // unquote keys
      .replace(/\btrue\b/g, "true")
      .replace(/\bfalse\b/g, "false")
      .replace(/\bnull\b/g, "null");

  const helpers = `

/** Index for fast slug lookup. Built once at module load. */
const BY_SLUG: Map<string, Product> = new Map(PRODUCTS.map((p) => [p.slug, p]));

export function getProductBySlug(slug: string): Product | undefined {
  return BY_SLUG.get(slug);
}

export function getProductsByGender(g: Gender): Product[] {
  return PRODUCTS.filter((p) => p.gender === g);
}

export function getAllProducts(): Product[] {
  return PRODUCTS;
}
`;

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, header + body + ";\n" + helpers, "utf8");

  const totalFemale = out.filter((p) => p.gender === "female").length;
  const totalMale = out.filter((p) => p.gender === "male").length;
  console.log(`✓ Wrote ${out.length} products (${totalFemale} female, ${totalMale} male) to ${OUT_PATH.replace(ROOT + "/", "")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});