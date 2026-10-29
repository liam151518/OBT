import { ContactForm } from "@/components/site/contact-form";

export const metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-[1440px] px-6 py-12">
      <p className="text-xs uppercase tracking-[0.22em] text-ink/50">Contact</p>
      <h1 className="mt-2 font-serif text-5xl tracking-tight">Write to us</h1>
      <p className="mt-4 max-w-md text-ink/70">
        Orders, sizing, or a question about the standard. We read every note.
      </p>
      <ContactForm />
    </main>
  );
}
