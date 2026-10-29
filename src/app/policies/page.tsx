import { POLICY_SECTIONS } from "@/data/policies";

export const metadata = { title: "Policies" };

export default function PoliciesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <p className="text-xs uppercase tracking-[0.22em] text-ink/50">Legal</p>
      <h1 className="mt-2 font-serif text-5xl tracking-tight">Policies</h1>
      <nav className="mt-8 flex flex-wrap gap-3 text-sm">
        {POLICY_SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`} className="rounded-full border border-black/10 px-4 py-2">
            {section.title}
          </a>
        ))}
      </nav>
      <div className="mt-12 space-y-14">
        {POLICY_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-32">
            <h2 className="font-serif text-3xl">{section.title}</h2>
            <p className="mt-3 text-ink/70">{section.summary}</p>
            <div className="mt-6 space-y-4 text-[15px] leading-7 text-ink/80">
              {section.paragraphs.map((paragraph, index) => (
                <div key={index}>
                  {paragraph.heading ? <h3 className="mb-1 font-medium text-ink">{paragraph.heading}</h3> : null}
                  <p>{paragraph.body}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
