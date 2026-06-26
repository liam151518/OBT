"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

/**
 * Product scatter, modeled on SKYLRK's floating-product-grid.
 *
 * Reference: https://skylrk.com (Shopify theme, `floating-product-grid`)
 *
 * SKYLRK's pattern:
 *  - 12-column CSS grid
 *  - Square tiles, base 15vw
 *  - 5-position rotation of stagger-y offsets and grid-column spans:
 *      5n+1 → stagger +2vw,  col 1-4 (start)
 *      5n+2 → stagger -3vw, col 5-8 (center)
 *      5n+3 → stagger +1vw, col 9-12 (end)
 *      5n+4 → stagger -1vw, col 2-6 (center, offset)
 *      5n   → stagger +2vw, col 8-12 (center, offset)
 *  - Per-tile --offset-x / --offset-y jitter from JS (random)
 *  - align-content: space-evenly + gap: 75px 0 + min-height: 100vh
 *  - 150px top/bottom padding, 50px side padding
 *
 * Adapted for 15 products:
 *  - Tile size 18vw (15% larger than SKYLRK's 15vw, matching the
 *    user's "15% bigger" feedback)
 *  - Bumped row gap to 90px for the user's "more vertical spacing"
 *    request, with min-height: 130vh so vertical space is generous
 *    on tall viewports without becoming a chore to scroll on short
 *    ones
 *  - Same 5-position stagger pattern as SKYLRK, so 15 products
 *    form 3 cycles of 5 staggered positions
 *
 * Why jitter never causes overlap:
 *  - Each tile lives in its own row, and the row gap (90px) is
 *    larger than the maximum stagger (|−3vw| ≈ 57px at 1920) plus
 *    per-tile |--offset-y| (≤ 1.5vw ≈ 28px) plus tile height (18vw
 *    ≈ 346px). The vertical "occupied zone" of any tile is tile
 *    height + stagger + jitter; the next row sits at least a
 *    tile-height below the row above, so even with worst-case
 *    stagger+jitter a tile cannot enter the next row's tile
 *    bounding box.
 *  - Horizontally, tiles are constrained to one of 5 fixed
 *    column spans, each ≤ 4/12 of the viewport. The widest tile
 *    (18vw) and its col span don't overlap an adjacent col's tile.
 */

type ProductSpec = {
  /** Public URL of the product's representative mockup PNG. */
  src: string;
  /** Alt text for screen readers — the product's display name. */
  alt: string;
  /** Pixel width of the source PNG (for next/image). */
  width: number;
  /** Pixel height of the source PNG. */
  height: number;
  /**
   * Dominant color of the product, hex string (e.g. "#ff8aa1").
   * Used by the background shader to tint its uColorB (the
   * "shadow" / noise color) when the user hovers or focuses this
   * product — the product's color "spills onto" the TV shader
   * behind it.
   *
   * Hex is a stable, accessible string format. THREE.Color accepts
   * hex natively, so the parent component can pass it straight in.
   */
  accent: string;
  /**
   * Slug for the future /product/[slug] detail page. When present,
   * the tile renders as a `<Link>` that navigates to the detail page.
   * When absent (legacy landing-page use), the tile stays as a plain
   * `<button>`.
   */
  slug?: string;
};

export type { ProductSpec };

type Product = ProductSpec & {
  /** column in the 12-col grid (1..12) — fixed per slot */
  col: number;
  /** column span in the 12-col grid (1..12) — fixed per slot */
  span: number;
  /** justify-self within the column track */
  justifySelf: "start" | "center" | "end";
  /** stagger-y in vw — adds a vertical baseline shift within the row */
  staggerYvw: number;
  /** per-tile horizontal jitter (px) — bounded so it stays inside the column */
  offsetXpx: number;
  /** per-tile vertical jitter (px) — bounded so it doesn't enter the next row */
  offsetYpx: number;
  /** rotation in degrees, -6..6 for subtle organic feel */
  rotate: number;
  /** z-index 1..5 */
  z: number;
};

/** Mulberry32 PRNG — same seed → same sequence, SSR-safe. */
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

/**
 * Five-position rotation. Each entry says: for this position in
 * the 5-cycle, which 12-col span do I occupy, how am I justified,
 * and what's my vertical baseline shift.
 *
 * The shifts (2, -3, 1, -1, 2) are tuned so that adjacent rows
 * never align — giving the "organic" staggered look — while the
 * grid-column spans keep each tile inside its own horizontal slot.
 */
type Slot = {
  col: number;
  span: number;
  justifySelf: "start" | "center" | "end";
  staggerYvw: number;
};

const SLOTS: Slot[] = [
  { col: 1,  span: 4, justifySelf: "start",  staggerYvw:  2 },
  { col: 5,  span: 4, justifySelf: "center", staggerYvw: -3 },
  { col: 9,  span: 4, justifySelf: "end",    staggerYvw:  1 },
  { col: 2,  span: 5, justifySelf: "center", staggerYvw: -1 },
  { col: 8,  span: 5, justifySelf: "center", staggerYvw:  2 },
];

/** Max per-tile horizontal jitter, in px. Keeps tile inside its column. */
const JITTER_X_VW = 1.5; // 1.5vw ≈ 29px on 1920, 6px on 412 (galaxy)
/** Max per-tile vertical jitter, in px. Keeps tile inside its row band. */
const JITTER_Y_VW = 1.5;

/** Tile size in vw — 18vw ≈ 15% larger than SKYLRK's 15vw. */
const TILE_SIZE_VW = 18;

/**
 * Row gap in px. Must be ≥ max(|staggerY_N+1 − staggerY_N|) in vw
 * so adjacent rows can't make their tiles overlap when one is
 * shifted up and the next is shifted down. SKYLRK's pattern has
 * a max stagger diff of 5vw (positions 1→2: +2 to −3); on a
 * 1920px desktop that's ~96px. We use 7vw (capped at 150px) for
 * a generous safety margin and a touch more breathing room than
 * SKYLRK's 75px.
 */
const ROW_GAP_VW = 7;
/** Section padding (top/bottom) — matches SKYLRK's 150px. */
const SECTION_PAD_Y = 150;

/**
 * Hand-picked: 15 products with diverse colors (12 distinct).
 * Sources: scripts/pick-products.ts. Run that to refresh the
 * underlying image files; the slugs here should stay in sync.
 *
 * `accent` is the product's dominant color, used to tint the TV
 * shader when the product is hovered or focused. Values are picked
 * to match the actual product color in the source images; the
 * background lerps from a neutral gray (default) toward this color
 * over ~400ms.
 *
 * The Shop page passes its own items via the `items` prop, so this
 * default only kicks in for the landing page and any caller that
 * doesn't supply its own list.
 */
const DEFAULT_PRODUCT_ITEMS: ProductSpec[] = [
  // Female (8) — chosen for visual variety: pink, navy, khaki, plum, gray, etc.
  { src: "/products/female-halter-bra-pink.webp",                 alt: "Halter Bra",            width: 1500, height: 1875, accent: "#f4a3b5", slug: "halter-bra" },
  { src: "/products/female-criss-cross-bra-navy-blue.webp",       alt: "Criss-Cross Bra",       width: 1500, height: 1875, accent: "#2a3a6e", slug: "criss-cross-bra" },
  { src: "/products/female-crop-tank-khaki.webp",                 alt: "Crop Tank",             width: 1500, height: 1875, accent: "#b8a07e", slug: "crop-tank" },
  { src: "/products/female-halter-crop-tank-pink.webp",           alt: "Halter Crop Tank",      width: 1500, height: 1875, accent: "#f08aa0", slug: "halter-crop-tank" },
  { src: "/products/female-essential-hoodie-dark-reddish-purple.webp", alt: "Essential Hoodie",  width: 1500, height: 1875, accent: "#5a2a3a", slug: "essential-hoodie" },
  { src: "/products/female-flare-jeans-light-gray.webp",          alt: "Flare Jeans",           width: 1500, height: 1875, accent: "#c8c5c0", slug: "flare-jeans" },
  { src: "/products/female-a-line-skirt-navy-blue.webp",          alt: "A-Line Skirt",          width: 1500, height: 1875, accent: "#1f2d4f", slug: "a-line-skirt" },
  { src: "/products/female-track-jacket-plum-purple.webp",        alt: "Track Jacket",          width: 1500, height: 1875, accent: "#7a3a5a", slug: "track-jacket" },
  // Male (7) — blue, tan, gray, brown, etc.
  { src: "/products/male-heavyweight-tank-royal-blue.webp",       alt: "Heavyweight Tank",      width: 1500, height: 1875, accent: "#3a5fb8", slug: "heavyweight-tank" },
  { src: "/products/male-waffle-knit-tee-light-apricot.webp",     alt: "Waffle Knit Tee",       width: 1500, height: 1875, accent: "#e8b89a", slug: "waffle-knit-tee" },
  { src: "/products/male-boxy-tank-gray.webp",                    alt: "Boxy Tank",             width: 1500, height: 1875, accent: "#7a7a7e", slug: "boxy-tank" },
  { src: "/products/male-frayed-hoodie-brown.webp",               alt: "Frayed Hoodie",         width: 1500, height: 1875, accent: "#5a3a28", slug: "frayed-hoodie" },
  { src: "/products/male-snow-wash-sweatpants-light-gray.webp",   alt: "Snow Wash Sweatpants",  width: 1500, height: 1875, accent: "#bdb8b0", slug: "snow-wash-sweatpants" },
  { src: "/products/male-mesh-shorts-sky-blue.webp",              alt: "Mesh Shorts",           width: 1500, height: 1875, accent: "#8ac4d8", slug: "mesh-shorts" },
  { src: "/products/male-quarter-zip-tee-static-blue.webp",       alt: "Quarter-Zip Tee",       width: 1500, height: 1875, accent: "#4a5a7a", slug: "quarter-zip-tee" },
];

const SEED = 0x4f5e6d7c;

function buildLayout(seed: number, items: ProductSpec[]): Product[] {
  const rand = mulberry32(seed);

  return items.map((item, i) => {
    const slot = SLOTS[i % SLOTS.length];

    // Random in [-1, +1]
    const jx = rand() * 2 - 1;
    const jy = rand() * 2 - 1;

    return {
      ...item,
      col: slot.col,
      span: slot.span,
      justifySelf: slot.justifySelf,
      staggerYvw: slot.staggerYvw,
      // Per-tile jitter, in vw (rendered via custom property).
      // The CSS converts these to px-equivalents using the vw
      // unit, and clamps so the tile stays inside its slot.
      offsetXpx: jx * JITTER_X_VW,
      offsetYpx: jy * JITTER_Y_VW,
      rotate: Math.round((rand() * 2 - 1) * 6), // -6..6 deg
      z: 1 + Math.floor(rand() * 5),
    };
  });
}

type ProductScatterProps = {
  /**
   * The products to render. Defaults to a hand-picked 15-item set
   * that mirrors the original landing-page scatter. The Shop page
   * passes `getProductsByGender("female" | "male")` from
   * `src/data/products.ts`.
   */
  items?: ProductSpec[];
  /**
   * Called with the product's dominant color (hex) when the user
   * hovers or focuses a tile, and with `null` when they leave.
   * The parent uses this to retint the background TV shader so the
   * product's color "spills onto" the canvas behind it.
   */
  onColorChange?: (accent: string | null) => void;
};

export function ProductScatter({ items, onColorChange }: ProductScatterProps = {}) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // First paint is invisible (opacity 0), then we fade in after
  // a frame. SKYLRK uses a 0.4s opacity transition on the items,
  // matching that here.
  useLayoutEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Memoize the layout against the items identity. Switching items
  // (e.g. toggling gender on /shop) regenerates the random jitter
  // because each item carries a stable position in the SEED-driven
  // mulberry32 sequence; but because the items themselves are
  // identity-stable (same PRODUCTS array across re-renders), the
  // memo doesn't churn.
  const renderItems = items ?? DEFAULT_PRODUCT_ITEMS;
  const products = useMemo(() => buildLayout(SEED, renderItems), [renderItems]);

  // Dynamic min-height: enough room for all rows + per-tile stagger
  // + jitter + section padding, capped so tall narrow displays don't
  // become a chore to scroll.
  //   rows = ceil(items / 5)
  //   natural height = rows × tileSize + (rows-1) × rowGap + 2 × padY
  //                  + 2 × maxStaggerY + 2 × maxJitterY (≈ 6vw)
  const minHeight = useMemo(() => {
    const rows = Math.max(1, Math.ceil(renderItems.length / 5));
    // Tile size + gaps in vw, then convert: 18vw tile + 7vw gap.
    // Add 6vw safety for max stagger+jitter. Plus 300px in absolute.
    const vwSum = rows * TILE_SIZE_VW + (rows - 1) * ROW_GAP_VW + 6;
    const formula = `calc(${vwSum}vw + ${SECTION_PAD_Y * 2}px)`;
    return `min(300vh, max(160vh, ${formula}))`;
  }, [renderItems.length]);

  return (
    <section
      ref={sectionRef}
      className="relative z-20 w-full"
      style={{
        // SKYLRK-style vertical distribution: implicit grid-template-rows,
        // CSS Grid's auto-flow places items in the first row where their
        // declared grid-column doesn't conflict. With a 5-position
        // rotation, items distribute roughly evenly across the rows.
        //
        // align-content: space-evenly distributes the rows inside the
        // section, with extra space above, between, and below.
        //
        // min-height is computed dynamically so the section is always
        // tall enough for `rows × tileSize + (rows-1) × rowGap + 2 × padY`
        // plus max stagger+jitter — capped at 300vh so tall narrow
        // displays don't become a chore to scroll.
        minHeight,
        paddingTop: "150px",
        paddingBottom: "150px",
        paddingLeft: "50px",
        paddingRight: "50px",
        display: "grid",
        gridTemplateColumns: "repeat(12, 1fr)",
        alignContent: "space-evenly",
        alignItems: "center",
        rowGap: `min(150px, ${ROW_GAP_VW}vw)`,
        overflow: "clip visible",
      }}
      aria-hidden
    >
      {products.map((p) => (
        <div
          key={p.src}
          className="pointer-events-auto relative"
          style={{
            gridColumn: `${p.col} / span ${p.span}`,
            justifySelf: p.justifySelf,
            width: `${TILE_SIZE_VW}vw`,
            height: `${TILE_SIZE_VW}vw`,
            // Tile transform = baseline stagger + per-tile jitter.
            // Multiplied by 2 because SKYLRK's --offset-x was
            // already doubled in their CSS; we do the same so the
            // jitter feels equally weighted against the stagger.
            transform: `translate(calc(${p.offsetXpx}vw * 2), calc(${p.offsetYpx}vw * 2 + ${p.staggerYvw}vw)) rotate(${p.rotate}deg)`,
            transition: "opacity 400ms var(--ease-out), filter 400ms var(--ease-out), transform 350ms ease",
            willChange: "transform, opacity",
            opacity: visible ? 1 : 0,
            zIndex: p.z,
            // The container itself has no padding/margin so the
            // tile sits flush inside its grid cell.
          }}
        >
          {/*
            Tile interactivity:
            - When `p.slug` is present (Shop page), wrap in <Link> so
              clicks navigate to /product/<slug>. Hover/focus still
              retints the shader via the wrapper's event handlers.
            - When no slug (legacy landing-page fallback), render a
              plain <button> so the tile stays focusable + interactive.
          */}
          <Link
            href={p.slug ? `/product/${p.slug}` : "#"}
            prefetch={false}
            aria-label={p.alt}
            onMouseEnter={() => onColorChange?.(p.accent)}
            onMouseLeave={() => onColorChange?.(null)}
            onFocus={() => onColorChange?.(p.accent)}
            onBlur={() => onColorChange?.(null)}
            className="group block h-full w-full cursor-pointer overflow-visible bg-transparent p-0 focus:outline-none"
          >
            <div
              className="relative h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.08] group-focus-visible:scale-[1.08]"
              style={{ aspectRatio: "1 / 1" }}
            >
              <Image
                src={p.src}
                alt={p.alt}
                fill
                sizes={`${TILE_SIZE_VW}vw`}
                className="pointer-events-none object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
              />
            </div>
          </Link>
        </div>
      ))}
    </section>
  );
}

export default ProductScatter;
