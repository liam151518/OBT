import { ProductView } from "@/components/site/product-view";
import { getAllProducts, getProductBySlug } from "@/data/products";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ slug: string }> };

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  return <ProductView product={product} />;
}

export function generateStaticParams() {
  return getAllProducts().map((product) => ({ slug: product.slug }));
}
