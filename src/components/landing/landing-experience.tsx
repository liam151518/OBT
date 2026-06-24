"use client";

import { useCallback, useState } from "react";
import { PolishedShader } from "@/components/landing/polished-shader";
import { ProductScatter } from "@/components/landing/product-scatter";

/**
 * Landing experience: shader + product scatter, sharing color state.
 *
 * Owns the single source of truth for which product is currently
 * hovered/focused (so the user can hover anywhere on the page and
 * the shader retints). The shader receives the color as a prop and
 * lerps its uniforms toward it over ~400ms — the retint feels
 * like a smooth light spill rather than a hard cut.
 *
 * Why the bright pole stays white by default and the dark pole
 * gets tinted toward the product's color:
 *  - The shader's mix() between uColorA and uColorB produces most
 *    of its body color from the *dark* pole because the noise
 *    field's average sits below the mix factor's midpoint.
 *  - So tinting only uColorB (the dark pole) gives the strongest
 *    "tinted toward the product" feel without washing out the
 *    contrast structure.
 *  - When nothing is hovered, both poles return to their neutral
 *    values (white / black) so the page reads as the original TV.
 */

const NEUTRAL_A = "#ffffff";
const NEUTRAL_B = "#000000";

export function LandingExperience() {
  const [accent, setAccent] = useState<string | null>(null);

  // useCallback so the prop reference is stable — otherwise
  // ProductScatter's memoized children would re-render on every
  // parent render even when accent hasn't changed.
  const onColorChange = useCallback((next: string | null) => {
    setAccent(next);
  }, []);

  // Pass the hovered color to the shader's dark pole so the noise
  // body tints toward it. Bright pole stays white so highlights
  // still pop.
  const colorB = accent ?? NEUTRAL_B;
  const colorA = NEUTRAL_A;

  return (
    <>
      <div className="fixed inset-0 z-0">
        <PolishedShader colorA={colorA} colorB={colorB} />
      </div>
      <ProductScatter onColorChange={onColorChange} />
    </>
  );
}

export default LandingExperience;
