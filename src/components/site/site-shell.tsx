"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getAllProducts } from "@/data/products";
import { useCartSessionId } from "@/lib/cart-session";

const LINES = [
  "Your body is a temple. Honor it through how you live.",
  "You were made for more than this.",
  "Built with purpose.",
  "One body. One calling.",
];

const NAV = [
  { label: "Women", href: "/shop/female" },
  { label: "Men", href: "/shop/male" },
  { label: "Tees", href: "/shop?category=Tees" },
  { label: "Hoodies", href: "/shop?category=Hoodies%20%26%20Crews" },
  { label: "Leggings", href: "/shop?category=Leggings" },
  { label: "Shorts", href: "/shop?category=Shorts" },
];

function useIsChromium(): boolean {
  const [isChromium, setIsChromium] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsChromium(/Chrome|Chromium/.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua));
  }, []);
  return isChromium;
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [scrollY, setScrollY] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isChromium = useIsChromium();

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setShopOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // The ticker leaves first. The floating glass bar only appears once it is gone.
  const hideBanner = scrollY > 20;
  const showGlass = scrollY > 56 || menuOpen;
  const overHero = pathname === "/" && !showGlass;

  return (
    <>
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
        <defs>
          <filter
            id="nav-liquid-glass"
            x="0%"
            y="0%"
            width="100%"
            height="100%"
            primitiveUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feImage
              href="/glass-displacement.png"
              result="displacement_map"
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="displacement_map"
              scale="8"
              xChannelSelector="R"
              yChannelSelector="G"
              result="refracted"
            />
            <feImage
              href="/glass-specular.png"
              result="specular"
              x="0"
              y="0"
              width="100%"
              height="100%"
              preserveAspectRatio="none"
            />
            <feBlend in="specular" in2="refracted" mode="screen" />
          </filter>
        </defs>
      </svg>

      <div
        className={[
          "fixed inset-x-0 top-0 z-50 overflow-hidden bg-ink text-bone transition-transform duration-300 ease-out",
          hideBanner ? "pointer-events-none -translate-y-full" : "translate-y-0",
        ].join(" ")}
        aria-hidden={hideBanner}
      >
        <div className="obt-marquee flex w-max gap-16 py-2 text-[11px] tracking-[0.14em]">
          {[...LINES, ...LINES, ...LINES, ...LINES].map((line, index) => (
            <span key={index} className="whitespace-nowrap">
              {line}
            </span>
          ))}
        </div>
      </div>

      <header
        className={[
          "fixed inset-x-0 z-50 px-3 transition-[top] duration-300 ease-out sm:px-4",
          showGlass ? "top-3" : "top-8",
        ].join(" ")}
      >
        <div
          className={[
            "relative mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 rounded-full px-4 transition-colors duration-300 sm:px-6",
            overHero ? "text-white" : "text-ink",
          ].join(" ")}
        >
          <div
            aria-hidden
            className={[
              "pointer-events-none absolute inset-0 overflow-hidden rounded-full transition-opacity duration-300",
              showGlass ? "opacity-100" : "opacity-0",
            ].join(" ")}
            style={glassStyle(isChromium)}
          >
            <span
              className="absolute inset-0 opacity-40 mix-blend-multiply"
              style={{
                backgroundImage: `url("${FROST_GRAIN}")`,
                backgroundSize: "80px 80px",
              }}
            />
          </div>
          <div className="relative z-10 flex w-full items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="text-xs font-medium uppercase tracking-[0.16em] md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
            >
              Menu
            </button>
            <Link href="/" aria-label="One Body Temple — home" className="shrink-0">
              <Image
                src={overHero ? "/obt-logo.png" : "/obt-logo.png"}
                alt="One Body Temple"
                width={948}
                height={387}
                priority
                className={`h-7 w-auto sm:h-8 ${overHero ? "" : "invert"}`}
              />
            </Link>
          </div>

          <nav className="hidden items-center gap-5 text-[13px] font-medium md:flex">
            <div
              className="relative"
              onMouseEnter={() => setShopOpen(true)}
              onMouseLeave={() => setShopOpen(false)}
            >
              <Link href="/shop" className="inline-flex items-center gap-1">
                Shop all
                <span aria-hidden className="text-[10px]">
                  ▾
                </span>
              </Link>
              {shopOpen ? (
                <div className="absolute left-0 top-full z-10 w-44 pt-3">
                  <div className="rounded-xl border border-black/5 bg-white p-2 text-ink shadow-lg">
                    <Link href="/shop" className="block rounded-lg px-3 py-2 hover:bg-bone">
                      All products
                    </Link>
                    <Link href="/shop/female" className="block rounded-lg px-3 py-2 hover:bg-bone">
                      Women
                    </Link>
                    <Link href="/shop/male" className="block rounded-lg px-3 py-2 hover:bg-bone">
                      Men
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="hover:opacity-60">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="grid h-10 w-10 place-items-center rounded-full hover:opacity-60"
            >
              <SearchIcon />
            </button>
            <Link
              href="/account"
              aria-label="Account"
              className="grid h-10 w-10 place-items-center rounded-full hover:opacity-60"
            >
              <AccountIcon />
            </Link>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              aria-label="Cart"
              className="relative grid h-10 w-10 place-items-center rounded-full hover:opacity-60"
            >
              <CartIcon />
              <CartCount />
            </button>
          </div>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-x-0 top-24 z-40 mx-3 rounded-2xl border border-black/5 bg-white p-4 text-ink shadow-lg md:hidden">
          <Link href="/shop" className="block py-2">
            All products
          </Link>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="block py-2">
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}

      {searchOpen ? <SearchPanel query={query} setQuery={setQuery} onClose={() => setSearchOpen(false)} /> : null}
      {cartOpen ? <CartDrawer onClose={() => setCartOpen(false)} /> : null}

      <div className={pathname === "/" ? "" : "pt-28"}>{children}</div>
      <SiteFooter />
    </>
  );
}

const FROST_GRAIN = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="2.6" numOctaves="1" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`,
)}`;

function glassStyle(isChromium: boolean): CSSProperties {
  const filter = isChromium
    ? "url(#nav-liquid-glass) blur(16px) saturate(1.45)"
    : "blur(16px) saturate(1.45)";
  return {
    background: "rgba(255,255,255,0.42)",
    border: "1px solid rgba(255,255,255,0.55)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(0,0,0,0.05), 0 12px 32px rgba(0,0,0,0.14)",
    backdropFilter: filter,
    WebkitBackdropFilter: filter,
  };
}

function CartCount() {
  const sessionId = useCartSessionId();
  const cart = useQuery(api.cart.current, sessionId ? { sessionId } : "skip");
  const count = cart?.items.reduce((sum, item) => sum + item.line.quantity, 0) ?? 0;
  if (!count) return null;
  return (
    <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-ember px-1 text-[10px] font-semibold leading-none text-white">
      {count}
    </span>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16.5 20 20.5" strokeLinecap="round" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 19.2c1.4-2.6 3.6-3.9 6.5-3.9s5.1 1.3 6.5 3.9" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M6.5 8.5h11l-.8 9.2a1.5 1.5 0 0 1-1.5 1.3H8.8a1.5 1.5 0 0 1-1.5-1.3L6.5 8.5Z" />
      <path d="M9 8.5V7.2A3 3 0 0 1 12 4.2 3 3 0 0 1 15 7.2v1.3" strokeLinecap="round" />
    </svg>
  );
}

function SearchPanel({
  query,
  setQuery,
  onClose,
}: {
  query: string;
  setQuery: (value: string) => void;
  onClose: () => void;
}) {
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const products = getAllProducts();
    if (!needle) return products.slice(0, 8);
    return products
      .filter((product) =>
        `${product.name} ${product.category} ${product.gender}`.toLowerCase().includes(needle),
      )
      .slice(0, 8);
  }, [query]);

  return (
    <div className="fixed inset-0 z-[60] bg-ink/40" onClick={onClose}>
      <div
        className="mx-auto mt-28 w-[min(40rem,calc(100%-1.5rem))] rounded-2xl bg-white p-5 text-ink shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search the collection"
          className="w-full border-b border-black/10 bg-transparent pb-3 text-lg outline-none"
        />
        <ul className="mt-4 divide-y divide-black/5">
          {results.map((product) => (
            <li key={product.slug}>
              <Link href={`/product/${product.slug}`} className="flex items-center gap-3 py-3" onClick={onClose}>
                <Image src={product.representative.src} alt="" width={48} height={60} className="h-14 w-12 object-contain" />
                <span>
                  <span className="block text-sm font-medium">{product.name}</span>
                  <span className="text-xs uppercase tracking-[0.14em] text-ink/50">
                    {product.gender} · {product.category}
                  </span>
                </span>
              </Link>
            </li>
          ))}
          {results.length === 0 ? <li className="py-6 text-sm text-ink/60">Nothing matches that.</li> : null}
        </ul>
      </div>
    </div>
  );
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const sessionId = useCartSessionId();
  const cart = useQuery(api.cart.current, sessionId ? { sessionId } : "skip");
  const updateQuantity = useMutation(api.cart.updateQuantity);
  const removeLine = useMutation(api.cart.removeLine);
  const items = cart?.items ?? [];

  return (
    <div className="fixed inset-0 z-[70] bg-ink/40" onClick={onClose}>
      <aside
        className="ml-auto flex h-full w-[min(26rem,100%)] flex-col bg-white text-ink shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
          <h2 className="font-serif text-2xl">Cart</h2>
          <button type="button" onClick={onClose} aria-label="Close cart">
            Close
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5">
          {items.length === 0 ? (
            <p className="py-10 text-sm text-ink/60">Your cart is empty.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {items.map(({ line, product }) => (
                <li key={line._id} className="flex gap-3 py-4">
                  {product?.representative.src ? (
                    <Image
                      src={product.representative.src}
                      alt=""
                      width={72}
                      height={90}
                      className="h-24 w-16 rounded-lg bg-studio object-contain"
                    />
                  ) : null}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{product?.name ?? "Product"}</p>
                    <p className="text-xs text-ink/55">
                      {line.colorName} · {line.size}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <button
                        type="button"
                        className="h-7 w-7 rounded-full border border-black/10"
                        onClick={() =>
                          sessionId &&
                          updateQuantity({
                            sessionId,
                            cartItemId: line._id as Id<"cartItems">,
                            quantity: line.quantity - 1,
                          })
                        }
                      >
                        −
                      </button>
                      <span>{line.quantity}</span>
                      <button
                        type="button"
                        className="h-7 w-7 rounded-full border border-black/10"
                        onClick={() =>
                          sessionId &&
                          updateQuantity({
                            sessionId,
                            cartItemId: line._id as Id<"cartItems">,
                            quantity: line.quantity + 1,
                          })
                        }
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className="ml-auto text-xs uppercase tracking-[0.14em] text-ink/50"
                        onClick={() =>
                          sessionId &&
                          removeLine({ sessionId, cartItemId: line._id as Id<"cartItems"> })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-black/10 p-5">
          <p className="text-sm text-ink/60">Checkout is next. Your pieces stay in this cart.</p>
          <Link
            href="/contact"
            onClick={onClose}
            className="mt-4 block rounded-full bg-ink py-3 text-center text-sm font-medium text-white"
          >
            Ask about an order
          </Link>
        </div>
      </aside>
    </div>
  );
}

function SiteFooter() {
  const submit = useMutation(api.contact.submit);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    try {
      await submit({
        name: "Newsletter",
        email: email.trim(),
        message: "Please add me to the One Body Temple list.",
      });
      setStatus("sent");
      setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-[1400px] px-6 py-16 sm:px-10">
        <div className="flex flex-col gap-14 lg:flex-row lg:gap-16">
          <div className="max-w-xs">
            <p className="text-base text-white">One Body Temple</p>
            <p className="mt-3 text-base leading-6 text-white/70">
              Your body is a temple. Honor it through how you live. You are not bound by what you were yesterday;
              every morning, you get to decide who you are.
            </p>
            <p className="mt-6 text-base text-white/70">
              E-Mail:{" "}
              <a href="mailto:hello@obtapparel.com" className="underline underline-offset-4">
                hello@obtapparel.com
              </a>
            </p>
          </div>

          <div>
            <p className="text-base text-white">Help and Support</p>
            <ul className="mt-3 grid gap-2.5 text-base">
              <li>
                <Link href="/contact" className="hover:opacity-70">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/policies#terms" className="hover:opacity-70">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/policies#privacy" className="hover:opacity-70">
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/policies#returns" className="hover:opacity-70">
                  Returns
                </Link>
              </li>
              <li>
                <Link href="/policies#accessibility" className="hover:opacity-70">
                  Accessibility
                </Link>
              </li>
            </ul>
          </div>

          <div className="max-w-md lg:ml-auto">
            <p className="text-2xl text-white">Join our community for free!</p>
            <p className="mt-3 text-base leading-6 text-white/70">
              Sign up for <span className="font-semibold text-white">early access</span> to drops, important{" "}
              <span className="font-semibold text-white">updates</span>, and nothing else. We do not sell the list.
            </p>
            <form
              onSubmit={onSubmit}
              className="mt-5 flex items-center rounded-xl border border-white/25 pr-1.5"
            >
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="E-mail"
                aria-label="E-mail"
                className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-base outline-none placeholder:text-white/45"
              />
              <button
                type="submit"
                disabled={status === "sending"}
                aria-label={status === "sent" ? "Joined" : "Subscribe"}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white hover:bg-white/10"
              >
                {status === "sent" ? "✓" : "›"}
              </button>
            </form>
            {status === "error" ? <p className="mt-2 text-sm text-ember">Could not save that. Try again.</p> : null}
          </div>
        </div>

        <div className="mt-20">
          <Link href="/ig" aria-label="Instagram" className="inline-flex text-white hover:opacity-70">
            <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
              <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
              <circle cx="12" cy="12" r="3.6" />
              <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
            </svg>
          </Link>
          <p className="mt-8 text-sm text-white/70">© {new Date().getFullYear()} One Body Temple.</p>
        </div>
      </div>
    </footer>
  );
}
