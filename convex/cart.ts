/**
 * Cart functions for OBT Apparel.
 *
 * Auth is intentionally deferred, so carts are keyed by `sessionId`
 * (a browser-stable random string persisted to localStorage). When
 * auth lands, we can resolve the cart by either `sessionId` OR
 * `userId` and merge them at sign-in time.
 *
 * Cart semantics:
 *   - One cart per session (and eventually one per user, merged on
 *     sign-in).
 *   - Adding an item with the same (product, color, size) increments
 *     the existing line's quantity rather than creating a duplicate.
 *   - The cart is the source of truth for "what's in my bag"; the
 *     CTA on the product detail page will call `cart.add` instead of
 *     sending the user to Tapstitch directly (until checkout).
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const sessionIdArg = v.string();

/** Get the current cart for a session (or user, when auth lands),
 *  including its line items + the referenced product summary for
 *  each line so the UI doesn't need a second round-trip per line. */
export const current = query({
  args: { sessionId: sessionIdArg },
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (!cart) return null;

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .collect();

    // Hydrate each line with the product summary. Convex has no
    // JOIN; we resolve productId → product document per line. Cheap
    // because cart size is small (handful of lines).
    const hydrated = await Promise.all(
      items.map(async (line) => {
        const product = await ctx.db.get(line.productId);
        return { line, product };
      }),
    );

    return { ...cart, items: hydrated };
  },
});

/** Add a product to the cart (or increment qty if the line exists). */
export const add = mutation({
  args: {
    sessionId: sessionIdArg,
    productId: v.id("products"),
    colorName: v.string(),
    size: v.string(),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) throw new Error("Quantity must be positive");

    // Confirm the product exists. We don't enforce variant availability
    // yet — `stockBySize` is optional and we treat missing as in-stock.
    const product = await ctx.db.get(args.productId);
    if (!product) throw new Error("Product not found");

    // Find or create the cart.
    let cart = await ctx.db
      .query("carts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    const now = Date.now();
    if (!cart) {
      const cartId = await ctx.db.insert("carts", {
        sessionId: args.sessionId,
        updatedAt: now,
        createdAt: now,
      });
      cart = (await ctx.db.get(cartId))!;
    }

    // Find or create the line.
    const existingLine = await ctx.db
      .query("cartItems")
      .withIndex("by_cart_and_product", (q) =>
        q
          .eq("cartId", cart!._id)
          .eq("productId", args.productId),
      )
      .filter((q) => q.eq(q.field("colorName"), args.colorName))
      .filter((q) => q.eq(q.field("size"), args.size))
      .unique();

    if (existingLine) {
      await ctx.db.patch(existingLine._id, {
        quantity: existingLine.quantity + args.quantity,
      });
    } else {
      await ctx.db.insert("cartItems", {
        cartId: cart._id,
        productId: args.productId,
        colorName: args.colorName,
        size: args.size,
        quantity: args.quantity,
      });
    }
    await ctx.db.patch(cart._id, { updatedAt: now });
  },
});

/** Update the quantity of a specific cart line. */
export const updateQuantity = mutation({
  args: {
    sessionId: sessionIdArg,
    cartItemId: v.id("cartItems"),
    quantity: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.quantity <= 0) {
      // Quantity of 0 (or negative) means remove — collapse to
      // removeLine so callers don't need a second branch.
      return await removeLineHelper(ctx, args.sessionId, args.cartItemId);
    }
    const line = await ctx.db.get(args.cartItemId);
    if (!line) throw new Error("Cart item not found");
    const cart = await ctx.db.get(line.cartId);
    if (!cart || cart.sessionId !== args.sessionId) {
      throw new Error("Unauthorized: cart does not belong to session");
    }
    await ctx.db.patch(args.cartItemId, { quantity: args.quantity });
    await ctx.db.patch(cart._id, { updatedAt: Date.now() });
  },
});

/** Remove a specific line from the cart. */
export const removeLine = mutation({
  args: { sessionId: sessionIdArg, cartItemId: v.id("cartItems") },
  handler: async (ctx, args) => {
    return await removeLineHelper(ctx, args.sessionId, args.cartItemId);
  },
});

async function removeLineHelper(
  ctx: { db: any },
  sessionId: string,
  cartItemId: string,
) {
  const line = await ctx.db.get(cartItemId);
  if (!line) return; // idempotent — already gone
  const cart = await ctx.db.get(line.cartId);
  if (!cart || cart.sessionId !== sessionId) {
    throw new Error("Unauthorized: cart does not belong to session");
  }
  await ctx.db.delete(cartItemId);
  await ctx.db.patch(cart._id, { updatedAt: Date.now() });
}

/** Empty the cart entirely. */
export const clear = mutation({
  args: { sessionId: sessionIdArg },
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (!cart) return;
    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .collect();
    for (const item of items) {
      await ctx.db.delete(item._id);
    }
    await ctx.db.patch(cart._id, { updatedAt: Date.now() });
  },
});
