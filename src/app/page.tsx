import { PolishedShader } from "@/components/landing/polished-shader";
import { NavPill } from "@/components/landing/nav-pill";

export default function HomePage() {
  return (
    <>
      <div className="fixed inset-0 bg-black">
        <PolishedShader />
      </div>
      <NavPill />
    </>
  );
}
