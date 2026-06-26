/**
 * Order functions for OBT Apparel.
 *
 * Order creation is the conversion point from cart to fulfilled
 * purchase. We snapshot the cart contents into `orderItems` so
 * later edits to product names/prices don't change historical orders.
 *
 * Payment is intentionally out of scope for this initial slice.
 * When a payment provider (Stripe, etc.) is wired in, the
 * `status: "pending"` order gets updated to `"paid"` from a webhook
 * handler in an action.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create an order from the current cart for a session.
 *
 * This is a mutation (not an action) because it's pure DB work — no
 * external calls. It snapshots each line into `orderItems`, computes
 * the total, and clears the cart in one atomic operation.
 *
 * Pricing today: free. We'll add a real price snapshot once the
 * product table grows a `priceCents` field. For now every line is
 * 0 cents and the order total is 0 — the wire-up is what matters
 * for the initial slice.
 */
export const create = mutation({
  args: {
    sessionId: v.string(),
    currency: v.optional(v.string()),
  },
  returns: v.id("orders"),
  handler: async (ctx, args) => {
    const cart = await ctx.db
      .query("carts")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    if (!cart) throw new Error("No cart for session");

    const items = await ctx.db
      .query("cartItems")
      .withIndex("by_cart", (q) => q.eq("cartId", cart._id))
      .collect();
    if (items.length === 0) throw new Error("Cart is empty");

    // Snapshot productName + productSlug + unit price per line. Price
    // is 0 for now (catalog doesn't carry prices yet) — this is a
    // deliberate TODO so when prices land the snapshot already
    // exists.
    const currency = args.currency ?? "USD";
    const now = Date.now();
    let totalCents = 0;

    const orderId = await ctx.db.insert("orders", {
      sessionId: args.sessionId,
      status: "pending",
      totalCents,
      currency,
      createdAt: now,
      updatedAt: now,
    });

    for (const line of items) {
      const product = await ctx.db.get(line.productId);
      if (!product) {
        // Skip lines whose product has been deleted rather than fail
        // the whole checkout. They'd be orphaned in the cart too.
        continue;
      }
      const unitPriceCents = 0; // TODO(pricing): replace with real price
      const lineTotalCents = unitPriceCents * line.quantity;
      totalCents += lineTotalCents;
      await ctx.db.insert("orderItems", {
        orderId,
        productId: line.productId,
        productName: product.name,
        productSlug: product.slug,
        colorName: line.colorName,
        size: line.size,
        unitPriceCents,
        quantity: line.quantity,
        lineTotalCents,
      });
    }

    // Update the order total now that all lines are in.
    await ctx.db.patch(orderId, { totalCents });

    // Clear the cart — the order is now the source of truth.
    for (const line of items) {
      await ctx.db.delete(line._id);
    }
    await ctx.db.patch(cart._id, { updatedAt: now });

    return orderId;
  },
});

/** Fetch an order by id, including its line items + product refs. */
export const get = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", order._id))
      .collect();
    const hydrated = await Promise.all(
      items.map(async (line) => {
        const product = await ctx.db.get(line.productId);
        return { line, product };
      }),
    );
    return { ...order, items: hydrated };
  },
});

/** List orders for a session. Useful for a guest "my orders" page. */
export const listForSession = query({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("orders")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();
  },
});
