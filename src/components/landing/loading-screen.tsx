"use client";

import { useEffect, useState } from "react";

/**
 * Load-in screen.
 *
 * - Full-bleed black background (placeholder — swap for video / shader later)
 * - Centered "OBT" wordmark with subtle breathing pulse + slow fade
 * - Below it, a small uppercase tagline
 * - Auto-dismisses once the window has fully loaded, with a small minimum
 *   so the brand mark is actually seen (not just flashed)
 */
export function LoadingScreen({ minimumMs = 1400 }: { minimumMs?: number }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const start = Date.now();
    let timer: number | undefined;

    const dismiss = () => {
      const elapsed = Date.now() - start;
      const wait = Math.max(0, minimumMs - elapsed);
      timer = window.setTimeout(() => setHidden(true), wait);
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

  if (hidden) return null;

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
