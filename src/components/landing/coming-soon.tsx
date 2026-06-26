"use client";

import { GlassSurface } from "@/components/landing/nav-pill";

/**
 * Generic "Coming soon" placeholder.
 *
 * Used by routes whose content isn't ready yet (IG, future social
 * channels, etc.) so the navbar links stay intentional and the page
 * doesn't 404 or redirect off-site.
 *
 * Visual language matches the rest of the storefront:
 *   - Same Liquid Glass card treatment as ContactCard / ProductDetail.
 *   - Serif display heading + wide-tracked uppercase eyebrow so it
 *     reads as a real page, not a placeholder.
 *   - Optional caption explains what's coming so users don't think
 *     the link is broken.
 */
export function ComingSoon({
  eyebrow,
  title,
  description,
}: {
  /** Short uppercase tag above the title. e.g. "INSTAGRAM" */
  eyebrow: string;
  /** The display title. e.g. "Coming soon" */
  title: string;
  /** Optional supporting copy explaining what's missing. */
  description?: string;
}) {
  return (
    <GlassSurface
      rounded="rounded-[1.75rem]"
      className="w-[min(24rem,calc(100vw-2rem))] px-7 py-9 sm:px-10 sm:py-11"
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <span className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/55">
          {eyebrow}
        </span>
        <h1 className="font-serif text-2xl font-light leading-[1.1] tracking-[-0.01em] text-white sm:text-3xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-[20rem] text-[12px] font-normal leading-[1.55] text-white/60">
            {description}
          </p>
        ) : null}
      </div>
    </GlassSurface>
  );
}
