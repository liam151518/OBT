import { ShopView } from "@/components/site/shop-view";
import { getAllProducts } from "@/data/products";

type Props = { searchParams: Promise<{ category?: string }> };

export default async function ShopPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const all = getAllProducts();
  const products = category ? all.filter((product) => product.category === category) : all;

  return <ShopView title={category ?? "All products"} products={products} />;
}
