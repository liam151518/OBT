/**
 * Products queries + the seed mutation.
 *
 * The seed mutation reads the existing static catalog from
 * `src/data/products.ts` and inserts each product + its variants into
 * Convex. We keep this as a mutation (not an action) because it's
 * pure DB writes — no external I/O. The seed is idempotent: it
 * deletes all existing products + variants before re-inserting so
 * it's safe to re-run after edits to the static catalog.
 *
 * Run from the project root with:
 *   npx convex run products:seed
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { PRODUCTS } from "../src/data/products";

/**
 * List products, optionally filtered by gender. Returns the same
 * shape the frontend already consumes from the static catalog so
 * swapping the data source is transparent.
 */
export const list = query({
  args: {
    gender: v.optional(v.union(v.literal("female"), v.literal("male"))),
    onlyActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const onlyActive = args.onlyActive ?? true;
    if (args.gender) {
      return await ctx.db
        .query("products")
        .withIndex(
          onlyActive ? "by_gender_and_active" : "by_gender",
          (q) =>
            onlyActive
              ? q.eq("gender", args.gender!).eq("active", true)
              : q.eq("gender", args.gender!),
        )
        .collect();
    }
    // No gender filter — return all active products. We don't have
    // a "by_active" index yet so we filter in TS after a cheap scan
    // (bounded by catalog size, ~46 rows today).
    const all = await ctx.db.query("products").collect();
    return onlyActive ? all.filter((p) => p.active) : all;
  },
});

/** Fetch a single product by its slug. */
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

/** Fetch all variants for a product. */
export const variants = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("productVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
  },
});

/**
 * Seed the catalog from the static TS data. Deletes all existing
 * products + variants first so it's idempotent. Call this whenever
 * the static catalog changes.
 */
export const seed = mutation({
  args: {},
  returns: v.object({
    products: v.number(),
    variants: v.number(),
  }),
  handler: async (ctx) => {
    // Wipe existing data so the seed is deterministic. We delete in
    // reverse-dependency order so we never violate FK constraints.
    const existingProducts = await ctx.db.query("products").collect();
    for (const p of existingProducts) {
      const variants = await ctx.db
        .query("productVariants")
        .withIndex("by_product", (q) => q.eq("productId", p._id))
        .collect();
      for (const v of variants) {
        await ctx.db.delete(v._id);
      }
      await ctx.db.delete(p._id);
    }

    // Insert products + their variants from the static catalog.
    const now = Date.now();
    let totalVariants = 0;
    for (const p of PRODUCTS) {
      const productId = await ctx.db.insert("products", {
        slug: p.slug,
        name: p.name,
        productCode: p.productCode,
        gender: p.gender,
        category: p.category,
        sizes: p.sizes,
        variantCount: p.variantCount,
        representative: {
          colorName: p.representative.colorName,
          src: p.representative.src,
          width: p.representative.width,
          height: p.representative.height,
        },
        accent: p.accent,
        tapstitchUrl: p.tapstitchUrl,
        active: true,
        createdAt: now,
      });

      for (const v of p.variants) {
        // Skip variants with no usable image — they would render as
        // broken tiles in the UI.
        if (!v.src) continue;
        await ctx.db.insert("productVariants", {
          productId,
          colorName: v.colorName,
          colorId: v.colorId,
          src: v.src,
          images: v.images,
          accent: v.accent,
        });
        totalVariants++;
      }
    }

    return { products: PRODUCTS.length, variants: totalVariants };
  },
});
