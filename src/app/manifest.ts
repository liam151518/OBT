import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "One Body Temple",
    short_name: "OBT",
    description:
      "Premium apparel for people who believe the body is a gift: not to be neglected, not to be worshipped, but to be stewarded.",
    start_url: "/",
    display: "standalone",
    background_color: "#0E0E0E",
    theme_color: "#0E0E0E",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
