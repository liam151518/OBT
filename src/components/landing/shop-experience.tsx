"use client";

import { useCallback, useEffect, useState } from "react";
import { PolishedShader } from "@/components/landing/polished-shader";
import { ProductScatter, type ProductSpec } from "@/components/landing/product-scatter";
import type { Gender } from "@/data/products";

/**
 * Shop page experience: shader + gender-filtered product scatter.
 *
 * Mirrors `LandingExperience` (same shader + same color-state pattern)
 * but takes the products list as a prop and writes the gender back
 * to localStorage so the <GenderPill /> in the header can highlight
 * the active chip.
 *
 * Hover retint behaves identically to the landing page: each tile
 * fires its accent on hover/focus, the shader lerps its dark pole
 * toward it over ~400ms, and `null` on leave returns to neutral.
 */

const NEUTRAL_A = "#ffffff";
const NEUTRAL_B = "#000000";

const GENDER_STORAGE_KEY = "obt.shop.gender";

type ShopExperienceProps = {
  /** The gender for this shop route (drives localStorage sync). */
  gender: Gender;
  /** The products to render in the scatter. */
  items: ProductSpec[];
};

export function ShopExperience({ gender, items }: ShopExperienceProps) {
  const [accent, setAccent] = useState<string | null>(null);

  const onColorChange = useCallback((next: string | null) => {
    setAccent(next);
  }, []);

  const colorB = accent ?? NEUTRAL_B;
  const colorA = NEUTRAL_A;

  // Sync gender to localStorage on mount + when route gender changes.
  // Wrapped in try/catch so SSR / private-browsing failures don't crash.
  useEffect(() => {
    try {
      window.localStorage.setItem(GENDER_STORAGE_KEY, gender);
    } catch {
      // ignore — storage may be disabled
    }
  }, [gender]);

  return (
    <>
      <div className="fixed inset-0 z-0">
        <PolishedShader colorA={colorA} colorB={colorB} />
      </div>
      <ProductScatter items={items} onColorChange={onColorChange} />
    </>
  );
}

export default ShopExperience;