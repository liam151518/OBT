import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/products";

export function productImages(product: Product): string[] {
  const match = product.variants.find(
    (variant) => variant.colorName === product.representative.colorName,
  );
  const images = (match?.images ?? []).filter(Boolean);
  if (images.length > 0) return images;
  return [product.representative.src];
}

export function ProductCard({ product }: { product: Product }) {
  const images = productImages(product);
  const primary = images[0];
  const secondary = images[1];

  return (
    <article>
      <Link href={`/product/${product.slug}`} className="group block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-studio">
          <Image
            src={primary}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className={`object-contain p-6 transition duration-500 ${secondary ? "group-hover:opacity-0" : ""}`}
          />
          {secondary ? (
            <Image
              src={secondary}
              alt=""
              fill
              sizes="(min-width: 1024px) 25vw, 50vw"
              className="object-contain p-6 opacity-0 transition duration-500 group-hover:opacity-100"
            />
          ) : null}
        </div>
        <div className="mt-3 flex gap-1.5">
          {product.variants.slice(0, 6).map((variant) => (
            <span
              key={variant.colorName}
              title={variant.colorName}
              className="h-4 w-4 rounded-full border border-black/10"
              style={{ background: variant.accent }}
            />
          ))}
        </div>
        <h3 className="mt-2 text-[15px] font-medium tracking-tight">{product.name}</h3>
        <p className="text-sm text-ink/55">{product.category}</p>
      </Link>
    </article>
  );
}
