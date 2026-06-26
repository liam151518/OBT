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
import { PolishedShader } from "@/components/landing/polished-shader";
import { GlassPill, GlassSurface } from "@/components/landing/nav-pill";
import type { Product, ProductVariant } from "@/data/products";

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
 *     (dots only — the color name shows on hover), size chips, and
 *     the Buy now CTA. Nothing more — keep it small and out of the
 *     way of the product.
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

  const [activeColor, setActiveColor] = useState<string>(initialVariant.colorName);
  const [activeSize, setActiveSize] = useState<string | null>(null);

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
  // The user must SEE the current image move as they drag and the
  // next image come in — that's not what a CSS scroll-snap container
  // gives you (scroll-snap snaps hard to the next slide and the user
  // doesn't feel like they're dragging the image).
  //
  // Layout: a vertical flex column of N full-viewport rows. The
  // wrapper applies a single transform `translate3d(0, Ypx, 0)` that
  // shifts the entire column. Translating by `-index * 100vh` reveals
  // image at index `index` because the rows are physically stacked
  // one below the next.
  //
  // Drag: pointermove writes the drag delta directly to
  // `el.style.transform` (no React re-render per frame).
  //
  // Release: snap to the nearest image. Two heuristics — distance
  // OR velocity — but the simpler one is just distance. We snap
  // toward the direction the user dragged: positive dragPx (down)
  // → previous image; negative dragPx (up) → next image.
  //
  // Touch input flows through the same pointer handlers because
  // modern browsers unify touch + mouse + pen under Pointer Events.
  const stackRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    startY: number;
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
  //     set the new transition value, force a reflow with
  //     `void el.offsetHeight`, then set the new transform — that
  //     order makes the browser commit the transition value first
  //     so the transform change animates from the previous value
  //     instead of batching both into one commit (where the
  //     transition silently doesn't fire).
  const applyTransform = useCallback((index: number, dragPx: number) => {
    const el = stackRef.current;
    if (!el) return;
    const rowHeight = window.innerHeight;
    const y = -index * rowHeight + dragPx;
    const isDragging = dragStateRef.current !== null;
    if (isDragging) {
      el.style.transition = "none";
      el.style.transform = `translate3d(0, ${y}px, 0)`;
    } else {
      el.style.transition = "transform 320ms cubic-bezier(0.22, 1, 0.36, 1)";
      void el.offsetHeight; // commit transition before transform
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
    dragStateRef.current = null;

    if (!el) return;
    const h = window.innerHeight;
    if (h <= 0) return;

    // Decide where to snap — purely distance-based, no velocity
    // tracking. The user already saw the image move with their
    // finger during drag, so 10% of viewport is enough of an
    // "advance" gesture to commit to the next/previous slide.
    const dragPx = dragOffsetRef.current;
    const threshold = h * 0.1;
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
    // Commit the snap. applyTransform without an active drag will
    // animate via the CSS transition.
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
          is a vertical column where each image is a full-height row
          stacked one below the next (image 0 at top, image 1 below
          it, etc). We translate the wrapper by -index * 100% to snap
          to a specific image. During drag we add a pixel delta on top
          of the snap offset so the user SEES the image move with
          their finger. No scroll-snap container, no card chrome —
          the product image floats freely against the shader. The
          fixed UI overlays in the corners (thumbnails bottom-left,
          card bottom-right) sit above this on higher z-indexes. */}
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
          // handlers (otherwise the browser would try to pan the
          // page — which is locked anyway, but this also disables
          // browser-level scroll inertia that fights the drag).
          style={{ touchAction: "none", willChange: "transform" }}
          className="image-stack absolute inset-x-0 top-0 cursor-grab active:cursor-grabbing"
          // The wrapper is `height: ${total} * 100vh` so the vertical
          // flex column inside lays out each image at its own viewport
          // height, one below the next. translateY of -index*100vh
          // reveals image index.
        >
          <div className="flex h-screen w-full flex-col">
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
        <div className="pointer-events-auto w-[min(20rem,calc(100vw-3rem))]">
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
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-white/55">
                Size
              </p>
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
            </div>

            {/* Buy now CTA */}
            <GlassPill className="w-full cursor-pointer justify-center transition-transform duration-200 hover:scale-[1.01]">
              <a
                href={product.tapstitchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.22em] text-white"
              >
                Buy now
              </a>
            </GlassPill>
          </GlassSurface>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;