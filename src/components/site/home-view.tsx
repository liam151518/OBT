import Image from "next/image";
import Link from "next/link";
import { getAllProducts } from "@/data/products";
import { ProductCard } from "@/components/site/product-card";

const PILLARS = [
  "I do not train to look good. I train because not training would be choosing less.",
  "I am not where I was. But I know why I am moving.",
  "I am not chasing a body. I am building a life.",
  "How I carry myself tells others what I think is possible.",
];

export function HomeView() {
  const products = getAllProducts();
  const hero = products.find((product) => product.slug === "essential-hoodie") ?? products[0];
  const story = products.find((product) => product.slug === "halter-bra") ?? products[1];
  const community = products.slice(0, 4);

  return (
    <main>
      <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-ink text-white">
        {/* Placeholder hero film from the pin the brand chose. Swap the file when the real film is ready. */}
        <video
          autoPlay
          muted
          loop
          playsInline
          poster={hero.representative.src}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/hero/placeholder-pin.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-ink/20 to-transparent" />
        <div className="relative z-10 w-full max-w-3xl px-6 pb-16 pt-40 sm:px-10">
          <p className="text-xs uppercase tracking-[0.22em] text-white/70">One Body Temple</p>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl leading-[0.95] tracking-tight text-white sm:text-7xl">
            You were made for more
          </h1>
          <p className="mt-6 max-w-md text-lg leading-7 text-white/85">
            Premium apparel for people who train with intention and live with purpose. The body is a gift. Steward it.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-medium text-ink"
          >
            Explore the collection
          </Link>
        </div>
      </section>

      <section className="overflow-hidden border-b border-black/5 bg-bone">
        <div className="obt-marquee flex w-max gap-12 py-4 text-xs uppercase tracking-[0.18em] text-ink/70">
          {[...PILLARS, ...PILLARS].map((line, index) => (
            <span key={index} className="whitespace-nowrap">
              {line}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-serif text-4xl tracking-tight">All products</h2>
          <Link href="/shop" className="text-sm underline underline-offset-4">
            View all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.slug} product={product} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-serif text-4xl tracking-tight">Carry the standard</h2>
          <Link href="/ig" className="text-sm underline underline-offset-4">
            Instagram
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {community.map((product) => (
            <Link key={product.slug} href={`/product/${product.slug}`} className="overflow-hidden rounded-2xl bg-studio">
              <Image
                src={product.representative.src}
                alt={product.name}
                width={product.representative.width}
                height={product.representative.height}
                className="aspect-[4/5] w-full object-contain p-6"
              />
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-[1440px] gap-4 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <div className="flex min-h-[28rem] items-end overflow-hidden rounded-3xl bg-studio p-8">
          <Image
            src={story.representative.src}
            alt={story.name}
            width={story.representative.width}
            height={story.representative.height}
            className="mx-auto max-h-[36rem] w-auto object-contain"
          />
        </div>
        <div className="flex flex-col justify-center rounded-3xl bg-ink p-8 text-bone sm:p-12">
          <h2 className="font-serif text-4xl leading-tight tracking-tight text-white sm:text-5xl">
            OBT is not clothing. It is a calling.
          </h2>
          <p className="mt-6 max-w-xl text-base leading-7 text-bone/80">
            One Body Temple creates premium apparel for people who believe the body is a gift: not to be neglected,
            not to be worshipped, but to be stewarded. Through discipline, excellence, and a life built on something
            greater than themselves.
          </p>
          <p className="mt-4 max-w-xl text-base leading-7 text-bone/80">
            Foundation. Stewardship. Discipline. Excellence. Purpose. Held together, they produce a recognizable kind
            of person.
          </p>
          <Link
            href="/shop"
            className="mt-8 inline-flex w-fit rounded-full bg-white/10 px-6 py-3 text-sm font-medium text-white ring-1 ring-white/15"
          >
            Discover products
          </Link>
        </div>
      </section>
    </main>
  );
}
