/**
 * Size guide data for the product detail page.
 *
 * Each product on the site falls into one of four `SizingCategory`
 * buckets based on its product.category string. Each bucket has its
 * own measurement schema (e.g. tops measure chest + waist, bottoms
 * measure waist + inseam) and its own intro / notes copy.
 *
 * The chart returned by `sizeChartFor()` is filtered to only the
 * sizes the product actually offers — so a halter bra sized
 * ["S","M","L","XL","2XL"] renders exactly those 5 rows, not the
 * full 2XS-3XL range.
 *
 * Measurements are BODY measurements in inches (not garment specs).
 * For garment-specific dimensions we point users to the Tapstitch
 * product page in the chart's footnote.
 */

export type SizingCategory = "tops" | "bottoms" | "bras" | "bodysuits";

export type SizeRow = {
  size: string;
  /** Per-category measurement columns. Length varies (2 for bras,
   *  2 for tops/bottoms, 3 for bodysuits). */
  measurements: { label: string; range: string }[];
  /** Short fit descriptor shown in the rightmost column. */
  fit: string;
};

export type SizeChart = {
  category: SizingCategory;
  /** Section header inside the panel (e.g. "Fit & sizing — Tops"). */
  heading: string;
  /** Two or three sentence intro that explains the cut. */
  intro: string;
  /** Column labels for the measurement columns. Order matches
   *  `SizeRow.measurements[].label`. */
  columns: string[];
  /** Rows filtered to the product's offered sizes, in size order. */
  rows: SizeRow[];
  /** Footnote shown below the chart. */
  note: string;
};

/**
 * Map a product.category string to a sizing category.
 *
 * The catalog uses these category strings (see `Product Catalog.md`):
 *   Bras, Bodysuits, Crops, Hoodies & Crews, Jackets, Jeans,
 *   Joggers & Sweatpants, Leggings, Long Sleeves, Quarter-Zip,
 *   Shorts, Skirts, Tanks, Tees.
 *
 * Anything we don't recognize falls back to "tops" (the most common
 * category and the safest default — the chart just won't be perfect).
 */
export function sizingCategoryFor(productCategory: string): SizingCategory {
  const c = productCategory.trim().toLowerCase();
  if (c === "bras") return "bras";
  if (c === "bodysuits") return "bodysuits";
  if (
    c === "shorts" ||
    c === "leggings" ||
    c === "jeans" ||
    c === "joggers & sweatpants" ||
    c === "skirts"
  ) {
    return "bottoms";
  }
  // Tees, Tanks, Crops, Long Sleeves, Hoodies & Crews, Jackets,
  // Quarter-Zip — all upper-body garments.
  return "tops";
}

/** Canonical size order. Used to sort the product's sizes. */
const SIZE_ORDER = ["2XS", "XS", "S", "M", "L", "XL", "2XL", "3XL"];

/**
 * Per-category chart data. Keys are sizes. We only include rows
 * for sizes the product offers.
 */

const TOPS_ROWS: Record<string, Omit<SizeRow, "size">> = {
  "2XS": { measurements: [{ label: "Chest", range: "30–32" }, { label: "Waist", range: "24–26" }], fit: "Slim" },
  "XS":  { measurements: [{ label: "Chest", range: "32–34" }, { label: "Waist", range: "26–28" }], fit: "Slim" },
  "S":   { measurements: [{ label: "Chest", range: "34–36" }, { label: "Waist", range: "28–30" }], fit: "Athletic" },
  "M":   { measurements: [{ label: "Chest", range: "36–38" }, { label: "Waist", range: "30–32" }], fit: "Athletic" },
  "L":   { measurements: [{ label: "Chest", range: "38–40" }, { label: "Waist", range: "32–34" }], fit: "Relaxed" },
  "XL":  { measurements: [{ label: "Chest", range: "40–42" }, { label: "Waist", range: "34–36" }], fit: "Relaxed" },
  "2XL": { measurements: [{ label: "Chest", range: "42–44" }, { label: "Waist", range: "36–38" }], fit: "Roomy" },
  "3XL": { measurements: [{ label: "Chest", range: "44–46" }, { label: "Waist", range: "38–40" }], fit: "Roomy" },
};

const BOTTOMS_ROWS: Record<string, Omit<SizeRow, "size">> = {
  "2XS": { measurements: [{ label: "Waist", range: "24–26" }, { label: "Hip", range: "33–35" }], fit: "Slim" },
  "XS":  { measurements: [{ label: "Waist", range: "26–28" }, { label: "Hip", range: "35–37" }], fit: "Slim" },
  "S":   { measurements: [{ label: "Waist", range: "28–30" }, { label: "Hip", range: "37–39" }], fit: "Athletic" },
  "M":   { measurements: [{ label: "Waist", range: "30–32" }, { label: "Hip", range: "39–41" }], fit: "Athletic" },
  "L":   { measurements: [{ label: "Waist", range: "32–34" }, { label: "Hip", range: "41–43" }], fit: "Relaxed" },
  "XL":  { measurements: [{ label: "Waist", range: "34–36" }, { label: "Hip", range: "43–45" }], fit: "Relaxed" },
  "2XL": { measurements: [{ label: "Waist", range: "36–38" }, { label: "Hip", range: "45–47" }], fit: "Roomy" },
  "3XL": { measurements: [{ label: "Waist", range: "38–40" }, { label: "Hip", range: "47–49" }], fit: "Roomy" },
};

const BRAS_ROWS: Record<string, Omit<SizeRow, "size">> = {
  "2XS": { measurements: [{ label: "Band", range: "28–30" }, { label: "Cup", range: "AA–A" }], fit: "Slim" },
  "XS":  { measurements: [{ label: "Band", range: "30–32" }, { label: "Cup", range: "A–B" }], fit: "Slim" },
  "S":   { measurements: [{ label: "Band", range: "32–34" }, { label: "Cup", range: "B–C" }], fit: "Athletic" },
  "M":   { measurements: [{ label: "Band", range: "34–36" }, { label: "Cup", range: "B–C" }], fit: "Athletic" },
  "L":   { measurements: [{ label: "Band", range: "36–38" }, { label: "Cup", range: "C–D" }], fit: "Relaxed" },
  "XL":  { measurements: [{ label: "Band", range: "38–40" }, { label: "Cup", range: "D–DD" }], fit: "Relaxed" },
  "2XL": { measurements: [{ label: "Band", range: "40–42" }, { label: "Cup", range: "DD–E" }], fit: "Roomy" },
  "3XL": { measurements: [{ label: "Band", range: "42–44" }, { label: "Cup", range: "E–F" }], fit: "Roomy" },
};

const BODYSUITS_ROWS: Record<string, Omit<SizeRow, "size">> = {
  "2XS": { measurements: [
    { label: "Bust", range: "30–32" },
    { label: "Waist", range: "24–26" },
    { label: "Hip", range: "33–35" },
  ], fit: "Slim" },
  "XS":  { measurements: [
    { label: "Bust", range: "32–34" },
    { label: "Waist", range: "26–28" },
    { label: "Hip", range: "35–37" },
  ], fit: "Slim" },
  "S":   { measurements: [
    { label: "Bust", range: "34–36" },
    { label: "Waist", range: "28–30" },
    { label: "Hip", range: "37–39" },
  ], fit: "Athletic" },
  "M":   { measurements: [
    { label: "Bust", range: "36–38" },
    { label: "Waist", range: "30–32" },
    { label: "Hip", range: "39–41" },
  ], fit: "Athletic" },
  "L":   { measurements: [
    { label: "Bust", range: "38–40" },
    { label: "Waist", range: "32–34" },
    { label: "Hip", range: "41–43" },
  ], fit: "Relaxed" },
  "XL":  { measurements: [
    { label: "Bust", range: "40–42" },
    { label: "Waist", range: "34–36" },
    { label: "Hip", range: "43–45" },
  ], fit: "Relaxed" },
  "2XL": { measurements: [
    { label: "Bust", range: "42–44" },
    { label: "Waist", range: "36–38" },
    { label: "Hip", range: "45–47" },
  ], fit: "Roomy" },
  "3XL": { measurements: [
    { label: "Bust", range: "44–46" },
    { label: "Waist", range: "38–40" },
    { label: "Hip", range: "47–49" },
  ], fit: "Roomy" },
};

/** Column order for each category. Order matters — drives table layout. */
const COLUMNS: Record<SizingCategory, string[]> = {
  tops: ["Chest", "Waist"],
  bottoms: ["Waist", "Hip"],
  bras: ["Band", "Cup"],
  bodysuits: ["Bust", "Waist", "Hip"],
};

/** Per-category intro copy. One short paragraph explaining the cut. */
const INTRO: Record<SizingCategory, string> = {
  tops:
    "OBT tops run true-to-size with an athletic cut — relaxed through the shoulders, tapered at the waist so the fabric moves with the body, not against it. Size down for compression, size up for a roomier fit.",
  bottoms:
    "OBT bottoms are cut with a straight leg and a slight taper at the ankle. The waistband sits comfortably below the navel. Size up if you're between sizes for a more relaxed hip and thigh.",
  bras:
    "OBT bras are designed for athletic support with a soft, stretchy band that breathes. Band size is the primary measurement — cup range is approximate. If you're between band sizes, size down for firmer support.",
  bodysuits:
    "OBT bodysuits are form-fitting with a tailored cut through the torso. Bust and hip measurements matter as much as waist — size up if you're between sizes for more room through the hips.",
};

/** Per-category footnote. */
const NOTE: Record<SizingCategory, string> = {
  tops:
    "Body measurements in inches. Garment specs may vary by 0.5–1\" between styles. See the product page on Tapstitch for exact garment dimensions.",
  bottoms:
    "Body measurements in inches. Inseam length is consistent across sizes for each style (typically 30–32\"). See the product page on Tapstitch for the exact inseam.",
  bras:
    "Band measurements in inches, cup sizes are approximate. Style and fabric stretch affect fit — see the product page on Tapstitch for material composition and care notes.",
  bodysuits:
    "Body measurements in inches. Bodysuits run fitted through the torso. See the product page on Tapstitch for exact garment dimensions and stretch factor.",
};

/**
 * Build the size chart for a specific product. Filters rows to only
 * the sizes this product offers (and sorts them by canonical size
 * order), picks the category-appropriate columns, intro, and note.
 */
export function sizeChartFor(
  productCategory: string,
  productSizes: readonly string[],
): SizeChart {
  const cat = sizingCategoryFor(productCategory);
  const allRows: Record<string, Omit<SizeRow, "size">> =
    cat === "tops"
      ? TOPS_ROWS
      : cat === "bottoms"
        ? BOTTOMS_ROWS
        : cat === "bras"
          ? BRAS_ROWS
          : BODYSUITS_ROWS;

  // Sort the product's sizes by canonical order, then look up each
  // one in the per-category row table. If a size the product offers
  // isn't in our table (shouldn't happen with current catalog, but
  // defensive), we synthesize a row from whatever columns apply so
  // we never drop a size the user can actually pick.
  const sortedSizes = [...productSizes].sort(
    (a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b),
  );
  const columns = COLUMNS[cat];
  const rows: SizeRow[] = sortedSizes.map((size) => {
    const existing = allRows[size];
    if (existing) return { size, ...existing };
    return {
      size,
      measurements: columns.map((label) => ({ label, range: "—" })),
      fit: "—",
    };
  });

  return {
    category: cat,
    heading: `Fit & sizing — ${labelForCategory(cat)}`,
    intro: INTRO[cat],
    columns,
    rows,
    note: NOTE[cat],
  };
}

/** Human-readable label for a sizing category, used in the panel
 *  heading and the note callout. */
export function labelForCategory(c: SizingCategory): string {
  switch (c) {
    case "tops":
      return "Tops";
    case "bottoms":
      return "Bottoms";
    case "bras":
      return "Bras";
    case "bodysuits":
      return "Bodysuits";
  }
}
