/**
 * Legal/policy content for /policies.
 *
 * Kept in a plain TS data file so it's trivially editable by anyone
 * who can edit copy — including a real lawyer who isn't writing
 * React. Sections render in the order they appear in this array.
 *
 * EVERYTHING HERE IS PLACEHOLDER COPY. It follows standard
 * e-commerce policy structure (Privacy / Returns / Terms /
 * Accessibility) but it's NOT legal advice. When you're ready to
 * ship to real customers, hand this file to a lawyer and have them
 * rewrite each `paragraphs` array. The structure stays the same.
 *
 * Section shape:
 *   id       — kebab-case, used as the URL anchor (#privacy etc.)
 *   title    — section heading shown in the column
 *   summary  — one-line lead. Optional but recommended.
 *   paragraphs — array of { heading?, body } rows. `heading` is
 *              shown as a sub-heading; omit for plain prose.
 */

export type PolicyParagraph = {
  /** Optional sub-heading shown above this paragraph block. */
  heading?: string;
  /** Plain-text body. Multi-line strings render as separate paragraphs. */
  body: string;
};

export type PolicySection = {
  id: string;
  title: string;
  /** Short single-sentence lead shown under the title. */
  summary: string;
  paragraphs: PolicyParagraph[];
};

export const POLICY_SECTIONS: PolicySection[] = [
  // -------------------------------------------------------------------------
  {
    id: "privacy",
    title: "Privacy",
    summary:
      "What we collect, why we collect it, and what we never do with it.",
    paragraphs: [
      {
        body: "OBT Apparel ('we', 'us', 'OBT') respects your privacy. This page explains what information we collect when you use our site, why we collect it, and what we do — and don't do — with it.",
      },
      {
        heading: "Information you give us",
        body: "When you place an order, create an account, or submit a form on this site (such as the contact form), we collect the information you provide — name, email, shipping address, and any message content. We use this information only to process your order, respond to your message, or deliver the service you signed up for.",
      },
      {
        heading: "Information we collect automatically",
        body: "Like every site on the internet, our servers log basic request data: your IP address, browser type, the pages you visit, and the time of your visit. We use this to detect abuse, debug issues, and understand which products people care about. We do not sell this data to third parties, ever.",
      },
      {
        heading: "Cookies",
        body: "We use a small number of cookies to keep you signed in and to remember your cart between visits. We do not use third-party advertising cookies.",
      },
      {
        heading: "Your data, your rights",
        body: "You can request a copy of the data we hold about you, ask us to correct it, or ask us to delete it entirely. Email hello@obtapparel.com and we'll respond within 30 days.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: "returns",
    title: "Returns",
    summary:
      "Unworn items, 30 days, no drama. Here's exactly how it works.",
    paragraphs: [
      {
        body: "We want you to love what you ordered. If something doesn't fit or isn't what you expected, you have 30 days from the delivery date to send it back for a refund or exchange.",
      },
      {
        heading: "Eligibility",
        body: "Items must be unworn, unwashed, and have all original tags attached. Final-sale items are clearly marked on the product page and cannot be returned. Bodysuits and undergarments are non-returnable once the hygiene seal is broken — please try these on over your own undergarments the first time.",
      },
      {
        heading: "How to start a return",
        body: "Email returns@obtapparel.com with your order number and the item you'd like to return. We'll send you a prepaid return label within one business day. Drop the package at any carrier location. Your refund will be issued to the original payment method within 5 business days of us receiving the return.",
      },
      {
        heading: "Exchanges",
        body: "Need a different size? Email us and we'll ship the replacement as soon as the return is in transit, so you're not waiting twice.",
      },
      {
        heading: "Damaged or wrong items",
        body: "If your order arrives damaged or you received the wrong item, email us a photo within 7 days of delivery and we'll send a replacement at no cost — no need to return the original.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: "terms",
    title: "Terms",
    summary:
      "The rules of the road. Plain English where we can, legalese where we have to.",
    paragraphs: [
      {
        body: "By using obtapparel.com or buying anything from OBT Apparel, you agree to the terms below. We've tried to keep them short and readable; if anything is unclear, email hello@obtapparel.com and we'll explain.",
      },
      {
        heading: "Orders & acceptance",
        body: "Placing an order is an offer to buy, not a guarantee of sale. We reserve the right to refuse or cancel any order (including after payment) if pricing is incorrect, stock is unavailable, the order looks like fraud, or for any other reason. If we cancel an order you've already paid for, we'll refund you in full.",
      },
      {
        heading: "Pricing",
        body: "All prices are in US Dollars and exclude any customs duties or taxes that may apply to international shipments. Those are the customer's responsibility.",
      },
      {
        heading: "Intellectual property",
        body: "Everything on this site — designs, photography, copy, code, the OBT wordmark and logos — is owned by OBT Apparel or our licensors. Please don't reproduce it without permission.",
      },
      {
        heading: "Disclaimers & liability",
        body: "We do our best to make this site accurate and reliable, but we can't guarantee it's error-free or always available. To the maximum extent permitted by law, OBT Apparel is not liable for any indirect or consequential damages arising from your use of this site.",
      },
      {
        heading: "Governing law",
        body: "These terms are governed by the laws of the State of California, USA, without regard to its conflict of laws rules.",
      },
    ],
  },

  // -------------------------------------------------------------------------
  {
    id: "accessibility",
    title: "Accessibility",
    summary:
      "We're building this site to be usable by everyone. Here's where we are and how to flag issues.",
    paragraphs: [
      {
        body: "We believe a premium product deserves a premium experience for everyone. OBT Apparel is designed and built to meet WCAG 2.1 Level AA — the international standard for digital accessibility.",
      },
      {
        heading: "What we've done",
        body: "Every interactive element is keyboard-reachable. Text contrast meets or exceeds AA ratios on every surface. Form fields have visible labels, not just placeholders. Buttons announce themselves to screen readers with descriptive aria-labels. The animated background on this site respects the prefers-reduced-motion preference — if your device is set to reduce motion, the animation stops.",
      },
      {
        heading: "What's still in progress",
        body: "We're actively auditing product imagery for alt text and refining the colour-picking interaction on product detail pages. This page will be updated as we ship improvements.",
      },
      {
        heading: "Found something broken?",
        body: "Email accessibility@obtapparel.com with the page you were on, what you tried to do, and what blocked you. We treat accessibility bugs as shipping blockers and aim to fix them within 5 business days.",
      },
    ],
  },
];