import { NavPill } from "@/components/landing/nav-pill";
import { PolishedShader } from "@/components/landing/polished-shader";
import { ComingSoon } from "@/components/landing/coming-soon";

/**
 * Instagram placeholder route.
 *
 * The "IG" entry in the expandable nav points here so the link stays
 * intentional — clicking it lands the user on a real page that fits
 * the rest of the storefront instead of bouncing them to instagram.com
 * (where we don't have a live profile yet).
 *
 * Swap ComingSoon for the real IG feed component once the account
 * exists. The shell (shader + NavPill + centered card) will stay the
 * same.
 */
export default function InstagramPage() {
  return (
    <>
      <div className="fixed inset-0 z-0">
        <PolishedShader />
      </div>
      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24 sm:px-6">
        <ComingSoon
          eyebrow="Instagram"
          title="Coming soon"
          description="Our Instagram feed is on the way. Check back shortly for drops, behind the scenes, and styling."
        />
      </main>
      <NavPill />
    </>
  );
}
