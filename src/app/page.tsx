import { NavPill } from "@/components/landing/nav-pill";
import { HeroPanel } from "@/components/landing/hero-panel";
import { LandingExperience } from "@/components/landing/landing-experience";

/**
 * Page layout, top to bottom in the document flow:
 *
 *   ┌────────────────────────────────┐
 *   │   <HeroPanel />                │  ← 100vh section, placeholder
 *   │   (empty — shader shows        │     for whatever replaces the
 *   │    through it)                 │     previous hero video
 *   ├────────────────────────────────┤
 *   │   <ProductScatter />           │  ← SKYLRK-style 12-col grid
 *   │   (15 products, no overlap,    │     with 5-position stagger,
 *   │    hover retints the shader)   │     hover retints the shader
 *   └────────────────────────────────┘
 *
 * Both the shader and the product scatter live inside
 * <LandingExperience /> so they can share the hovered-color state
 * (the shader retints to match whichever product the user points
 * at).
 *
 * Z-stack (back to front):
 *   z  0  PolishedShader             — fixed inset-0, always behind
 *   z 20  ProductScatter              — in flow, beneath the hero panel
 *   z 30  HeroPanel                   — in flow, scrolls up and away
 *   z 40  NavPill                     — fixed, always on top
 *
 * Scroll behavior: scrolling past 100vh fully reveals the products.
 * The shader stays glued to the viewport the whole time and is
 * visible behind both the hero placeholder and the product grid.
 */
export default function HomePage() {
  return (
    <>
      <LandingExperience />
      <HeroPanel />
      <NavPill />
    </>
  );
}
