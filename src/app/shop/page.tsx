import { redirect } from "next/navigation";

/**
 * /shop → /shop/female
 *
 * Server-side redirect. The "Shop" link in the left nav pill and any
 * direct visits to `/shop` land here. We forward to `/shop/female` —
 * the brand default — without round-tripping the client.
 *
 * If we ever want a "remember last-toggled gender" redirect (so a
 * user who last visited /shop/male gets sent back there), the cleanest
 * way is a tiny client component that reads localStorage in useEffect
 * and calls `router.replace`. For now, brand default is fine.
 */
export default function ShopRedirectPage() {
  redirect("/shop/female");
}