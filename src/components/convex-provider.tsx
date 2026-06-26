"use client";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import type { ReactNode } from "react";

/**
 * Convex client provider for the OBT storefront.
 *
 * Wraps the app in a ConvexProvider so any descendant component can
 * use `useQuery` / `useMutation` against the api.
 *
 * The deployment URL comes from NEXT_PUBLIC_CONVEX_URL which
 * `npx convex dev` writes to .env.local. It's exposed to the browser
 * by Next.js (NEXT_PUBLIC_ prefix) so the client can connect directly.
 *
 * Auth is deferred — `setAuth` is a no-op today. When Clerk or
 * WorkOS lands we'll wire it up here:
 *   convex.setAuth(async () => await getAuthToken())
 */

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";

// Build the client once at module load. If the env var is missing we
// render children without a provider so the app still boots during
// local development (the dev will see a console warning, but pages
// that don't use Convex will still work).
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convex) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.warn(
        "[Convex] NEXT_PUBLIC_CONVEX_URL is not set — running without backend.",
      );
    }
    return <>{children}</>;
  }
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}

export default ConvexClientProvider;
