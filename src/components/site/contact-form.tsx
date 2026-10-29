"use client";

import { useState, type FormEvent } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function ContactForm() {
  const submit = useMutation(api.contact.submit);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (!name || !email || !message) {
      setStatus("error");
      setError("Fill in every field.");
      return;
    }
    setStatus("sending");
    setError(null);
    try {
      await submit({ name, email, message });
      setStatus("sent");
      event.currentTarget.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-5">
      <label className="block text-sm">
        Name
        <input name="name" required className="mt-1 w-full border-b border-black/15 bg-transparent py-2 outline-none" />
      </label>
      <label className="block text-sm">
        Email
        <input name="email" type="email" required className="mt-1 w-full border-b border-black/15 bg-transparent py-2 outline-none" />
      </label>
      <label className="block text-sm">
        Message
        <textarea name="message" required rows={5} className="mt-1 w-full resize-none border-b border-black/15 bg-transparent py-2 outline-none" />
      </label>
      <button
        type="submit"
        disabled={status === "sending"}
        className="rounded-full bg-ink px-6 py-3 text-sm font-medium text-white"
      >
        {status === "sent" ? "Sent" : status === "sending" ? "Sending…" : "Send"}
      </button>
      {error ? <p className="text-sm text-ember">{error}</p> : null}
    </form>
  );
}
