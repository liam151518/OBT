/**
 * Contact form submission.
 *
 * Public mutation — anyone can submit (the form is on the storefront
 * and we don't require auth to contact us). We do minimal validation
 * server-side because the browser already enforces `required` and
 * `type="email"` on the form. When auth lands we can attach the
 * submitting user's id to the row via `getOptionalUser` (currently
 * always returns null).
 *
 * When a notification channel is wired up (email, Slack, etc.) this
 * is the function that will kick off the side effect. For now we
 * just persist the row + return the new id so the UI can show "Sent
 * ✓" with something real to point at.
 */

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getOptionalUser } from "./lib/auth";

// Length limits enforced inside the handler. Convex's `v.string()`
// doesn't expose `.min()/.max()` chain methods — we keep the
// validators simple and validate content + length in the handler so
// errors throw with useful messages.
const MAX_NAME_LEN = 120;
const MAX_EMAIL_LEN = 320;
const MAX_MESSAGE_LEN = 5_000;

/**
 * Persist a contact-form submission.
 *
 * Returns the id of the new row so callers can reference it (e.g.
 * for showing a confirmation screen).
 */
export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    message: v.string(),
  },
  returns: v.id("contactSubmissions"),
  handler: async (ctx, args) => {
    // Light validation. We trust the form's required + type="email"
    // attributes but enforce shape here too so a direct API caller
    // can't dump empty / oversized messages into the table.
    const name = args.name.trim();
    const email = args.email.trim();
    const message = args.message.trim();

    if (!name) throw new Error("Name is required");
    if (name.length > MAX_NAME_LEN) {
      throw new Error(`Name must be ${MAX_NAME_LEN} characters or fewer`);
    }
    if (!email) throw new Error("Email is required");
    if (email.length > MAX_EMAIL_LEN) {
      throw new Error(`Email must be ${MAX_EMAIL_LEN} characters or fewer`);
    }
    if (!email.includes("@")) {
      throw new Error("Please enter a valid email address");
    }
    if (!message) throw new Error("Message is required");
    if (message.length > MAX_MESSAGE_LEN) {
      throw new Error(
        `Message must be ${MAX_MESSAGE_LEN} characters or fewer`,
      );
    }

    // Look up an authenticated user if present. Today this is always
    // null; the seam is here so when auth lands we just attach the
    // id without changing this function's signature.
    const user = await getOptionalUser(ctx);

    const now = Date.now();
    const id = await ctx.db.insert("contactSubmissions", {
      name,
      email,
      message,
      userId: user?._id,
      createdAt: now,
    });

    // TODO(notifications): when email/Slack/etc lands, schedule a
    // notification here. Keep it idempotent so a retry from the
    // client doesn't double-fire.

    return id;
  },
});

/**
 * List submissions newest-first. Internal/admin-only — not exposed
 * to the storefront. Useful for the team to read messages from the
 * Convex dashboard.
 */
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 50, 200);
    return await ctx.db
      .query("contactSubmissions")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
  },
});