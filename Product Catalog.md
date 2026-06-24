# OBT — Product Catalog Reference

> **Purpose:** Single source of truth for the OBT product line. Read this before placing any product on the site. It is **context only** — never ship to production.
>
> **Authoritative source:** `~/Desktop/New Catalog.csv` (Tapstitch export). Updated by Liam whenever the product line changes.
>
> **Related context:** `Philisophy and Copy.md` (brand voice), `DEV_LOG.md` (project state).

---

## 1. Catalog at a glance

| Metric | Value |
|---|---|
| Total products | **46** |
| Total (product × color) variants | **168** |
| Female products | 28 |
| Male products | 17 |
| Gender not yet verified | 1 (`One-Shoulder Crop` — almost certainly female based on naming pattern) |
| Color variants per product | 1 – 7 |
| Distinct size schemes | 6 (all adult: `2XS` through `3XL`, no kids/youth) |
| Print-on-demand backend | Tapstitch (every product has a `Design URL`) |

**Removed from the previous catalog (per user):** products with kids/youth sizing (`2-4, 6-8, 10-12`) and other items no longer in the line. The catalog above is the current state — do not rely on memory of older product lists.

---

## 2. Data model

The website should treat each row in `New Catalog.csv` as a **variant**, and group variants by `Design Name` to form a **product**.

```ts
type Product = {
  id: string;             // slug from name, e.g. "halter-crop-tank"
  name: string;           // "Halter Crop Tank"  (matches Design Name exactly)
  productCode: string;    // "WT0083"            (Tapstitch SKU)
  gender: "female" | "male";
  category: ProductCategory;
  sizes: string[];        // ["S","M","L","XL"]
  variants: Variant[];
  tapstitchUrl: string;   // full Design URL
}

type Variant = {
  colorId: string;        // "9947"           (Tapstitch color number)
  colorName: string;      // "White"
  // images come from the disk folder, NOT the CSV
  // see section 4 for image sourcing
}
```

---

## 3. Canonical product list

Sorted by gender, then category. **The `Disk folder` column is the on-disk path; do not rename it without re-checking filenames.**

### Female (28 products)

| Product | Code | Colors | Sizes | Disk folder |
|---|---|---|---|---|
| A-Line Skirt | WB0047 | 6 | `2XS,XS,S,M,L,XL` | `Product Designs/Female/A-Line Skirt` |
| Ankle Leggings | WB0017 | 3 | `S,M,L,XL` | `Product Designs/Female/Ankle Leggings` |
| Batwing Tee | WT0107 | 4 | `S,M,L,XL` | `Product Designs/Female/Batwing Tee` |
| Binding Shorts | WB0030 | 5 | `S,M,L,XL` | `Product Designs/Female/Binding Shorts` |
| Color Block Tank | WT0134 | 4 | `S,M,L,XL` | `Product Designs/Female/Color Block Tank` |
| Criss-Cross Bra | WT0127 | 4 | `2XS,XS,S,M,L,XL` | `Product Designs/Female/Criss-Cross Bra` |
| Crop Tank | WT0082 | 5 | `S,M,L,XL` | `Product Designs/Female/Crop Tank` |
| Denim Shorts | WB0034 | 1 | `S,M,L,XL` | `Product Designs/Female/Denim Shorts` |
| Drawstring Shorts | WK0014 | 1 | `S,M,L,XL,2XL` | `Product Designs/Female/Drawstring Shorts` |
| Essential Bra | WT0093 | 7 | `S,M,L,XL` | `Product Designs/Female/Essential Bra` |
| Essential Hoodie | WW0003 | 3 | `S,M,L,XL` | `Product Designs/Female/Essential Hoodie` |
| Flare Jeans | WB0018 | 3 | `L,XL,2XL` | `Product Designs/Female/Flare Jeans` |
| Full-Zip Jacket | WT0118 | 3 | `S,M,L,XL,2XL` | `Product Designs/Female/Full-Zip Jacket` |
| Halter Bra | WT0063 | 7 | `S,M,L,XL,2XL` | `Product Designs/Female/Halter Bra` |
| Halter Crop Tank | WT0083 | 5 | `S,M,L,XL` | `Product Designs/Female/Halter Crop Tank` |
| Maxi Skirt | WB0027 | 3 | `S,M,L,XL` | `Product Designs/Female/Maxi Skirt` |
| Mineral Bodysuit | WT0091 | 1 | `S,M,L,XL,2XL` | `Product Designs/Female/Mineral Bodysuit` |
| Mini Skirt | WB0033 | 2 | `S,M,L,XL` | `Product Designs/Female/Mini Skirt` |
| Off-Shoulder Crop | WT0112 | 3 | `S,M,L,XL` | `Product Designs/Female/Off-Shoulder Crop` |
| One-Shoulder Crop | WT0057 | 5 | `S,M,L,XL` | `Product Designs/Female/One-ShoulderCrop` ⚠️ |
| Paneled Crop | WT0106 | 4 | `S,M,L,XL` | `Product Designs/Female/Paneled Crop` |
| Pleated Skirt | WB0037 | 4 | `2XS,XS,S,M,L,XL` | `Product Designs/Female/Pleated Skirt` |
| Quarter-Zip Pullover | WT0092 | 4 | `S,M,L,XL` | `Product Designs/Female/Quarter-Zip Pullover` |
| Raglan Tee | WT0029 | 4 | `S,M,L,XL` | `Product Designs/Female/Raglan Tee` |
| Slim Fit Ribbed Racerback Tank Top | RB0017 | 4 | `S,M,L,XL` | `Product Designs/Female/Slim Fit Ribbed Racerback Tank Top` |
| Stripe Hoodie | WW0012 | 2 | `S,M,L,XL` | `Product Designs/Female/Stripe Hoodie` |
| Track Jacket | WQ0004 | 3 | `S,M,L,XL` | `Product Designs/Female/Track Jacket` |
| Track Shorts | WB0014 | 2 | `S,M,L,XL,2XL` | `Product Designs/Female/Track Shorts` |
| Yoga Halter Bra | WT0136 | 4 | `S,M,L,XL` | `Product Designs/Female/Yoga Halter Bra` |

⚠️ **`One-Shoulder Crop` naming mismatch** — catalog spells it with a space (`One-Shoulder Crop`), the disk folder omits the space (`One-ShoulderCrop`). Use the catalog spelling as the source of truth; map to the disk folder name programmatically. Renaming the disk folder is the cleanest fix but not required.

### Male (17 products)

| Product | Code | Colors | Sizes | Disk folder |
|---|---|---|---|---|
| Acid Wash Long Sleeve | R00099 | 4 | `S,M,L,XL,2XL` | `Product Designs/Male/Acid Wash Long Sleeve` |
| Boxy Tank | RB0003 | 2 | `S,M,L,XL,2XL` | `Product Designs/Male/Boxy Tank` |
| Cotton Tank | RU0006 | 3 | `M,L,XL,2XL,3XL` | `Product Designs/Male/Cotton Tank` |
| Essential Drawstring Straight-Leg Sweatpants | WK0003 | 3 | `S,M,L,XL` | `Product Designs/Male/Essential Drawstring Straight-Leg Sweatpants` |
| Fleece Joggers | RU0077 | 4 | `S,M,L,XL,2XL` | `Product Designs/Male/Fleece Joggers` |
| Frayed Edge Tee | RU0021 | 1 | `S,M,L,XL,2XL` | `Product Designs/Male/Frayed Edge Tee` |
| Frayed Hoodie | R00285 | 5 | `S,M,L,XL,2XL` | `Product Designs/Male/Frayed Hoodie` |
| Gradient Long Sleeve | RU0063 | 3 | `S,M,L,XL,2XL` | `Product Designs/Male/Gradient Long Sleeve` |
| Heavyweight Tank | UT0010 | 5 | `S,M,L,XL,2XL` | `Product Designs/Male/Heavyweight Tank` |
| Mesh Shorts | RK0044 | 4 | `S,M,L,XL,2XL,3XL` | `Product Designs/Male/Mesh Shorts` |
| Quarter-Zip Tee | MT0011 | 1 | `M,L,XL,2XL,3XL` | `Product Designs/Male/Quarter-Zip Tee` |
| Snow Wash Hoodie | RW0046 | 5 | `S,M,L,XL,2XL` | `Product Designs/Male/Snow Wash Hoodie` |
| Snow Wash Sweatpants | RK0032 | 5 | `S,M,L,XL,2XL` | `Product Designs/Male/Snow Wash Sweatpants` |
| Stitched Joggers | RK0033 | 1 | `S,M,L,XL` | `Product Designs/Male/Stitched Joggers` |
| Vintage Shorts | UB0031 | 6 | `S,M,L,XL,2XL` | `Product Designs/Male/Vintage Shorts` |
| Vintage Washed Waist Pants | WK0006 | 5 | `S,M,L,XL` | `Product Designs/Male/Vintage Washed Waist Pants` |
| Waffle Knit Tee | UT0042 | 5 | `S,M,L,XL,2XL` | `Product Designs/Male/Waffle Knit Tee` |

### Unverified

| Product | Code | Colors | Sizes | Notes |
|---|---|---|---|---|
| One-Shoulder Crop | WT0057 | 5 | `S,M,L,XL` | Naming mismatch (see ⚠️ above); gender not formally confirmed in this MD but the existing on-disk folder is in `Female/`. Treat as female. |

---

## 4. Image sourcing — CRITICAL

**The catalog CSV does not contain image filenames.** Images live on disk in `Product Designs/{Female,Male}/<Product Name>/`. Disk folders and filenames are the source of truth for product imagery.

**Filename convention:**

```
<Product Name>-mockups-<N>(<Color>).png
```

Examples:
- `Halter Bra-mockups-1(Black).png`
- `A-Line Skirt-mockups-3(Babby Blue)(Sky Blue).png`  ← double-tag (typo)
- `Raglan Tee-mockups-1(Black with White).png`  ← compound color name

### Image state vs catalog (as of 2026-06-24)

Disk has **336 product images** total. For every catalog product, there is at least one disk folder. Most products have a **1:1 mapping** between catalog colors and disk color tags — but two products diverge and need attention before the site goes live:

| Product | Catalog colors | Disk color tags | Mismatch |
|---|---|---|---|
| `A-Line Skirt` | 6 | 9 | Disk has extra "Badge" tags + 1 typo (`Babby Blue` likely intended as `Sky Blue`). |
| `Criss-Cross Bra` | 4 | 5 | Disk has 1 extra color tag not in catalog. |

**All other 44 products have a clean 1:1 mapping** between catalog `Color Name` and disk `(Color)` tag.

### Image processing status

All 336 images on disk have been processed through `rembg` (background removed, transparent PNG). The originals were overwritten in place. See `scripts/remove_backgrounds.py` if you ever need to re-run.

### Known filename quirks (worth handling in code)

- Double `(Color)(Color)` parens on some `A-Line Skirt` mockups → take the first/last paren as the actual color
- `Badge` tag in parens on `A-Line Skirt-mockups-1` and `-2` → some kind of variant marker, ignore
- `Babby Blue` → likely typo for `Baby Blue` or `Sky Blue`
- `Lake blue` (Snow Wash Hoodie) → lowercase `b`, treat as `Lake Blue`
- `Medium Grey` (Cotton Tank) → British spelling, the rest use `Gray`
- `Static Blue`, `Pirate Gray`, `Black Beauty`, `Dusk Black`, `Washed Black` → creative supplier names. Keep as-is unless you want to normalize for the brand.

---

## 5. Categories (inferred from product names)

Useful for Shop page filters. Each product has exactly one category.

| Category | Female | Male | Total |
|---|---|---|---|
| Bodysuits | 1 | 0 | 1 |
| Bras | 4 | 0 | 4 |
| Crops | 3 | 0 | 3 |
| Hoodies & Crews | 4 | 0 | 4 |
| Jackets | 2 | 0 | 2 |
| Jeans | 1 | 0 | 1 |
| Joggers & Sweatpants | 0 | 5 | 5 |
| Leggings | 1 | 0 | 1 |
| Long Sleeves | 0 | 2 | 2 |
| Shorts | 3 | 3 | 6 |
| Skirts | 4 | 0 | 4 |
| Tanks | 4 | 3 | 7 |
| Tees | 3 | 2 | 5 |
| Quarter-Zip Pullover | 1 | 0 | 1 |

Categories with cross-gender potential (Shorts, Tanks, Tees) are counted under each gender separately. The "Joggers & Sweatpants" male product `Essential Drawstring Straight-Leg Sweatpants` is a category of one but is unmistakably men's.

---

## 6. Colors (full list, deduplicated)

These are the canonical `Color Name` values from the catalog. Sorted by frequency (most-shown color first), then alphabetically.

| Color | Variants |
|---|---|
| Black | 18 |
| White | 9 |
| Navy Blue | 8 |
| Gray | 7 |
| Brown | 6 |
| Light Apricot | 4 |
| Light Gray | 4 |
| Royal Blue | 4 |
| Sky Blue | 4 |
| Apricot | 4 |
| Blackish Green | 3 |
| Dark Gray | 3 |
| Wine Red | 3 |
| Coffee | 3 |
| Lavender | 2 |
| Light Green | 2 |
| Light Purple | 2 |
| Red | 2 |
| Brick Red | 2 |
| Plum Purple | 2 |
| Orange | 2 |
| Pink | 2 |
| Purple | 2 |
| Medium Gray | 2 |
| Flower Gray | 2 |
| Mild Apricot | 2 |
| Blue | 2 |
| Lake blue | 1 |
| Washed Black | 1 |
| Yellow | 1 |
| Black with White | 1 |
| Dusk Black | 1 |
| Khaki | 1 |
| Charcoal Gray | 1 |
| Dark Reddish Purple | 1 |
| Flower Gray with Dark Gray | 1 |
| Yellow with Brown | 1 |
| Coffee with Blue | 1 |
| Ash Purple | 1 |
| Dark Purple | 1 |
| Dark Purple | 1 |
| Retro Green | 1 |
| Rose Pink | 1 |
| Beige | 1 |
| Cameo | 1 |
| Gray Green | 1 |
| Gray Purple | 1 |
| Gray Blue | 1 |
| Jeans Blue | 1 |
| Static Blue | 1 |
| Black Beauty | 1 |
| Pirate Gray | 1 |
| Light Coffee | 1 |
| Dark Blue | 1 |
| Medium Grey | 1 |
| Army Green | 1 |

(Some colors appear twice in the count above — same name, multiple variants across different products.)

---

## 7. Print-on-demand backend — Tapstitch

- **Catalog source:** Tapstitch product export (every row has a `Design URL`)
- **Use case for OBT:** Tapstitch handles the actual printing + shipping. The OBT site acts as the storefront; product links can route to the Tapstitch product page for fulfillment.
- **Recommended pattern:** "View on Tapstitch" or "Buy" button on each product card → opens the `Design URL` in a new tab. Until payment integration is added, that's the simplest fulfillment flow.

---

## 8. Re-using this document

When you (or another chat) come back to add product features:

1. **Read this file first.** It tells you what products exist, what sizes/colors they have, where the images live, and the data shape.
2. **Read `Philisophy and Copy.md`** for brand voice — apply it to product copy, CTAs, empty states.
3. **Read `DEV_LOG.md`** for current project state — what's built, what's broken, what's next.
4. **Don't re-read the CSV unless you need exact variant counts.** The summary tables here are derived from the CSV and should match unless Liam has updated the CSV since.

---

## 9. Open questions

- [ ] **Rename disk folder** `One-ShoulderCrop` → `One-Shoulder Crop` to match the catalog spelling and remove the only alias the site will need.
- [ ] **Resolve `A-Line Skirt` and `Criss-Cross Bra` image/color mismatches** — likely by getting cleaner image sets from Tapstitch or removing the duplicated/typo images from disk.
- [ ] **Normalize color names** for display? Some (`Static Blue`, `Pirate Gray`, `Black Beauty`) don't match OBT's restrained brand voice. Could map to cleaner names on the site while keeping the catalog value internally.
- [ ] **Pricing** — the catalog doesn't include price. Will need a separate source (Tapstitch retail prices, or a manual rate sheet) before the site can show prices.
- [ ] **Image hosting** — currently images are on the local filesystem. To deploy, they need to live somewhere web-accessible (Vercel Blob, S3, Cloudflare R2, or just committed to the repo if size permits).

---

*Last updated: 2026-06-24. Catalog source: `~/Desktop/New Catalog.csv` (168 variant rows, 46 products).*
