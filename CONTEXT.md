# OBT Apparel — context

Read this first in a new chat. It is the current map of the project. Brand voice lives in `Brand.md`. The longer local history is `DEV_LOG.md` (not on GitHub). Code relationships are in `graphify-out/graph.json`.

**Repo:** https://github.com/liam151518/OBT.git (`main`, public)
**Name:** One Body Temple (OBT)
**Live site:** https://onebodytemple.co.za and https://www.onebodytemple.co.za
**Last updated:** 2026-11-12

## What this is

A premium apparel storefront. The body is a gift to steward, not neglect and not worship. The live UI is a shop in the shape of a clean athletic catalog (announcement bar, frosted nav, hero film, product grid, product page, dark footer). Copy and colors come from the OBT brand kit, not from reference sites.

## Read next

| Need | File |
|---|---|
| Voice, vision, mission, pillars | `Brand.md` |
| Full playbook (local only) | `Philisophy and Copy.md` |
| Logo rules, colors, type | `brand-kit/guidelines.md` and `brand-kit/index.html` |
| Catalog | `src/data/products.ts` |
| Size charts | `src/data/sizing.ts` |
| Legal copy (placeholder, not lawyer-reviewed) | `src/data/policies.ts` |
| Session history | `DEV_LOG.md` |

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4
- Convex for products, guest cart, and contact submissions
- No customer auth yet (`convex/lib/auth.ts` is a stub)
- The storefront is hosted on Vercel. The database stays on Convex. Email stays on domains.co.za. Do not move the app or the database onto the cPanel hosting package.

## Commands

```bash
npm run dev          # http://localhost:3000
npx tsc --noEmit
npm run build
graphify query "question"          # uses graphify-out/graph.json
graphify update .                  # refresh the graph after code changes (no LLM)
```

Graphify for this repo is `graphify-out/graph.json` (code plus brand concepts). This workspace's `.cursor/mcp.json` points the Graphify server at that file. If a chat is still attached to another repo's graph, pass `project_path` `/Volumes/Content SSD/obt-apparel`.

```bash
./scripts/refresh-graph.sh
```

## Routes

| Route | What it is |
|---|---|
| `/` | Home: ticker, hero video, all products, community row, brand story |
| `/shop` | All products. `?category=` filters (for example `Tees`) |
| `/shop/female`, `/shop/male` | Women / Men |
| `/product/[slug]` | Product page: gallery, colors, sizes, add to cart, size chart, related pieces |
| `/contact` | Form saved with `contact.submit` |
| `/policies` | Privacy, Returns, Terms, Accessibility |
| `/ig` | Instagram placeholder |
| `/account` | Sign-in is not built yet |

Shared chrome is `src/components/site/site-shell.tsx` (ticker, frosted nav, search, cart drawer, footer).

## Hosting

The public site is Vercel project `obt` on team scope `liamxandersantos-3806s-projects`. Pushing `main` deploys production. `https://obt-five.vercel.app` is the same deployment.

The Vercel MCP in Cursor is signed into a different account. Use the CLI with the Liam config:

```bash
vercel --global-config "$HOME/.vercel-liam" --scope liamxandersantos-3806s-projects
```

DNS is managed in the domains.co.za client portal under **Manage DNS**. cPanel Zone Editor on this package can only add MX records, and it hides the website records. Leave the nameservers on domains.co.za (`ns1.tld-ns.net`, `ns2.tld-ns.com`, `ns3.tld-ns.net`, `ns4.tld-ns.com`). Moving them to Vercel would drop mail.

Website records, checked 2026-11-12:

| Name | Type | Value |
|---|---|---|
| `onebodytemple.co.za` | A | `216.198.79.1` |
| `onebodytemple.co.za` | A | `64.29.17.1` |
| `www.onebodytemple.co.za` | CNAME | `7a17130b921a2701.vercel-dns-017.com` |

Mail stays where it is: MX priority `10` to `mx1.tld-mx.com`, and `mail.onebodytemple.co.za` points at `169.239.218.80`. Leave SPF, DKIM, and DMARC alone. Vercel issues the site certificate for the apex and `www`.

## Backend

Convex production deployment: `qualified-anteater-360` (team `liam-37242`).

- Cloud: `https://qualified-anteater-360.eu-west-1.convex.cloud`
- Local dev: `.env.local` points at the dev deployment `agreeable-dotterel-585`
- Production env for Vercel is in `.env.production.local` (gitignored): `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CONVEX_SITE_URL`
- Tables: `users`, `products`, `productVariants`, `carts`, `cartItems`, `orders`, `orderItems`, `contactSubmissions`
- Guest cart key: `localStorage` `obt.cart.sessionId` via `src/lib/cart-session.ts`
- Push functions: `npx convex deploy --yes` then `npx convex run products:seed --prod` after catalog changes

## Brand (short)

- Anchor: Your body is a temple. Honor it through how you live.
- Colors: Ink `#0E0E0E`, Bone `#F3EFE7`, Ember `#C2410C`, White
- Type: Libre Baskerville for headlines, Inter for UI. The wordmark is custom art, not a font.
- Live mark: the thin wordmark. Header and footer use `public/obt-wordmark-white.svg` and `public/obt-wordmark-black.svg`. Source PNG: `public/obt-logo.png` (same file as `Logo/OBT Thin Logo White.png`). Bold master: `Logo/OBT Logo.png`
- Favicon and home-screen icon: the thin wordmark on ink, the same mark as the header. `src/app/favicon.ico`, `src/app/icon.svg`, `src/app/apple-icon.png`, plus `public/icon-192.png`, `public/icon-512.png`, and `public/maskable-512.png`
- Do not send customers to Tapstitch. `tapstitchUrl` is supplier-only.

## Catalog

Generated by `npx tsx scripts/generate-product-data.ts` from the catalog CSV and `Product Designs/`. Do not hand-edit `src/data/products.ts`. Storefront images are WebP under `public/products/` (`-1` is the first view). Original PNGs are gitignored. There are no prices in the catalog yet, so the UI does not invent them.

## Do not

- Invent prices, reviews, athlete counts, or payment logos
- Recreate the wordmark by typing "OBT"
- Commit `.env*`, `DEV_LOG.md`, or `Philisophy and Copy.md`
- Treat policy copy as legal advice

## Known placeholders

- Hero film: `public/hero/placeholder-pin.mp4` (short, low resolution). Replace the file when the real brand film exists.
- Checkout is not built. The cart drawer links to contact.
- Account sign-in is not built.
- Instagram is a coming-soon page.
