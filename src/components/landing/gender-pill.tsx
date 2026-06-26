"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { GlassPill } from "@/components/landing/nav-pill";
import type { Gender } from "@/data/products";

/**
 * The gender toggle pill that sits in the header between the left
 * nav pill and the centered logo.
 *
 * Visual treatment:
 *   - Same Liquid Glass surface as the other pills (reuses <GlassPill>)
 *   - Two segmented chips: Women | Men
 *   - Active chip: `bg-white/20`, slightly brighter text
 *   - Inactive chip: transparent, hover → `bg-white/10`
 *
 * Behaviour:
 *   - Clicking a chip navigates to `/shop/<gender>` and writes the
 *     selection to localStorage (so the active state survives a
 *     direct visit to /shop without a gender in the URL, once we
 *     add that fallback route — for now the URL is the source of truth).
 *   - Active state resolution (in priority order):
 *     1. Explicit `forceGender` prop — used by the product detail
 *        page so the pill highlights the gender of the product the
 *        user is viewing (i.e. the gender context they came from
 *        when they clicked in from /shop/<gender>).
 *     2. Current pathname — highlights Women/Men on /shop/<gender>.
 *     3. `DEFAULT_GENDER` (female) — used on the landing page (/)
 *        and on direct visits to other non-shop routes.
 *
 * Hydration safety:
 *   - Active state is computed from `usePathname()` + `forceGender`,
 *     both deterministic on the server. No localStorage read here.
 */

const GENDER_STORAGE_KEY = "obt.shop.gender";

/** Fallback when pathname isn't /shop/<gender> — used for the initial
 *  paint on the landing page (/) and on any non-shop route. */
const DEFAULT_GENDER: Gender = "female";

function activeGenderFromPath(pathname: string | null): Gender {
  if (!pathname) return DEFAULT_GENDER;
  if (pathname.startsWith("/shop/female")) return "female";
  if (pathname.startsWith("/shop/male")) return "male";
  return DEFAULT_GENDER;
}

const SEGMENTS: { label: string; value: Gender; href: string }[] = [
  { label: "Women", value: "female", href: "/shop/female" },
  { label: "Men",   value: "male",   href: "/shop/male" },
];

type GenderPillProps = {
  /**
   * When provided, the pill highlights this gender regardless of the
   * current URL. Used by the product detail page so the active chip
   * reflects the gender of the product being viewed (which is the
   * gender context the user navigated from when they clicked the
   * product tile in /shop/<gender>).
   */
  forceGender?: Gender;
};

export function GenderPill({ forceGender }: GenderPillProps = {}) {
  const pathname = usePathname();
  const active: Gender = forceGender ?? activeGenderFromPath(pathname);
  // `mounted` is only used to know when localStorage is available;
  // the visual state is always derived from pathname + forceGender.
  const [, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClick = (value: Gender) => {
    // Persist for any future code that wants to read it (the page
    // itself also writes, but doing it here gives instant feedback
    // before the navigation completes).
    try {
      window.localStorage.setItem(GENDER_STORAGE_KEY, value);
    } catch {
      // ignore
    }
  };

  return (
    <GlassPill className="p-[5px]">
      <div
        className="flex items-center gap-0.5"
        role="tablist"
        aria-label="Shop gender"
      >
        {SEGMENTS.map((seg) => {
          const isActive = seg.value === active;
          return (
            <Link
              key={seg.value}
              href={seg.href}
              role="tab"
              aria-selected={isActive}
              prefetch={false}
              onClick={() => handleClick(seg.value)}
              className={[
                "inline-flex items-center justify-center",
                "h-6 sm:h-7",
                "px-3 sm:px-3.5",
                "rounded-full",
                "text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.16em]",
                "select-none",
                "transition-colors duration-200",
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white",
              ].join(" ")}
            >
              {seg.label}
            </Link>
          );
        })}
      </div>
    </GlassPill>
  );
}

export default GenderPill;