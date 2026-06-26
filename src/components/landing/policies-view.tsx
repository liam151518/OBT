"use client";

import { useEffect, useState } from "react";
import { GlassPill } from "@/components/landing/nav-pill";
import { POLICY_SECTIONS, type PolicySection } from "@/data/policies";

/**
 * Policies page view.
 *
 * Layout:
 *   1. A horizontal pill row pinned under the NavPill, holding one
 *      pill per policy section. Each pill is a real anchor link so
 *      the URL is shareable (#privacy etc). The active pill is
 *      highlighted by an IntersectionObserver that tracks which
 *      section is currently in view.
 *   2. The policy content itself: eyebrow, serif heading, then each
 *      section rendered as an <article> with `scroll-mt-32` so anchor
 *      jumps clear the navbar + the section pill row.
 *
 * Mobile behaviour:
 *   - The pill row scrolls horizontally (`overflow-x-auto`,
 *     `scroll-smooth`) so all four pills are reachable even on
 *     narrow viewports without wrapping or overflow.
 *   - The content column goes single-column with comfortable padding.
 *
 * The page-level wrapper (policies/page.tsx) provides the animated
 * PolishedShader background; this view stacks content on top.
 */
export function PoliciesView() {
  return (
    <>
      <SectionPillRow />
      <main className="relative z-10 mx-auto flex w-full max-w-4xl flex-col px-4 pb-24 pt-32 sm:px-8 sm:pt-36">
        <PageHeader />
        <Content />
      </main>
    </>
  );
}

/**
 * The horizontal pill row of section anchors.
 *
 * Pinned to the viewport just below the existing NavPill (which sits
 * at `top-5 sm:top-6` with a left column that's roughly 3.5rem tall
 * when the gender pill is hidden — i.e. on the /policies page).
 * The row itself is left-aligned to match the expandable nav above.
 *
 * On mobile the row scrolls horizontally so all four pills fit
 * without wrapping. We use `scrollbar-width: none` and hide the
 * webkit scrollbar so it doesn't look like a scroller — just a
 * swipeable row.
 */
function SectionPillRow() {
  const active = useActiveSection(POLICY_SECTIONS.map((s) => s.id));

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-[4rem] z-30 flex justify-start px-4 sm:top-[4.5rem] sm:px-6"
      // The pill row itself is pointer-events-none so clicks fall
      // through to the page underneath. The pills re-enable
      // pointer-events on themselves.
    >
      <nav
        aria-label="Policy sections"
        className="pointer-events-auto"
      >
        <ul
          className={[
            "flex flex-row items-center gap-1.5",
            "overflow-x-auto",
            "[-ms-overflow-style:none] [scrollbar-width:none]",
            "[&::-webkit-scrollbar]:hidden",
            "scroll-smooth",
            // First pill aligned to the left edge; no left padding so
            // the row sits flush against the expandable nav above.
            "py-1",
          ].join(" ")}
        >
          {POLICY_SECTIONS.map((section) => {
            const isActive = active === section.id;
            return (
              <li key={section.id} className="shrink-0">
                <a
                  href={`#${section.id}`}
                  className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-full"
                  aria-current={isActive ? "true" : undefined}
                >
                  {/*
                    Active state is achieved by toggling `isActive`
                    below — it darkens the pill and bumps the label
                    opacity so it reads as the current section.
                  */}
                  <Pill isActive={isActive}>
                    {section.title}
                  </Pill>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

/**
 * One pill in the section row. Wraps `GlassPill` so it inherits
 * the Liquid Glass treatment that the rest of the storefront uses.
 *
 * `isActive` switches the inner content to a brighter style so the
 * user can see which section they're reading.
 */
function Pill({
  isActive,
  children,
}: {
  isActive: boolean;
  children: React.ReactNode;
}) {
  return (
    <GlassPill
      className={[
        "px-4 py-2",
        "transition-colors duration-200",
      ].join(" ")}
      style={
        isActive
          ? { backgroundColor: "rgba(255,255,255,0.18)" }
          : undefined
      }
    >
      <span
        className={[
          "whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.22em]",
          "transition-colors duration-200",
          isActive ? "text-white" : "text-white/60",
        ].join(" ")}
      >
        {children}
      </span>
    </GlassPill>
  );
}

/**
 * Page-level heading + meta line. Lives inside the main flow, not
 * fixed — so it scrolls with the content.
 */
function PageHeader() {
  return (
    <header className="mb-14 flex flex-col gap-2 sm:mb-20">
      <span className="text-[9px] font-medium uppercase tracking-[0.42em] text-white/55">
        Legal
      </span>
      <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
        Policies
      </h1>
      <p className="mt-2 max-w-prose text-[13px] font-normal leading-relaxed text-white/65">
        The fine print, in plain English. Updated{" "}
        {new Date().toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
        .
      </p>
    </header>
  );
}

/**
 * The four policy sections rendered in a single column with generous
 * vertical spacing between them.
 */
function Content() {
  return (
    <article className="flex flex-col gap-16 sm:gap-20">
      {POLICY_SECTIONS.map((section) => (
        <PolicySectionView key={section.id} section={section} />
      ))}
    </article>
  );
}

function PolicySectionView({ section }: { section: PolicySection }) {
  const index = POLICY_SECTIONS.findIndex((s) => s.id === section.id);
  return (
    <section
      id={section.id}
      // `scroll-mt-32` offsets the sticky header + section pill row
      // height when an anchor link jumps the user to the section.
      // Without this the section title would be hidden behind the
      // navbar.
      className="scroll-mt-32"
    >
      <div className="mb-6 flex flex-col gap-2">
        <span className="text-[9px] font-medium uppercase tracking-[0.32em] text-white/45">
          {String(index + 1).padStart(2, "0")} · Section
        </span>
        <h2 className="font-serif text-3xl font-semibold leading-[1.05] tracking-tight text-white sm:text-4xl">
          {section.title}
        </h2>
        <p className="mt-1 max-w-prose text-[13px] font-normal leading-relaxed text-white/65">
          {section.summary}
        </p>
      </div>

      <div className="flex max-w-prose flex-col gap-5">
        {section.paragraphs.map((p, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            {p.heading ? (
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80">
                {p.heading}
              </h3>
            ) : null}
            <p className="text-[14px] font-light leading-relaxed text-white/85">
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Returns the id of the section currently in view. Uses an
 * IntersectionObserver with rootMargin biased toward the top so the
 * "active" pill flips when the section title crosses roughly the
 * upper third of the viewport.
 */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.boundingClientRect.top);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          const topmost = [...visible.entries()].sort(
            (a, b) => a[1] - b[1],
          )[0][0];
          setActive(topmost);
        }
      },
      {
        rootMargin: "-25% 0px -55% 0px",
        threshold: 0,
      },
    );

    for (const el of sections) observer.observe(el);
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

export default PoliciesView;