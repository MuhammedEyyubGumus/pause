import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "PAUSE · Peace Therapist",
    short_name: "PAUSE",
    description: "Peace Therapist · Dürtü ile davranış arasındaki alanı büyüt.",
    lang: "tr",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FBF9FC",
    theme_color: "#92278F",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // İkona uzun basınca doğrudan SOS (Android)
    shortcuts: [
      {
        name: "Çok güçlü dürtü",
        short_name: "SOS",
        url: "/sos",
        icons: [{ src: "/icons/shortcut-sos-96.png", sizes: "96x96", type: "image/png" }],
      },
    ],
  };
}
