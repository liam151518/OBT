"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import Image from "next/image";
import { useMutation, useQuery } from "convex/react";
import { PolishedShader } from "@/components/landing/polished-shader";
import { GlassPill, GlassSurface } from "@/components/landing/nav-pill";
import type { Product, ProductVariant } from "@/data/products";
import { sizeChartFor } from "@/data/sizing";
import { api } from "../../../convex/_generated/api";
import { useCartSessionId } from "@/lib/cart-session";

/**
 * The product detail page — single-screen experience.
 *
 * Layout intent (what the user asked for):
 *   - The PAGE itself does not scroll. Locked at 100vh.
 *   - Only the image stack scrolls/swipes (vertically) between the
 *     variant's views (front + back).
 *   - Small thumbnail strip pinned bottom-left shows the current
 *     variant's available views; click one to jump straight to it.
 *   - Compact details card pinned bottom-right: title, color row
 *     (dots only — the color name shows on hover), size chips, the
 *     expandable size guide, and the Buy now CTA. The CTA adds the
 *     current selection to the Convex cart (cart:add mutation).
 *     There is NO link out to Tapstitch — Tapstitch is our supplier
 *     for fulfillment only and must never appear on the storefront.
 *
 * Shader retint tracks the active variant's accent.
 */

const NEUTRAL_A = "#ffffff";
const NEUTRAL_B = "#000000";

type Props = { product: Product };

function usableVariants(p: Product): ProductVariant[] {
  return p.variants.filter((v) => v.images.length > 0);
}

export function ProductDetail({ product }: Props) {
  const initialVariant = useMemo<ProductVariant>(() => {
    const usable = usableVariants(product);
    const rep = product.variants.find(
      (v) => v.colorName === product.representative.colorName,
    );
    if (rep && rep.images.length) return rep;
    if (usable[0]) return usable[0];
    return product.variants[0];
  }, [product]);

  // Size chart for THIS product — category-aware (tops / bottoms /
  // bras / bodysuits) and filtered to only the sizes this product
  // offers. Re-derives only when product changes.
  const sizeChart = useMemo(
    () => sizeChartFor(product.category, product.sizes),
    [product.category, product.sizes],
  );

  const [activeColor, setActiveColor] = useState<string>(initialVariant.colorName);
  const [activeSize, setActiveSize] = useState<string | null>(null);
  // Size guide disclosure. Default collapsed — the user sees just a
  // small "Size guide" link under the size chips; clicking it expands
  // a panel with the size chart. Clicking again (or anywhere outside)
  // collapses it.
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  // ---- Cart wire-up ----------------------------------------------------
  // `useCartSessionId` returns null on the server + first client paint
  // (to avoid hydration mismatches) and the persisted id on subsequent
  // renders. The CTA stays disabled until the id is available.
  const cartSessionId = useCartSessionId();
  const addToCart = useMutation(api.cart.add);
  // Look up the Convex product id for this product's slug so we can
  // call cart.add with a real Convex Id<"products">. Returns null
  // until Convex has the row (or if the seed hasn't been run yet).
  const convexProduct = useQuery(api.products.getBySlug, { slug: product.slug });
  const convexProductId = convexProduct?._id ?? null;
  // Local "just added" flash state so the button can give feedback
  // ("Added ✓" for ~1.5s) after the mutation resolves.
  const [justAdded, setJustAdded] = useState(false);

  const activeVariant = useMemo<ProductVariant>(
    () => product.variants.find((v) => v.colorName === activeColor) ?? initialVariant,
    [product.variants, activeColor, initialVariant],
  );

  const activeImages = useMemo<string[]>(() => {
    if (activeVariant.images.length) return activeVariant.images;
    return [product.representative.src];
  }, [activeVariant.images, product.representative.src]);

  // Shader retint tracks the variant, not the image.
  const heroAccent = activeVariant.accent ?? product.accent;
  const colorB = heroAccent || NEUTRAL_B;

  // ---- Image stack: transform-based slider ------------------------------
  // Layout: a vertical column of N rows. Each row is one full
  // viewport tall, stacked one below the next (image 0 at top, image
  // 1 below it, etc). The wrapper element has explicit height
  // N × 100vh and applies a single transform `translate3d(0, Y, 0)`
  // that shifts the entire column. Translating by `-index × rowHeight`
  // reveals image at index `index` because the rows are physically
  // stacked one below the next.
  //
  // Drag: pointermove writes the drag delta directly to
  // `el.style.transform` (no React re-render per frame).
  //
  // Release: snap to the nearest image. Direction is by the sign of
  // the drag offset:
  //   dragPx > 0 (drag down) → previous image (target - 1)
  //   dragPx < 0 (drag up)   → next image (target + 1)
  // We require |dragPx| > 10% of rowHeight to commit; otherwise we
  // snap back to the current image.
  //
  // The rowHeight is captured at pointerdown (not read live from
  // window.innerHeight every frame) so a mobile browser showing/
  // hiding its URL bar mid-drag doesn't shift the math.
  //
  // Touch input flows through the same pointer handlers because
  // modern browsers unify touch + mouse + pen under Pointer Events.
  const stackRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startY: number;
    rowHeight: number;
    moved: boolean;
  } | null>(null);
  const dragOffsetRef = useRef(0); // current pixel offset from snapped position
  // Live (non-React) state we mutate during drag for smoothness.
  const liveIndexRef = useRef(0);

  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Apply the wrapper transform for a given target index + drag
  // offset. The two paths (drag vs. snap) need different transition
  // handling:
  //   - During drag we want NO transition (transform tracks pointer
  //     1:1).
  //   - During snap we want a 320ms cubic-bezier transition. We
  //     set the transition value first, then force a reflow with
  //     `void el.offsetHeight`, then set the new transform — that
  //     order makes the browser commit the transition value before
  //     the transform change so the new transform animates FROM the
  //     previous transform value (instead of both writes batching
  //     into one frame where the transition silently doesn't fire).
  const applyTransform = useCallback((index: number, dragPx: number) => {
    const el = stackRef.current;
    if (!el) return;
    const s = dragStateRef.current;
    const rowHeight = s?.rowHeight ?? window.innerHeight;
    const y = -index * rowHeight + dragPx;
    const isDragging = s !== null;
    if (isDragging) {
      el.style.transition = "none";
      el.style.transform = `translate3d(0, ${y}px, 0)`;
    } else {
      el.style.transition = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";
      void el.offsetHeight;
      el.style.transform = `translate3d(0, ${y}px, 0)`;
    }
    liveIndexRef.current = index;
    dragOffsetRef.current = dragPx;
  }, []);

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = stackRef.current;
    if (!el) return;
    dragStateRef.current = {
      pointerId: e.pointerId,
      startY: e.clientY,
      rowHeight: window.innerHeight,
      moved: false,
    };
    el.setPointerCapture(e.pointerId);
    // Cancel any in-flight snap animation so the drag feels direct.
    el.style.transition = "none";
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const s = dragStateRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const el = stackRef.current;
    if (!el) return;
    const deltaY = e.clientY - s.startY;
    if (Math.abs(deltaY) > 3) s.moved = true;
    applyTransform(liveIndexRef.current, deltaY);
  }, [applyTransform]);

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const s = dragStateRef.current;
    if (!s || s.pointerId !== e.pointerId) return;
    const el = stackRef.current;
    if (el) {
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        // pointer already released
      }
    }
    // CRITICAL: null out the drag state BEFORE calling applyTransform
    // so the snap branch runs (transition fires, wrapper animates to
    // the new index). Keep the captured rowHeight around via the
    // closure so we use the same rowHeight as the drag used.
    const rowHeight = s.rowHeight;
    dragStateRef.current = null;

    if (!el) return;

    // Decide where to snap — purely distance-based, using the
    // rowHeight that was captured when the drag started.
    const dragPx = dragOffsetRef.current;
    const threshold = rowHeight * 0.1;
    const current = liveIndexRef.current;
    const last = activeImages.length - 1;
    let target = current;
    if (Math.abs(dragPx) > threshold) {
      // Direction by drag sign:
      //   dragPx > 0  → user dragged DOWN → reveal image above → -1
      //   dragPx < 0  → user dragged UP   → reveal image below → +1
      if (dragPx > 0) target = Math.max(0, current - 1);
      else target = Math.min(last, current + 1);
    }
    // Commit the snap. applyTransform with a null dragState goes
    // into the snap branch and animates via the CSS transition.
    applyTransform(target, 0);
    setActiveImageIndex(target);
  }, [activeImages.length, applyTransform]);

  // Wheel events drive the same transform-based motion. We don't
  // let the browser scroll the page — the page is locked anyway.
  const wheelAccumRef = useRef(0);
  const onWheel = useCallback((e: ReactWheelEvent<HTMLDivElement>) => {
    const el = stackRef.current;
    if (!el) return;
    e.preventDefault();
    wheelAccumRef.current += e.deltaY;
    // 1 viewport height of accumulated wheel = advance one image.
    const h = window.innerHeight;
    if (Math.abs(wheelAccumRef.current) >= h * 0.2) {
      const dir = wheelAccumRef.current > 0 ? -1 : 1;
      const target = Math.min(
        activeImages.length - 1,
        Math.max(0, liveIndexRef.current + dir),
      );
      applyTransform(target, 0);
      setActiveImageIndex(target);
      wheelAccumRef.current = 0;
    }
  }, [activeImages.length, applyTransform]);

  const onSelectStart = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.moved) e.preventDefault();
  }, []);

  const onPickColor = useCallback((colorName: string) => {
    setActiveColor(colorName);
    // Snap back to the front view (image 0) of the new color.
    requestAnimationFrame(() => {
      applyTransform(0, 0);
      setActiveImageIndex(0);
    });
  }, [applyTransform]);

  const onPickSize = useCallback((size: string) => {
    setActiveSize((prev) => (prev === size ? null : size));
  }, []);

  // Add the current selection to the Convex cart. Requires a size
  // (we don't sell "one size fits all" yet) and the Convex product id
  // (which depends on the seed having been run). Disables itself until
  // the cart session id is hydrated from localStorage.
  const onAddToCart = useCallback(async () => {
    if (!cartSessionId) return;
    if (!activeSize) return;
    if (!convexProductId) return;
    try {
      await addToCart({
        sessionId: cartSessionId,
        productId: convexProductId,
        colorName: activeVariant.colorName,
        size: activeSize,
        quantity: 1,
      });
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1500);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[cart] add failed", err);
    }
  }, [cartSessionId, activeSize, convexProductId, activeVariant.colorName, addToCart]);

  // When the variant changes (activeImages swaps out), make sure the
  // slider snaps to image 0 with no leftover drag offset.
  useEffect(() => {
    applyTransform(0, 0);
    setActiveImageIndex(0);
    wheelAccumRef.current = 0;
  }, [activeColor, applyTransform]);

  return (
    <div
      className="no-page-scroll relative h-screen w-screen overflow-hidden"
      // `touch-action: none` on the page wrapper ensures touch events
      // never trigger browser-level panning/scrolling. The image
      // stack below handles its own drag via Pointer Events.
      style={{ touchAction: "none" }}
    >
      <div className="fixed inset-0 z-0">
        <PolishedShader colorA={NEUTRAL_A} colorB={colorB} />
      </div>

      {/* Image slider — full viewport, transform-driven. The wrapper
          is a vertical column with explicit height = N × 100vh (N =
          number of images for the active variant). Each image is a
          full-height row stacked one below the next (image 0 at top,
          image 1 below it, etc). We translate the wrapper by
          -index × 100vh to snap to a specific image. During drag we
          add a pixel delta on top of the snap offset so the user
          SEES the image move with their finger. No scroll-snap
          container, no card chrome — the product image floats freely
          against the shader. The fixed UI overlays in the corners
          (thumbnails bottom-left, card bottom-right) sit above this
          on higher z-indexes. */}
      <section
        aria-label={`${product.name} images`}
        className="fixed inset-0 z-10 overflow-hidden"
      >
        <div
          ref={stackRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onWheel={onWheel}
          onMouseDown={onSelectStart}
          // `touch-action: none` so touch goes through our pointer
          // handlers. We also set the wrapper's height EXPLICITLY to
          // N × 100vh so the absolute-positioned element always
          // covers all rows regardless of how the inner flex column
          // computes its own height (which can vary across browsers
          // when the flex container has an explicit `h-screen` but
          // its children also try to be `h-screen` with
          // `flex-shrink: 0`).
          style={{
            touchAction: "none",
            willChange: "transform",
            height: `${activeImages.length * 100}vh`,
          } as CSSProperties}
          className="image-stack absolute inset-x-0 top-0 cursor-grab active:cursor-grabbing"
        >
          <div className="flex h-full w-full flex-col">
            {activeImages.map((src, i) => (
              <div
                key={`${activeColor}-${src}`}
                className="relative flex h-screen w-full shrink-0 items-center justify-center"
                style={
                  {
                    userSelect: "none",
                    WebkitUserSelect: "none",
                    pointerEvents: "none",
                  } as CSSProperties
                }
              >
                <div
                  className="image-frame relative aspect-square"
                  style={
                    {
                      width: "min(70vh, 70vw)",
                      height: "min(70vh, 70vw)",
                    } as CSSProperties
                  }
                >
                  <Image
                    src={src}
                    alt={`${product.name} — ${activeVariant.colorName} (image ${i + 1} of ${activeImages.length})`}
                    fill
                    priority={i === 0}
                    sizes="(min-width: 768px) 70vh, 90vw"
                    className="select-none object-contain"
                    draggable={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom-left thumbnail strip — preview of available views for
          the current variant. Click any thumb to jump straight to it.
          Only rendered when there are multiple views. */}
      {activeImages.length > 1 && (
        <div className="pointer-events-none fixed bottom-6 left-6 z-30 flex flex-col gap-2 sm:bottom-8 sm:left-8">
          <GlassPill
            className="pointer-events-auto px-2.5 py-2"
          >
            <ul
              aria-label={`${activeVariant.colorName} views`}
              className="flex gap-2"
            >
              {activeImages.map((src, i) => {
                const isActive = i === activeImageIndex;
                return (
                  <li key={src}>
                    <GlassPill
                      className={[
                        "h-12 w-12 cursor-pointer justify-center p-0 transition-transform duration-200 sm:h-14 sm:w-14",
                        isActive
                          ? "scale-[1.04] ring-2 ring-white/80"
                          : "hover:scale-[1.04]",
                      ].join(" ")}
                      style={{ padding: 0 }}
                    >
                      <button
                        type="button"
                        aria-label={`Show view ${i + 1} of ${activeImages.length}`}
                        aria-pressed={isActive}
                        onClick={() => {
                          // Snap directly to image `i`. applyTransform
                          // is the same routine used by drag-release,
                          // so the visual motion matches.
                          applyTransform(i, 0);
                          setActiveImageIndex(i);
                        }}
                        className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full"
                      >
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                          draggable={false}
                        />
                      </button>
                    </GlassPill>
                  </li>
                );
              })}
            </ul>
          </GlassPill>
        </div>
      )}

      {/* Bottom-right compact details card. */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-30 sm:bottom-8 sm:right-8">
        <div className="pointer-events-auto max-h-[calc(100vh-3rem)] w-[min(20rem,calc(100vw-3rem))] overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <GlassSurface className="p-5">
            {/* Title */}
            <div className="mb-4">
              <h1 className="font-serif text-2xl font-semibold leading-[1.05] tracking-tight text-white sm:text-3xl">
                {product.name}
              </h1>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white/50">
                {product.category} · {product.variantCount} color
                {product.variantCount === 1 ? "" : "s"}
              </p>
            </div>

            {/* Color — dots only by default; the color name shows on
                hover via opacity-0 → group-hover:opacity-100. */}
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                Color
              </p>
              <ul className="flex flex-wrap gap-2">
                {product.variants.map((v) => {
                  const isActive = v.colorName === activeColor;
                  const usable = v.images.length > 0;
                  return (
                    <li key={v.colorName} className="group relative">
                      <GlassPill
                        className={[
                          "transition-transform duration-200",
                          isActive
                            ? "scale-[1.05] ring-2 ring-white/80"
                            : "hover:scale-[1.05]",
                          usable
                            ? "cursor-pointer"
                            : "cursor-not-allowed opacity-40",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          aria-label={`Select ${v.colorName}`}
                          aria-pressed={isActive}
                          disabled={!usable}
                          onClick={() => usable && onPickColor(v.colorName)}
                          className="flex h-7 w-7 items-center justify-center disabled:cursor-not-allowed"
                        >
                          <span
                            aria-hidden
                            className="block h-3.5 w-3.5 rounded-full"
                            style={{
                              backgroundColor: v.accent,
                              boxShadow:
                                "inset 0 0 0 1px rgba(255,255,255,0.25), 0 1px 2px rgba(0,0,0,0.4)",
                            }}
                          />
                        </button>
                      </GlassPill>
                      {/* Color name tooltip — shown on hover, hidden
                          when not hovered. Positioned above the chip. */}
                      <span
                        aria-hidden
                        className={[
                          "pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 whitespace-nowrap",
                          "rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-white",
                          "opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                        ].join(" ")}
                      >
                        {v.colorName}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Size */}
            <div className="mb-5">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                  Size
                </p>
                {/* Size guide disclosure trigger. Clicking toggles
                    `sizeGuideOpen` which animates the chart panel
                    below into view. The chevron rotates to reflect
                    the open state. */}
                <button
                  type="button"
                  aria-expanded={sizeGuideOpen}
                  aria-controls="size-guide-panel"
                  onClick={() => setSizeGuideOpen((v) => !v)}
                  className={[
                    "group inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors duration-150",
                    sizeGuideOpen ? "text-white" : "text-white/55 hover:text-white/85",
                  ].join(" ")}
                >
                  Size guide
                  <svg
                    aria-hidden
                    viewBox="0 0 12 12"
                    className={[
                      "h-2.5 w-2.5 transition-transform duration-200",
                      sizeGuideOpen ? "rotate-180" : "rotate-0",
                    ].join(" ")}
                  >
                    <path
                      d="M2 4.5l4 3.5 4-3.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <ul className="flex flex-wrap gap-1.5">
                {product.sizes.map((s) => {
                  const isActive = activeSize === s;
                  return (
                    <li key={s}>
                      <GlassPill
                        className={[
                          "cursor-pointer transition-transform duration-200",
                          isActive
                            ? "scale-[1.04] ring-2 ring-white/80"
                            : "hover:scale-[1.04]",
                        ].join(" ")}
                      >
                        <button
                          type="button"
                          aria-label={`Select size ${s}`}
                          aria-pressed={isActive}
                          onClick={() => onPickSize(s)}
                          className="flex h-7 min-w-[2rem] items-center justify-center px-2 text-[11px] font-semibold uppercase tracking-wide text-white"
                        >
                          {s}
                        </button>
                      </GlassPill>
                    </li>
                  );
                })}
              </ul>

              {/* Size guide panel — collapsed by default. Uses a max-
                  height transition for a smooth open/close (the panel
                  has no fixed height so this is the standard
                  auto-height trick). overflow-hidden + opacity give
                  a polished feel. */}
              <div
                id="size-guide-panel"
                aria-hidden={!sizeGuideOpen}
                className={[
                  "grid transition-all duration-300 ease-out",
                  sizeGuideOpen
                    ? "mt-3 grid-rows-[1fr] opacity-100"
                    : "mt-0 grid-rows-[0fr] opacity-0",
                ].join(" ")}
                style={{ transitionProperty: "grid-template-rows, opacity, margin-top" }}
              >
                <div className="overflow-hidden">
                  <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                      {sizeChart.heading}
                    </p>
                    <p className="mb-3 text-[11px] leading-relaxed text-white/65">
                      {sizeChart.intro}
                    </p>
                    {/* Compact size chart — columns + rows are
                        category-specific (e.g. "Band / Cup" for bras,
                        "Waist / Hip" for bottoms, "Bust / Waist / Hip"
                        for bodysuits) and only the sizes this product
                        offers are shown. */}
                    <table className="w-full text-left text-[10px] text-white/65">
                      <thead>
                        <tr className="border-b border-white/10 text-[9px] uppercase tracking-[0.16em] text-white/45">
                          <th className="py-1.5 pr-2 font-medium">Size</th>
                          {sizeChart.columns.map((col, i) => (
                            <th
                              key={col}
                              className={[
                                "py-1.5 font-medium",
                                i === 0 ? "px-2" : "",
                                i === sizeChart.columns.length - 1 ? "pl-2" : "px-2",
                              ].join(" ")}
                            >
                              {col}
                            </th>
                          ))}
                          <th className="py-1.5 pl-2 font-medium">Fit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {sizeChart.rows.map((row) => (
                          <tr key={row.size}>
                            <td className="py-1.5 pr-2 font-semibold text-white/85">
                              {row.size}
                            </td>
                            {row.measurements.map((m, i) => (
                              <td
                                key={m.label}
                                className={[
                                  "py-1.5",
                                  i === 0 ? "px-2" : "",
                                  i === row.measurements.length - 1 ? "pl-2" : "px-2",
                                ].join(" ")}
                              >
                                {m.range}
                              </td>
                            ))}
                            <td className="py-1.5 pl-2">{row.fit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="mt-3 text-[10px] leading-relaxed text-white/45">
                      {sizeChart.note}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Buy now CTA — primary action adds the current selection
                to the Convex cart. Disabled until both a size is picked
                AND the cart session id has hydrated AND the Convex
                product lookup has resolved (depends on the seed having
                been run). Tapstitch is intentionally NOT exposed here —
                they're our fulfillment supplier, not part of the
                storefront's checkout surface. */}
            <GlassPill
              className={[
                "w-full justify-center transition-transform duration-200",
                cartSessionId && activeSize && convexProductId && !justAdded
                  ? "cursor-pointer hover:scale-[1.01]"
                  : "cursor-not-allowed opacity-50",
              ].join(" ")}
            >
              <button
                type="button"
                onClick={onAddToCart}
                disabled={!cartSessionId || !activeSize || !convexProductId || justAdded}
                aria-label={justAdded ? "Added to bag" : "Add to bag"}
                className="block w-full px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-white"
              >
                {justAdded ? "Added ✓" : "Buy now"}
              </button>
            </GlassPill>
          </GlassSurface>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;