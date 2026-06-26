import { NavPill } from "@/components/landing/nav-pill";
import { PolishedShader } from "@/components/landing/polished-shader";
import { PoliciesView } from "@/components/landing/policies-view";

/**
 * Policies page.
 *
 * Composition: same animated shader background as the rest of the
 * site (see contact/page.tsx for the wrapper pattern — the shader
 * component renders `<Canvas className="absolute inset-0">` and
 * needs a `fixed inset-0 z-0` parent to cover the viewport).
 *
 * On top: the PoliciesView, which lays out a sticky rail of section
 * anchors on the left and the actual legal copy on the right.
 *
 * Legal copy itself lives in `src/data/policies.ts` so it can be
 * edited (and eventually replaced with lawyer-reviewed text)
 * without touching layout code.
 */
export default function PoliciesPage() {
  return (
    <>
      <div className="fixed inset-0 z-0">
        <PolishedShader />
      </div>
      <PoliciesView />
      <NavPill />
    </>
  );
}