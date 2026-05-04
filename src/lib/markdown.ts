import GithubSlugger from "github-slugger";
import matter from "gray-matter";
import type {
  DocumentStats,
  HeadingItem,
  ParsedMarkdownDocument,
} from "@/types/markdown";

const WORDS_PER_MINUTE = 220;

export function parseMarkdownDocument(
  source: string,
  filename: string | undefined,
  updatedAt: number,
): ParsedMarkdownDocument {
  const parsed = parseFrontmatter(source);
  const headings = extractHeadings(parsed.content);
  const title = getTitle(parsed.frontmatter, headings, filename);

  return {
    source,
    filename,
    title,
    frontmatter: parsed.frontmatter,
    updatedAt,
    content: parsed.content,
    headings,
  };
}

export function getDocumentStats(
  content: string,
  headings: HeadingItem[],
): DocumentStats {
  const words = stripMarkdown(content)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean).length;

  return {
    words,
    characters: content.length,
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)),
    headings: headings.length,
  };
}

export function formatFrontmatterValue(value: unknown): string {
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }

  if (value && typeof value === "object") {
    return JSON.stringify(value);
  }

  if (value === undefined || value === null || value === "") {
    return "empty";
  }

  return String(value);
}

function parseFrontmatter(source: string): {
  content: string;
  frontmatter: Record<string, unknown>;
} {
  try {
    const parsed = matter(source);

    return {
      content: parsed.content.trimStart(),
      frontmatter: isRecord(parsed.data) ? parsed.data : {},
    };
  } catch {
    return {
      content: source,
      frontmatter: {},
    };
  }
}

function extractHeadings(content: string): HeadingItem[] {
  const slugger = new GithubSlugger();
  const headings: HeadingItem[] = [];
  let insideFence = false;

  for (const line of content.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      insideFence = !insideFence;
      continue;
    }

    if (insideFence) {
      continue;
    }

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);

    if (!match) {
      continue;
    }

    const text = cleanInlineMarkdown(match[2]);

    if (!text) {
      continue;
    }

    headings.push({
      id: slugger.slug(text),
      depth: match[1].length,
      text,
    });
  }

  return headings;
}

function cleanInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/[*_~#]/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

function stripMarkdown(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/~~~[\s\S]*?~~~/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/[#>*_`~|[\]()-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTitle(
  frontmatter: Record<string, unknown>,
  headings: HeadingItem[],
  filename: string | undefined,
): string {
  if (typeof frontmatter.title === "string" && frontmatter.title.trim()) {
    return frontmatter.title.trim();
  }

  if (headings[0]?.text) {
    return headings[0].text;
  }

  if (filename) {
    return filename.replace(/\.(md|markdown|mdx|txt)$/i, "");
  }

  return "Untitled Markdown";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
