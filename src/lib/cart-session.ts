"use client";

import { useEffect, useState } from "react";

/**
 * Stable, browser-local session id used as the cart key for guest
 * (unauthenticated) shoppers. Stored in localStorage so the same id
 * survives page reloads and route changes. When auth lands we'll
 * switch this to a user-keyed cart at sign-in time.
 *
 * Returns `null` until the id has been read from localStorage to
 * avoid hydration mismatches between SSR and client.
 */

const CART_SESSION_KEY = "obt.cart.sessionId";

function readSessionId(): string {
  try {
    const existing = window.localStorage.getItem(CART_SESSION_KEY);
    if (existing) return existing;
  } catch {
    // localStorage may be disabled (Safari private mode, etc.)
  }
  const fresh = generateId();
  try {
    window.localStorage.setItem(CART_SESSION_KEY, fresh);
  } catch {
    // ignore — store in memory at minimum so the session works
  }
  return fresh;
}

function generateId(): string {
  // 21 chars of random base36 ≈ 100 bits of entropy. Collisions are
  // astronomically unlikely at OBT's traffic scale.
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes, (b) => b.toString(36).padStart(2, "0")).join("");
}

export function useCartSessionId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    setId(readSessionId());
  }, []);
  return id;
}
