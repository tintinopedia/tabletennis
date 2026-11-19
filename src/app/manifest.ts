import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Tintinopedia",
    short_name: "Tintinopedia",
    description: "Tintin's table tennis journal: training sessions, drill scores, heart rate, mantra and blog.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#080d17",
    theme_color: "#080d17",
    categories: ["sports", "health", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Training", url: "/train", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Blog", url: "/blog", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
