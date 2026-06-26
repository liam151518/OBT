"use client";

import { useEffect, useState } from "react";

/**
 * Load-in screen — shown ONCE per browser tab.
 *
 * - Full-bleed black background (placeholder — swap for video / shader later)
 * - Centered "OBT" wordmark with subtle breathing pulse + slow fade
 * - Below it, a small uppercase tagline
 * - Auto-dismisses once the window has fully loaded, with a small minimum
 *   so the brand mark is actually seen (not just flashed)
 *
 * Session persistence:
 *   - We remember in `sessionStorage` that the user has already seen
 *     the loading screen in this tab. On subsequent client-side
 *     navigations within the same tab (or after the first hard
 *     navigation), the screen skips entirely so page-to-page feels
 *     seamless — no full-screen black flash mid-navigation.
 *   - `sessionStorage` (not `localStorage`) so closing the tab and
 *     opening a fresh one DOES show the loading screen again, which
 *     matches user expectation: each fresh visit starts with the
 *     brand mark.
 */
const SEEN_KEY = "obt.loading.seen";

export function LoadingScreen({ minimumMs = 1400 }: { minimumMs?: number }) {
  // Start as `null` on the server (so SSR markup doesn't include the
  // screen on subsequent navigations if the cookie/header didn't have
  // the seen flag — the client decides). After mount, `true` if the
  // user already saw the screen this session, `false` otherwise.
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);

  useEffect(() => {
    // Check session storage on mount.
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // sessionStorage disabled — fall through and show the screen.
    }
    if (seen) {
      setHasSeen(true);
      return;
    }

    // First visit this session — show the screen, then dismiss.
    setHasSeen(false);
    const start = Date.now();
    let timer: number | undefined;

    const dismiss = () => {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, minimumMs - elapsed);
      timer = window.setTimeout(() => {
        try {
          window.sessionStorage.setItem(SEEN_KEY, "1");
        } catch {
          // ignore
        }
        setHasSeen(true);
      }, wait);
    };

    if (document.readyState === "complete") {
      dismiss();
    } else {
      window.addEventListener("load", dismiss, { once: true });
    }

    return () => {
      window.removeEventListener("load", dismiss);
      if (timer) window.clearTimeout(timer);
    };
  }, [minimumMs]);

  // Don't render anything until we know the user's session state —
  // this prevents a flash of the loading screen on navigations where
  // the user has already seen it.
  if (hasSeen !== false) return null;

  return (
    <div
      role="status"
      aria-label="Loading One Body Temple"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700 ease-out"
    >
      {/* OBT wordmark — centered, breathing */}
      <h1
        className="font-serif text-6xl font-semibold tracking-[0.28em] text-white animate-[obt-breathe_2.6s_ease-in-out_infinite] sm:text-7xl md:text-8xl"
      >
        OBT
      </h1>

      {/* Tagline */}
      <p className="mt-8 text-[0.7rem] font-medium uppercase tracking-[0.5em] text-white/40 sm:text-xs">
        One Body Temple
      </p>

      {/* Thin progress hairline */}
      <div className="absolute bottom-0 left-0 h-px w-full overflow-hidden">
        <div className="h-full w-full origin-left animate-[obt-bar_1.6s_ease-out_forwards] bg-white/30" />
      </div>

      <style jsx>{`
        @keyframes obt-breathe {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.015); }
        }
        @keyframes obt-bar {
          0%   { transform: scaleX(0); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}

export default LoadingScreen;
