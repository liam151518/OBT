/**
 * Empty 100vh placeholder section.
 *
 * History: originally contained a fixed <VideoOverlay /> over the
 * shader. The video was removed (it'll be replaced later) but the
 * scroll structure needed a 100vh section to maintain the natural
 * "scroll past the hero, products reveal below" feel.
 */
export function HeroPanel() {
  return (
    <section
      className="relative z-30 h-screen w-full"
      aria-hidden
    />
  );
}

export default HeroPanel;
