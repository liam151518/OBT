import { NavPill } from "@/components/landing/nav-pill";
import { ProductDetail } from "@/components/landing/product-detail";
import { getAllProducts, getProductBySlug } from "@/data/products";
import { notFound } from "next/navigation";

/**
 * Product detail page.
 *
 * Server component: resolves the slug → Product, renders the
 * client-side <ProductDetail /> (gallery, variant switcher, size
 * picker, CTA) plus the global header.
 *
 * All 46 known products are pre-rendered via `generateStaticParams`
 * so direct visits work and navigations are instant.
 */
type Props = { params: Promise<{ slug: string }> };

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) {
    notFound();
  }

  return (
    <>
      <ProductDetail product={product} />
      {/* Pass the product's gender to the nav pill so the Women/Men
          toggle stays highlighted on the chip that matches the
          gender context the user navigated from (e.g. they came from
          /shop/male → product.gender is "male" → "Men" stays active).
          Clicking the active chip takes them back to /shop/<gender>,
          clicking the other chip switches gender context. */}
      <NavPill forceGender={product.gender} />
    </>
  );
}

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.slug }));
}