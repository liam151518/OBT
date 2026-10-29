import Link from "next/link";
import type { Product } from "@/data/products";
import { ProductCard } from "@/components/site/product-card";

const FILTERS = [
  { label: "All", href: "/shop" },
  { label: "Women", href: "/shop/female" },
  { label: "Men", href: "/shop/male" },
  { label: "Tees", href: "/shop?category=Tees" },
  { label: "Hoodies", href: "/shop?category=Hoodies%20%26%20Crews" },
  { label: "Leggings", href: "/shop?category=Leggings" },
  { label: "Shorts", href: "/shop?category=Shorts" },
  { label: "Tanks", href: "/shop?category=Tanks" },
];

export function ShopView({
  title,
  products,
}: {
  title: string;
  products: Product[];
}) {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-6">
      <p className="text-xs uppercase tracking-[0.22em] text-ink/50">Collection</p>
      <h1 className="mt-2 font-serif text-5xl tracking-tight">{title}</h1>
      <div className="mt-6 flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((filter) => (
          <Link
            key={filter.href}
            href={filter.href}
            className="shrink-0 rounded-full border border-black/10 px-4 py-2 text-sm hover:bg-bone"
          >
            {filter.label}
          </Link>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink/50">{products.length} pieces</p>
      <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.slug} product={product} />
        ))}
      </div>
    </main>
  );
}
