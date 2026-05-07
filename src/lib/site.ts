export const SITE_URL = normalizeSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://mdlens.vercel.app"
);

export const SITE_NAME = "MDLens";

export const SITE_DESCRIPTION =
  "A focused markdown reader for multi-file sessions, outline navigation, themes, math, Mermaid diagrams, and syntax-highlighted code.";

export const SITE_KEYWORDS = [
  "MDLens",
  "Markdown reader",
  "Markdown viewer",
  "Markdown editor",
  "MDX viewer",
  "Mermaid markdown",
  "KaTeX markdown",
  "GitHub flavored markdown",
  "Markdown preview",
];

export const SITE_ICON_PATH = "/mdlens-icon.svg";
export const SITE_OG_IMAGE_PATH = "/opengraph-image";
export const SITE_TWITTER_IMAGE_PATH = "/twitter-image";

function normalizeSiteUrl(value: string): string {
  return value.replace(/\/+$/, "");
}
