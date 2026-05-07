export const SITE_NAME = "MDLens";
export const SITE_TITLE = "MDLens";
export const ACTIVE_DOCUMENT_TITLE_COOKIE = "mdlens_active_document_title";

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

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  return withProtocol.replace(/\/+$/, "");
}

export function resolveSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    try {
      return new URL(normalizeBaseUrl(candidate)).toString().replace(/\/$/, "");
    } catch {
      continue;
    }
  }

  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
export const SITE_HOST = new URL(SITE_URL).host;

export function buildAbsoluteUrl(path: string): string {
  return new URL(path, `${SITE_URL}/`).toString();
}
