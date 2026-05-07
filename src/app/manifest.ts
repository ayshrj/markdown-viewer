import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_ICON_PATH, SITE_NAME } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F7F6F2",
    theme_color: "#F7F6F2",
    icons: [
      {
        src: SITE_ICON_PATH,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: SITE_ICON_PATH,
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
