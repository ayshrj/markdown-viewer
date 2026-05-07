"use client";

/* eslint-disable @next/next/no-img-element */

import type { MouseEvent, ReactNode } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema, type Options as SanitizeOptions } from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { Node } from "unist";
import { visit } from "unist-util-visit";

import { HighlightedCode } from "@/components/highlighted-code";
import { MermaidBlock } from "@/components/mermaid-block";

type MarkdownRendererProps = {
  content: string;
  onCodeLanguageSelect?: (fenceStartOffset: number, language: string) => void;
  onLinkClick?: (href: string) => boolean;
};

type DirectiveNode = Node & {
  type: string;
  name?: string;
  label?: string;
  attributes?: Record<string, string>;
  children?: Node[];
  data?: Record<string, unknown>;
};

type MdastNode = Node & {
  type: string;
  value?: string;
  children?: MdastNode[];
  data?: Record<string, unknown>;
};

type PositionedNode = {
  position?: {
    start?: {
      offset?: number;
    };
  };
};

const CALLOUT_TYPES = new Set(["tip", "warning", "danger", "info", "note", "success"]);

const GITHUB_ALERT_MAP: Record<string, string> = {
  NOTE: "note",
  TIP: "tip",
  IMPORTANT: "info",
  WARNING: "warning",
  CAUTION: "danger",
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function isSafeUrl(value?: string) {
  if (!value) return false;

  const trimmed = value.trim();

  if (trimmed.startsWith("#") || trimmed.startsWith("/") || trimmed.startsWith("./") || trimmed.startsWith("../")) {
    return true;
  }

  try {
    const url = new URL(trimmed);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

// Supports:
// :::tip
// Content
// :::
//
// :::warning[Custom title]
// Content
// :::
//
// :::info{title="Custom title"}
// Content
// :::
function remarkCalloutDirectives() {
  return (tree: Node) => {
    visit(tree, rawNode => {
      const node = rawNode as DirectiveNode;

      if (node.type !== "containerDirective" && node.type !== "leafDirective" && node.type !== "textDirective") {
        return;
      }

      const name = node.name ?? "";

      if (!CALLOUT_TYPES.has(name)) return;

      node.data ??= {};

      const customTitle = node.attributes?.title || node.attributes?.label || node.label || titleCase(name);

      node.data.hName = "div";
      node.data.hProperties = {
        className: `callout callout-${name}`,
        "data-callout": name,
        "data-label": customTitle,
      };
    });
  };
}

// Supports GitHub alerts:
//
// > [!NOTE]
// > This is a note.
//
// > [!WARNING]
// > Be careful.
function remarkGithubAlerts() {
  return (tree: Node) => {
    visit(tree, rawNode => {
      const node = rawNode as MdastNode;

      if (node.type !== "blockquote") return;

      const firstChild = node.children?.[0];
      const firstGrandChild = firstChild?.children?.[0];

      if (firstChild?.type !== "paragraph" || firstGrandChild?.type !== "text" || !firstGrandChild.value) {
        return;
      }

      const match = firstGrandChild.value.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n?/);

      if (!match) return;

      const githubType = match[1];
      const calloutType = GITHUB_ALERT_MAP[githubType];

      firstGrandChild.value = firstGrandChild.value.replace(match[0], "");

      node.data ??= {};
      node.data.hName = "div";
      node.data.hProperties = {
        className: `callout callout-${calloutType}`,
        "data-callout": calloutType,
        "data-label": titleCase(calloutType),
      };

      // Remove empty first paragraph if alert marker was the only content there.
      if (!firstGrandChild.value.trim()) {
        firstChild.children = firstChild.children?.slice(1) ?? [];

        if (firstChild.children.length === 0) {
          node.children = node.children?.slice(1) ?? [];
        }
      }
    });
  };
}

const sanitizeSchema: SanitizeOptions = {
  ...defaultSchema,

  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto", "tel"],
    src: ["http", "https"],
  },

  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "abbr",
    "details",
    "figcaption",
    "figure",
    "kbd",
    "mark",
    "sub",
    "summary",
    "sup",
  ],

  attributes: {
    ...defaultSchema.attributes,

    a: [...(defaultSchema.attributes?.a ?? []), "ariaLabel", "className", "target", "rel", "title"],

    abbr: [...(defaultSchema.attributes?.abbr ?? []), "title"],

    code: [...(defaultSchema.attributes?.code ?? []), ["className", /^language-./]],

    details: [...(defaultSchema.attributes?.details ?? []), "open"],

    div: [...(defaultSchema.attributes?.div ?? []), "className", "data-callout", "data-label"],

    figure: [...(defaultSchema.attributes?.figure ?? []), "className"],
    figcaption: [...(defaultSchema.attributes?.figcaption ?? []), "className"],

    h1: [...(defaultSchema.attributes?.h1 ?? []), "id", "className"],
    h2: [...(defaultSchema.attributes?.h2 ?? []), "id", "className"],
    h3: [...(defaultSchema.attributes?.h3 ?? []), "id", "className"],
    h4: [...(defaultSchema.attributes?.h4 ?? []), "id", "className"],
    h5: [...(defaultSchema.attributes?.h5 ?? []), "id", "className"],
    h6: [...(defaultSchema.attributes?.h6 ?? []), "id", "className"],

    img: [...(defaultSchema.attributes?.img ?? []), "alt", "src", "title", "width", "height", "loading"],

    input: [...(defaultSchema.attributes?.input ?? []), ["type", "checkbox"], "checked", "disabled", "readOnly"],

    li: [...(defaultSchema.attributes?.li ?? []), "className"],

    mark: [...(defaultSchema.attributes?.mark ?? []), "className"],

    ol: [...(defaultSchema.attributes?.ol ?? []), "className", "start"],

    section: [...(defaultSchema.attributes?.section ?? []), "className", "data-footnotes"],

    span: [...(defaultSchema.attributes?.span ?? []), "className"],

    summary: [...(defaultSchema.attributes?.summary ?? []), "className"],

    sup: [...(defaultSchema.attributes?.sup ?? []), "id"],

    table: [...(defaultSchema.attributes?.table ?? []), "className"],
    tbody: [...(defaultSchema.attributes?.tbody ?? []), "className"],
    td: [...(defaultSchema.attributes?.td ?? []), "align", "className"],
    th: [...(defaultSchema.attributes?.th ?? []), "align", "className"],
    thead: [...(defaultSchema.attributes?.thead ?? []), "className"],
    tr: [...(defaultSchema.attributes?.tr ?? []), "className"],

    ul: [...(defaultSchema.attributes?.ul ?? []), "className"],
  },
};

function createHeading(level: 1 | 2 | 3 | 4 | 5 | 6) {
  const Tag = `h${level}` as const;

  return function Heading({ children, id }: { children?: ReactNode; id?: string }) {
    return <Tag id={id}>{children}</Tag>;
  };
}

function getNodeStartOffset(node: unknown): number | undefined {
  const offset = (node as PositionedNode | undefined)?.position?.start?.offset;
  return typeof offset === "number" && Number.isFinite(offset) ? offset : undefined;
}

function isFenceStartOffset(content: string, offset: number | undefined): boolean {
  if (typeof offset !== "number") return false;

  const lineStart = content.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
  const lineEnd = content.indexOf("\n", offset);
  const line = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd);

  return /^[ \t]*(`{3,}|~{3,})/.test(line);
}

function createComponents(
  content: string,
  onLinkClick: MarkdownRendererProps["onLinkClick"],
  onCodeLanguageSelect: MarkdownRendererProps["onCodeLanguageSelect"]
): Components {
  return {
    a: ({ children, className, href, rel, target, title }) => {
      const safeHref = typeof href === "string" && isSafeUrl(href) ? href : undefined;

      function handleClick(event: MouseEvent<HTMLAnchorElement>) {
        if (!safeHref || !onLinkClick) return;

        const handled = onLinkClick(safeHref);

        if (handled) {
          event.preventDefault();
        }
      }

      if (!safeHref) {
        return <span className={className}>{children}</span>;
      }

      return (
        <a className={className} href={safeHref} onClick={handleClick} rel={rel} target={target} title={title}>
          {children}
        </a>
      );
    },

    blockquote: ({ children }) => <blockquote>{children}</blockquote>,

    code: ({ children, className, node }) => {
      const code = String(children).replace(/\n$/, "");
      const language = /language-(\S+)/.exec(className ?? "")?.[1];
      const fenceStartOffset = getNodeStartOffset(node);
      const isFencedBlock = isFenceStartOffset(content, fenceStartOffset);
      const isBlock = isFencedBlock || Boolean(language) || code.includes("\n");

      if (!isBlock) {
        return <code className={className}>{children}</code>;
      }

      if (language?.toLowerCase() === "mermaid") {
        return <MermaidBlock code={code} />;
      }

      return (
        <HighlightedCode
          code={code}
          fenceStartOffset={fenceStartOffset}
          language={language}
          onLanguageSelect={
            isFencedBlock && typeof fenceStartOffset === "number" && onCodeLanguageSelect
              ? nextLanguage => onCodeLanguageSelect(fenceStartOffset, nextLanguage)
              : undefined
          }
        />
      );
    },

    h1: createHeading(1),
    h2: createHeading(2),
    h3: createHeading(3),
    h4: createHeading(4),
    h5: createHeading(5),
    h6: createHeading(6),

    img: ({ alt, src, title }) => {
      const safeSrc = typeof src === "string" && isSafeUrl(src) ? src : undefined;

      if (!safeSrc) return null;

      const image = <img alt={alt ?? ""} loading="lazy" src={safeSrc} title={title} />;

      if (!title) return image;

      return (
        <span className="image-figure" role="figure">
          {image}
          <span className="image-caption">{title}</span>
        </span>
      );
    },

    input: ({ checked, type }) => {
      if (type !== "checkbox") return null;

      return (
        <input
          aria-label={checked ? "Completed task" : "Incomplete task"}
          checked={Boolean(checked)}
          className="task-checkbox"
          disabled
          readOnly
          type="checkbox"
        />
      );
    },

    pre: ({ children }) => <>{children}</>,

    table: ({ children }) => (
      <div className="table-scroll">
        <table>{children}</table>
      </div>
    ),
  };
}

export function MarkdownRenderer({ content, onCodeLanguageSelect, onLinkClick }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      components={createComponents(content, onLinkClick, onCodeLanguageSelect)}
      rehypePlugins={[
        rehypeRaw,
        [rehypeSanitize, sanitizeSchema],
        rehypeSlug,
        [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              ariaLabel: "Link to this heading",
              className: ["heading-anchor"],
            },
          },
        ],
        rehypeKatex,
        [
          rehypeExternalLinks,
          {
            rel: ["noopener", "noreferrer"],
            target: "_blank",
          },
        ],
      ]}
      remarkPlugins={[
        remarkDirective,
        remarkGithubAlerts,
        remarkCalloutDirectives,
        remarkFrontmatter,
        [remarkGfm, { singleTilde: false }],
        remarkMath,
      ]}
    >
      {content}
    </ReactMarkdown>
  );
}
