/**
 * Convex schema for OBT Apparel.
 *
 * Initial slice (2026-06-26):
 *   - users                — placeholder for future auth (Clerk/WorkOS)
 *   - products             — product catalog (mirrors src/data/products.ts)
 *   - productVariants      — color/size variants per product
 *   - carts                — one cart per user OR guest session
 *   - cartItems            — line items in a cart
 *   - orders               — completed purchases (post-checkout)
 *   - orderItems           — line items in an order (snapshot at purchase)
 *   - contactSubmissions   — messages from the /contact page form
 *
 * Schema design notes:
 *   - Flat, relational (per Convex best practices): no nested arrays of
 *     objects inside product rows. Variants live in their own table.
 *   - Every foreign key is indexed (per schema-design rule).
 *   - Money is stored as `number` (cents) to avoid float drift.
 *   - `orders` + `orderItems` snapshot the cart at purchase time so
 *     later edits to product names/prices don't change historical orders.
 */

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ---------------------------------------------------------------------------
  // users — placeholder for future auth. Auth is intentionally deferred
  // (Clerk or WorkOS TBD). When auth lands we'll populate `clerkId` (or
  // `workosId`) from the identity provider, and read it back to resolve
  // the Convex user from `ctx.auth.getUserIdentity()`.
  // ---------------------------------------------------------------------------
  users: defineTable({
    /** Stable ID from the identity provider (e.g. Clerk user id).
     *  Empty string until auth is wired up. */
    externalId: v.string(),
    /** Display name — pulled from identity provider when auth lands. */
    name: v.string(),
    /** Email — also from the identity provider. */
    email: v.string(),
    /** Role. "customer" by default; "admin" for staff who can edit
     *  the product catalog. */
    role: v.union(v.literal("customer"), v.literal("admin")),
    /** When the user record was first created (ms since epoch). */
    createdAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_email", ["email"]),

  // ---------------------------------------------------------------------------
  // products — the catalog. Mirrors the shape of `Product` in
  // src/data/products.ts so the frontend can swap data sources without
  // changing component code.
  // ---------------------------------------------------------------------------
  products: defineTable({
    /** kebab-case slug, unique. e.g. "halter-bra" */
    slug: v.string(),
    /** Display name. e.g. "Halter Bra" */
    name: v.string(),
    /** Tapstitch SKU. e.g. "WT0063" */
    productCode: v.string(),
    /** Catalog gender — drives /shop/[gender] filtering. */
    gender: v.union(v.literal("female"), v.literal("male")),
    /** Catalog category string, e.g. "Bras", "Tees", "Bodysuits".
     *  Used by the size guide to pick measurement columns. */
    category: v.string(),
    /** Adult sizes in stock order, e.g. ["S","M","L","XL","2XL"]. */
    sizes: v.array(v.string()),
    /** How many color variants this product has on Tapstitch. */
    variantCount: v.number(),
    /** The single variant shown in the landing scatter + shop grid.
     *  Stored as a denormalized reference so the grid doesn't need a
     *  second query per tile. */
    representative: v.object({
      colorName: v.string(),
      /** Public URL of the hero image, e.g.
       *  "/products/female-halter-bra-pink-1.png". */
      src: v.string(),
      width: v.number(),
      height: v.number(),
    }),
    /** Hex color used to retint the background shader on hover/focus. */
    accent: v.string(),
    /** Tapstitch Design URL — the eventual "Buy" link. */
    tapstitchUrl: v.string(),
    /** Optional longer marketing description. Empty for now; can be
     *  populated from the catalog later. */
    description: v.optional(v.string()),
    /** Active flag — soft-delete instead of hard-delete so historical
     *  orders stay linked. Defaults true. */
    active: v.boolean(),
    /** When the product was first seeded (ms since epoch). */
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_gender", ["gender"])
    .index("by_gender_and_active", ["gender", "active"])
    .index("by_product_code", ["productCode"]),

  // ---------------------------------------------------------------------------
  // productVariants — color variants of a product. One row per
  // (productId, colorName). The `images` array holds all mockup URLs
  // for that variant (front, back, etc.) in display order.
  // ---------------------------------------------------------------------------
  productVariants: defineTable({
    productId: v.id("products"),
    /** Color display name. e.g. "Black", "Sky Blue". */
    colorName: v.string(),
    /** Tapstitch color id (numeric string). */
    colorId: v.string(),
    /** Public URL of the FIRST (hero) image for this variant. */
    src: v.string(),
    /** ALL images for this variant in display order (front → back, etc.). */
    images: v.array(v.string()),
    /** Hex accent for the variant — used to retint the shader on the
     *  product detail page when this variant is selected. */
    accent: v.string(),
    /** Stock by size. Object mapping size string → quantity.
     *  `undefined` / missing means "unknown, treat as in stock". */
    stockBySize: v.optional(v.record(v.string(), v.number())),
  })
    .index("by_product", ["productId"])
    .index("by_product_and_color", ["productId", "colorName"]),

  // ---------------------------------------------------------------------------
  // carts — one cart per authenticated user OR guest session.
  // `userId` and `sessionId` are mutually exclusive in practice but both
  // are nullable so a guest can convert to a logged-in user without
  // losing their cart.
  // ---------------------------------------------------------------------------
  carts: defineTable({
    userId: v.optional(v.id("users")),
    /** Browser-stable random id used as the cart key for guest
     *  (unauthenticated) shoppers. Set client-side and persisted to
     *  localStorage. */
    sessionId: v.optional(v.string()),
    /** Last activity timestamp — used to expire stale carts. */
    updatedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"]),

  // ---------------------------------------------------------------------------
  // cartItems — line items. Each row is (cartId, productId, colorName,
  // size, quantity). We do NOT store the unit price here because
  // product.price can change — when the order is created we snapshot
  // the price into orderItems.
  // ---------------------------------------------------------------------------
  cartItems: defineTable({
    cartId: v.id("carts"),
    productId: v.id("products"),
    /** Color chosen for this line. Free text so it survives variant
     *  renames (snapshot semantics). */
    colorName: v.string(),
    /** Size chosen for this line. Free text. */
    size: v.string(),
    quantity: v.number(),
  })
    .index("by_cart", ["cartId"])
    .index("by_cart_and_product", ["cartId", "productId"]),

  // ---------------------------------------------------------------------------
  // orders — completed purchases. Once an order is created the cart is
  // cleared and the order is the source of truth for the purchase.
  // ---------------------------------------------------------------------------
  orders: defineTable({
    /** The user who placed the order. null for guest checkouts. */
    userId: v.optional(v.id("users")),
    /** Session id used during checkout, for guest order lookups. */
    sessionId: v.optional(v.string()),
    /** Status. `pending` while payment is processing, `paid` once
     *  confirmed by the payment provider, `cancelled` / `refunded` for
     *  terminal states. */
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("cancelled"),
      v.literal("refunded"),
    ),
    /** Total in cents. Sum of all orderItems.lineTotalCents. */
    totalCents: v.number(),
    /** Currency code. ISO 4217, e.g. "USD". */
    currency: v.string(),
    /** Optional shipping address (free-form for now; structured later). */
    shipping: v.optional(
      v.object({
        name: v.string(),
        line1: v.string(),
        line2: v.optional(v.string()),
        city: v.string(),
        region: v.string(),
        postalCode: v.string(),
        country: v.string(),
      }),
    ),
    /** Optional Tapstitch order id once we've dispatched the order to
     *  the fulfillment backend. */
    tapstitchOrderId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_session", ["sessionId"])
    .index("by_status", ["status"]),

  // ---------------------------------------------------------------------------
  // orderItems — snapshot of each line at purchase time. We store the
  // productName + unit price + line total so historical orders stay
  // accurate even if products are later renamed, repriced, or deleted.
  // ---------------------------------------------------------------------------
  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    /** Product name at time of purchase (snapshot). */
    productName: v.string(),
    /** Product slug at time of purchase (snapshot, for linking back). */
    productSlug: v.string(),
    colorName: v.string(),
    size: v.string(),
    /** Unit price in cents at time of purchase (snapshot). */
    unitPriceCents: v.number(),
    quantity: v.number(),
    /** unitPriceCents * quantity (snapshot). */
    lineTotalCents: v.number(),
  }).index("by_order", ["orderId"]),

  // ---------------------------------------------------------------------------
  // contactSubmissions — messages from the /contact page form.
  // Public, unauthenticated: a guest fills in name/email/message and
  // we store it for the team to read. Authenticated users (when auth
  // lands) can also submit; we capture their `userId` if present so
  // the team can reply from inside the dashboard.
  //
  // No PII is indexed (we never query by email) — `by_createdAt` is
  // the primary access pattern: list newest-first.
  // ---------------------------------------------------------------------------
  contactSubmissions: defineTable({
    /** Display name from the form. Not necessarily a real account. */
    name: v.string(),
    /** Reply-to email. Free text — no format validation server-side
     *  beyond what the browser enforces on the form input. */
    email: v.string(),
    /** Free-form message body. */
    message: v.string(),
    /** Optional — populated when an authenticated user submits. */
    userId: v.optional(v.id("users")),
    /** Browser UA string. Helps spot spam/abuse patterns later. */
    userAgent: v.optional(v.string()),
    /** When the submission was created (ms since epoch). */
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_user", ["userId"]),
});
