import { NavPill } from "@/components/landing/nav-pill";
import { ShopExperience } from "@/components/landing/shop-experience";
import type { ProductSpec } from "@/components/landing/product-scatter";
import { getProductsByGender, type Product } from "@/data/products";
import { notFound } from "next/navigation";

/**
 * Shop page.
 *
 * Route: /shop/[gender] where gender is "female" | "male".
 *
 * Composition (mirror of the landing page, with two changes):
 *   - No <HeroPanel /> — /shop jumps straight into the grid.
 *   - <LandingExperience /> is replaced by <ShopExperience />, which
 *     renders the same shader + scatter but with items filtered to
 *     the route's gender and tiles wrapped in <Link> to the (future)
 *     /product/[slug] detail page.
 *
 * The page is a server component so the URL is the source of truth
 * (no client-side hydration of gender state). The localStorage write
 * happens inside <ShopExperience /> on mount, and the header
 * <GenderPill /> reads it back to highlight the active chip.
 */
type Props = { params: Promise<{ gender: string }> };

/** Map a generated Product → the ProductSpec shape the scatter expects. */
function toProductSpec(p: Product): ProductSpec {
  return {
    src: p.representative.src,
    alt: p.name,
    width: p.representative.width,
    height: p.representative.height,
    accent: p.accent,
    slug: p.slug,
  };
}

export default async function ShopPage({ params }: Props) {
  const { gender } = await params;
  if (gender !== "female" && gender !== "male") {
    notFound();
  }

  // Server-side filter. Order matches the catalog (alphabetical within gender).
  const items = getProductsByGender(gender).map(toProductSpec);

  return (
    <>
      <ShopExperience gender={gender} items={items} />
      <NavPill />
    </>
  );
}

export function generateStaticParams() {
  // Pre-render both gender routes at build time.
  return [{ gender: "female" }, { gender: "male" }];
}