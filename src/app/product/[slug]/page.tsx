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
      <NavPill />
    </>
  );
}

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.slug }));
}