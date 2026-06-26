import { ContactCard } from "@/components/landing/contact-card";
import { NavPill } from "@/components/landing/nav-pill";
import { PolishedShader } from "@/components/landing/polished-shader";

/**
 * Contact page.
 *
 * Composition: same as the landing and shop pages — the animated
 * PolishedShader sits as a fixed full-viewport layer behind the
 * content. The shader relies on its host element being `fixed
 * inset-0`, otherwise the canvas renders at body size and looks
 * black (it positions absolutely INSIDE its parent).
 *
 * On top:
 *   - ContactCard glass panel, centered in the viewport.
 *   - NavPill floats above everything.
 */
export default function ContactPage() {
  return (
    <>
      {/*
        Shader layer. The wrapper MUST be `fixed inset-0 z-0` — the
        PolishedShader component renders a `<Canvas className="absolute
        inset-0">` which only covers the viewport when its parent is
        itself positioned + sized to the viewport. (See
        polished-shader.tsx; LandingExperience does the same wrap.)
      */}
      <div className="fixed inset-0 z-0">
        <PolishedShader />
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center px-4 py-24 sm:px-6">
        <ContactCard />
      </main>
      <NavPill />
    </>
  );
}