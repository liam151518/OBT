"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { GlassSurface, GlassPill } from "@/components/landing/nav-pill";
import { api } from "../../../convex/_generated/api";

/**
 * The single floating contact card.
 *
 * Composition: same Liquid Glass treatment as the product detail
 * card. The animated PolishedShader runs behind it — on Chromium
 * browsers the glass refracts that shader via the SVG
 * `backdrop-filter: url(#liquid-glass)`; on Safari/Firefox the CSS
 * frost + specular rim fallback handles it.
 *
 * Visual language matches the rest of the storefront:
 *   - Heading: brand's serif display face, white.
 *   - Eyebrow + field labels: wide-tracked uppercase, white at low
 *     opacity.
 *   - Inputs are thin underlines — editorial, not form-y.
 *
 * Submit is optimistic for now (console.log + "Sent ✓" feedback +
 * form.reset). When we wire this to Convex or a server action, only
 * `onSubmit` changes.
 */
export function ContactCard() {
  // Three submit states so the UI can reflect what's happening:
  //   idle   — nothing in flight
  //   sending — mutation in progress (button disabled + "Sending…")
  //   sent   — success (button shows "Sent ✓" briefly, form resets)
  //   error  — submission failed (button re-enabled, error text shows)
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = useMutation(api.contact.submit);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (!name || !email || !message) {
      setStatus("error");
      setErrorMessage("Please fill in every field.");
      return;
    }

    setStatus("sending");
    setErrorMessage(null);
    try {
      await submit({ name, email, message });
      setStatus("sent");
      form.reset();
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("[contact] submit failed", err);
      setStatus("error");
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    }
  }

  return (
    <GlassSurface
      rounded="rounded-[1.75rem]"
      // Square-ish footprint. ~24rem wide (~384px) on desktop gives
      // room for two-up field labels on a row if we ever want them;
      // mobile falls back to viewport with margins.
      className="w-[min(24rem,calc(100vw-2rem))] px-7 py-7 sm:px-9 sm:py-8"
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {/* Heading + tagline — sit on a single line on desktop to
            keep the card's vertical footprint compact. */}
        <header className="flex flex-col gap-1.5">
          <span className="text-[9px] font-medium uppercase tracking-[0.42em] text-white/50">
            Get in touch
          </span>
          <h1 className="font-serif text-[1.7rem] font-semibold leading-[1.05] tracking-tight text-white">
            Contact
          </h1>
        </header>

        <div className="flex flex-col gap-3">
          <Field
            name="name"
            label="Name"
            type="text"
            autoComplete="name"
            required
          />
          <Field
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
          />
          <Field
            name="message"
            label="Message"
            rows={3}
            required
          />
        </div>

        <GlassPill
          className={[
            "w-full justify-center transition-transform duration-200",
            status === "idle" || status === "error"
              ? "cursor-pointer hover:scale-[1.01]"
              : "cursor-default",
          ].join(" ")}
        >
          <button
            type="submit"
            disabled={status === "sending" || status === "sent"}
            aria-label={
              status === "sent"
                ? "Message sent"
                : status === "sending"
                  ? "Sending message"
                  : "Send message"
            }
            className="block w-full px-4 py-2.5 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-white disabled:opacity-80"
          >
            {status === "sending"
              ? "Sending…"
              : status === "sent"
                ? "Sent ✓"
                : "Submit"}
          </button>
        </GlassPill>

        {/* Error message — only rendered when status === "error".
            Kept inside the form so it sits below the submit button
            without affecting the heading's position. */}
        {status === "error" && errorMessage ? (
          <p
            role="alert"
            className="text-center text-[10px] font-medium text-red-300/85"
          >
            {errorMessage}
          </p>
        ) : null}
      </form>
    </GlassSurface>
  );
}

function Field({
  name,
  label,
  type = "text",
  rows,
  autoComplete,
  required,
}: {
  name: string;
  label: string;
  type?: string;
  rows?: number;
  autoComplete?: string;
  required?: boolean;
}) {
  const baseClass = [
    "w-full",
    "bg-transparent",
    "text-sm font-light text-white",
    "placeholder-white/30",
    "border-0 border-b border-white/25",
    "outline-none",
    "transition-colors duration-200",
    "py-1.5",
    "focus:border-white/55",
  ].join(" ");

  return (
    <label className="flex flex-col gap-1">
      <span className="text-[8px] font-medium uppercase tracking-[0.32em] text-white/50">
        {label}
      </span>
      {rows ? (
        <textarea
          name={name}
          rows={rows}
          required={required}
          className={baseClass + " resize-none"}
        />
      ) : (
        <input
          name={name}
          type={type}
          autoComplete={autoComplete}
          required={required}
          className={baseClass}
        />
      )}
    </label>
  );
}

export default ContactCard;