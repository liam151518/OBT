/**
 * Auth helpers.
 *
 * Auth is intentionally deferred for OBT Apparel (Clerk or WorkOS
 * TBD). These helpers provide a single seam so when auth lands we
 * only have to update this file:
 *
 *   - `getOptionalUser` — resolves the current user (or null). Use
 *     this for storefront flows that work for guests.
 *   - `requireUser` — throws if no user. Use for actions that must
 *     be authenticated (e.g. order history).
 *
 * Today both return null / throw "Not authenticated". The functions
 * are structured so the Convex identity-token lookup drops in here
 * once an auth provider is wired up.
 */

import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc } from "../_generated/dataModel";

export async function getOptionalUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  // TODO(auth): replace with `const identity = await ctx.auth.getUserIdentity()`
  // once Clerk/WorkOS is wired up, then look up by `externalId`. Until
  // then we always return null and the storefront works in guest mode.
  return null;
}

export async function requireUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users">> {
  const user = await getOptionalUser(ctx);
  if (!user) {
    throw new Error("Not authenticated");
  }
  return user;
}
