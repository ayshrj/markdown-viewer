import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface MetaResult {
  url: string;
  finalUrl: string;
  title: string | null;
  description: string | null;
  favicon: string | null;
  favicons: string[];
  icons: { rel: string; href: string; sizes?: string; type?: string }[];
  appleTouchIcon: string | null;
  themeColor: string | null;
  canonical: string | null;
  lang: string | null;
  charset: string | null;
  author: string | null;
  keywords: string | null;
  openGraph: Record<string, string>;
  twitter: Record<string, string>;
  jsonLd: unknown[];
  meta: Record<string, string>;
  links: { rel: string; href: string }[];
  fetchedAt: string;
}

function absolutize(href: string, base: string): string {
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

function attr(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const m = tag.match(re);
  if (!m) return null;
  return (m[2] ?? m[3] ?? m[4] ?? "").trim();
}

// Blocks fetches to loopback/private/link-local addresses so this endpoint
// (which fetches whatever URL a caller supplies) can't be used to probe
// internal network services or cloud metadata endpoints (SSRF).
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1") return true;

  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 0) return true;
    return false;
  }

  // Bracketed/plain IPv6 private & link-local ranges.
  if (host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return true;

  return false;
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing ?url= parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("bad protocol");
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (isBlockedHost(parsed.hostname)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  let res: Response;
  try {
    res = await fetch(parsed.href, {
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; MetaBot/1.0; +https://example.com/bot)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000),
    });
  } catch (e) {
    return NextResponse.json({ error: "Failed to fetch", detail: String(e) }, { status: 502 });
  }

  const finalUrl = res.url || parsed.href;

  // The redirect chain could still land on a blocked/internal host even
  // though the original URL was fine — re-check after following redirects.
  try {
    if (isBlockedHost(new URL(finalUrl).hostname)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const html = await res.text();
  const head = html.slice(0, html.search(/<\/head>/i) + 7 || html.length);

  // --- parse tags ---
  const metaTags = head.match(/<meta\b[^>]*>/gi) ?? [];
  const linkTags = head.match(/<link\b[^>]*>/gi) ?? [];

  const meta: Record<string, string> = {};
  const openGraph: Record<string, string> = {};
  const twitter: Record<string, string> = {};

  for (const tag of metaTags) {
    const content = attr(tag, "content");
    if (content == null) continue;
    const name = attr(tag, "name");
    const property = attr(tag, "property");
    if (property?.startsWith("og:")) openGraph[property.slice(3)] = content;
    else if (property) meta[property] = content;
    if (name?.startsWith("twitter:")) twitter[name.slice(8)] = content;
    else if (name) meta[name] = content;
  }

  const links: { rel: string; href: string }[] = [];
  const icons: MetaResult["icons"] = [];
  const favicons: string[] = [];
  let appleTouchIcon: string | null = null;
  let canonical: string | null = null;

  for (const tag of linkTags) {
    const rel = (attr(tag, "rel") ?? "").toLowerCase();
    const href = attr(tag, "href");
    if (!href) continue;
    const abs = absolutize(href, finalUrl);
    links.push({ rel, href: abs });

    if (rel.includes("icon")) {
      icons.push({
        rel,
        href: abs,
        sizes: attr(tag, "sizes") ?? undefined,
        type: attr(tag, "type") ?? undefined,
      });
      favicons.push(abs);
      if (rel.includes("apple-touch-icon")) appleTouchIcon = abs;
    }
    if (rel === "canonical") canonical = abs;
  }

  // default /favicon.ico fallback
  const defaultFavicon = absolutize("/favicon.ico", finalUrl);
  if (!favicons.includes(defaultFavicon)) favicons.push(defaultFavicon);

  // pick best favicon: prefer one with sizes, then first
  const favicon =
    icons.sort((a, b) => {
      const sa = parseInt(a.sizes ?? "0") || 0;
      const sb = parseInt(b.sizes ?? "0") || 0;
      return sb - sa;
    })[0]?.href ?? defaultFavicon;

  // title
  const titleMatch = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = openGraph.title ?? (titleMatch ? titleMatch[1].trim() : null);

  // charset / lang
  const charsetMeta = metaTags.find(t => /charset/i.test(t));
  const charset = charsetMeta ? attr(charsetMeta, "charset") : null;
  const langMatch = html.match(/<html[^>]*\blang\s*=\s*["']([^"']+)["']/i);

  // JSON-LD
  const jsonLd: unknown[] = [];
  const ldMatches = html.matchAll(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const m of ldMatches) {
    try {
      jsonLd.push(JSON.parse(m[1].trim()));
    } catch {
      /* ignore invalid */
    }
  }

  const result: MetaResult = {
    url: target,
    finalUrl,
    title,
    description: openGraph.description ?? meta["description"] ?? null,
    favicon,
    favicons: [...new Set(favicons)],
    icons,
    appleTouchIcon,
    themeColor: meta["theme-color"] ?? null,
    canonical,
    lang: langMatch ? langMatch[1] : null,
    charset,
    author: meta["author"] ?? null,
    keywords: meta["keywords"] ?? null,
    openGraph,
    twitter,
    jsonLd,
    meta,
    links,
    fetchedAt: new Date().toISOString(),
  };

  return NextResponse.json(result, {
    headers: { "Cache-Control": "s-maxage=3600, stale-while-revalidate" },
  });
}
