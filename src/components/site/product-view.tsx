"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Product } from "@/data/products";
import { getAllProducts } from "@/data/products";
import { sizeChartFor } from "@/data/sizing";
import { useCartSessionId } from "@/lib/cart-session";
import { ProductCard, productImages } from "@/components/site/product-card";

export function ProductView({ product }: { product: Product }) {
  const [color, setColor] = useState(product.representative.colorName);
  const [size, setSize] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [openPanel, setOpenPanel] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "adding" | "added" | "error">("idle");
  const sessionId = useCartSessionId();
  const convexProduct = useQuery(api.products.getBySlug, { slug: product.slug });
  const add = useMutation(api.cart.add);

  const variant = product.variants.find((item) => item.colorName === color) ?? product.variants[0];
  const images = useMemo(() => {
    const list = (variant?.images ?? []).filter(Boolean);
    return list.length > 0 ? list : productImages(product);
  }, [variant, product]);
  const activeImage = images[Math.min(imageIndex, images.length - 1)];
  const chart = sizeChartFor(product.category, product.sizes);
  const related = getAllProducts()
    .filter((item) => item.gender === product.gender && item.slug !== product.slug)
    .slice(0, 2);
  const more = getAllProducts()
    .filter((item) => item.category === product.category && item.slug !== product.slug)
    .slice(0, 4);

  async function onAdd() {
    if (!sessionId || !size || !convexProduct?._id) return;
    setStatus("adding");
    try {
      await add({
        sessionId,
        productId: convexProduct._id,
        colorName: color,
        size,
        quantity: 1,
      });
      setStatus("added");
    } catch {
      setStatus("error");
    }
  }

  return (
    <main className="bg-white">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:gap-12">
        <div>
          <div className="relative overflow-hidden rounded-[20px] bg-studio">
            <Image
              src={activeImage}
              alt={`${product.name} in ${color}`}
              width={1400}
              height={1750}
              priority
              className="aspect-[4/5] w-full object-contain p-6 sm:p-10"
            />
            {images.length > 1 ? (
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                {images.map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    aria-label={`Go to image ${index + 1}`}
                    onClick={() => setImageIndex(index)}
                    className={`h-1.5 rounded-full ${index === imageIndex ? "w-5 bg-ink" : "w-1.5 bg-ink/30"}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
          {images.length > 1 ? (
            <div className="mt-3 flex gap-2">
              {images.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setImageIndex(index)}
                  className={`h-[72px] w-[72px] overflow-hidden rounded-lg bg-studio ${
                    index === imageIndex ? "ring-2 ring-ink" : "ring-1 ring-transparent"
                  }`}
                >
                  <Image src={src} alt="" width={96} height={120} className="h-full w-full object-contain p-1" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="lg:pt-2">
          <h1 className="text-[32px] font-medium leading-tight tracking-tight text-ink">{product.name}</h1>
          <p className="mt-3 max-w-md text-[15px] leading-6 text-ink/80">
            {product.name} is cut to move with the body, not against it. Made for people who train with intention.
          </p>

          <ul className="mt-5 space-y-2 text-sm text-ink/80">
            <li>Designed for training, not for show.</li>
            <li>
              Questions on fit:{" "}
              <a href="mailto:hello@obtapparel.com" className="underline underline-offset-2">
                hello@obtapparel.com
              </a>
            </li>
          </ul>

          <p className="mt-6 text-sm font-medium">Color: {color}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.variants.map((item) => {
              const thumb = item.images[0] || item.src;
              const selected = item.colorName === color;
              return (
                <button
                  key={item.colorName}
                  type="button"
                  title={item.colorName}
                  onClick={() => {
                    setColor(item.colorName);
                    setImageIndex(0);
                    setStatus("idle");
                  }}
                  className={`h-14 w-14 overflow-hidden rounded-md bg-studio ${
                    selected ? "ring-2 ring-ink" : "ring-1 ring-black/10"
                  }`}
                >
                  {thumb ? (
                    <Image src={thumb} alt={item.colorName} width={80} height={100} className="h-full w-full object-contain" />
                  ) : (
                    <span className="block h-full w-full" style={{ background: item.accent }} />
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-6 text-sm font-medium">Size: {size ?? "Select"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {product.sizes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setSize(item);
                  setStatus("idle");
                }}
                className={`min-w-14 rounded-lg border px-3 py-2 text-sm ${
                  size === item ? "border-ink bg-white" : "border-black/15 bg-white hover:border-ink/40"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onAdd}
            disabled={!size || !sessionId || !convexProduct || status === "adding"}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-ink py-3.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-ink/25"
          >
            {status === "added" ? "Added to cart" : status === "adding" ? "Adding…" : "Add to cart"}
          </button>
          {!size ? <p className="mt-2 text-sm text-ink/50">Choose a size to add this piece.</p> : null}
          {status === "error" ? <p className="mt-2 text-sm text-ember">Could not add that. Try again.</p> : null}

          {related.length > 0 ? (
            <div className="mt-8">
              <p className="text-sm font-medium">Complete your look</p>
              <ul className="mt-3 divide-y divide-black/10 rounded-xl border border-black/10">
                {related.map((item) => (
                  <li key={item.slug} className="flex items-center gap-3 p-3">
                    <Link href={`/product/${item.slug}`} className="h-16 w-14 shrink-0 overflow-hidden rounded-md bg-studio">
                      <Image
                        src={item.representative.src}
                        alt=""
                        width={80}
                        height={100}
                        className="h-full w-full object-contain"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link href={`/product/${item.slug}`} className="text-sm font-medium">
                        {item.name}
                      </Link>
                      <p className="text-xs text-ink/60">Color: {item.representative.colorName}</p>
                    </div>
                    <Link
                      href={`/product/${item.slug}`}
                      className="shrink-0 rounded-lg bg-ink px-3 py-2 text-xs font-medium text-white"
                    >
                      View
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-8 border-t border-black/10">
            <Accordion
              title="Product Information"
              open={openPanel === "info"}
              onToggle={() => setOpenPanel(openPanel === "info" ? null : "info")}
            >
              <p>
                {chart.intro} {product.name} is offered in {product.sizes.join(", ")}.
              </p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-ink/60">
                      <th className="py-2 pr-3 font-medium">Size</th>
                      {chart.columns.map((column) => (
                        <th key={column} className="py-2 pr-3 font-medium">
                          {column}
                        </th>
                      ))}
                      <th className="py-2 font-medium">Fit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chart.rows.map((row) => (
                      <tr key={row.size} className="border-b border-black/5">
                        <td className="py-2 pr-3">{row.size}</td>
                        {row.measurements.map((measurement) => (
                          <td key={measurement.label} className="py-2 pr-3">
                            {measurement.range}
                          </td>
                        ))}
                        <td className="py-2">{row.fit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-ink/60">{chart.note}</p>
            </Accordion>
            <Accordion
              title="Material and Care"
              open={openPanel === "care"}
              onToggle={() => setOpenPanel(openPanel === "care" ? null : "care")}
            >
              <p>
                Wash cold, hang to dry, and skip the high heat. The garment label has the exact care for this piece.
              </p>
            </Accordion>
            <Accordion
              title="Shipping & Returns"
              open={openPanel === "ship"}
              onToggle={() => setOpenPanel(openPanel === "ship" ? null : "ship")}
            >
              <p>
                Shipping and returns are outlined in our policies. Checkout is still being finished, so an order from
                the cart is confirmed with us directly for now.
              </p>
              <Link href="/policies#returns" className="mt-2 inline-block underline underline-offset-4">
                Read returns
              </Link>
            </Accordion>
          </div>
        </div>
      </div>

      <section className="mx-auto grid max-w-[1440px] gap-4 px-4 py-10 sm:px-8 lg:grid-cols-2">
        <div className="rounded-3xl bg-ink p-8 text-bone sm:p-12">
          <h2 className="max-w-md font-serif text-4xl leading-tight text-white">
            OBT is not clothing. It is a calling.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-6 text-bone/80">
            One Body Temple creates premium apparel for people who believe the body is a gift: not to be neglected,
            not to be worshipped, but to be stewarded.
          </p>
        </div>
        <div className="flex items-center justify-center overflow-hidden rounded-3xl bg-studio">
          <Image
            src={product.representative.src}
            alt=""
            width={product.representative.width}
            height={product.representative.height}
            className="max-h-[28rem] w-auto object-contain p-8"
          />
        </div>
      </section>

      {more.length > 0 ? (
        <section className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-8">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="font-serif text-4xl tracking-tight">More {product.category.toLowerCase()}</h2>
            <Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="text-sm underline underline-offset-4">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
            {more.map((item) => (
              <ProductCard key={item.slug} product={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

function Accordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-black/10">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between py-4 text-left text-sm">
        {title}
        <span aria-hidden className="text-ink/50">
          {open ? "–" : "+"}
        </span>
      </button>
      {open ? <div className="pb-4 text-sm leading-6 text-ink/75">{children}</div> : null}
    </div>
  );
}
