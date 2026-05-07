"use client";

/* eslint-disable @next/next/no-img-element */

import type { MouseEvent } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeExternalLinks from "rehype-external-links";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, {
  defaultSchema,
  type Options as SanitizeOptions,
} from "rehype-sanitize";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";
import type { Node } from "unist";
import { HighlightedCode } from "@/components/highlighted-code";
import { MermaidBlock } from "@/components/mermaid-block";

type MarkdownRendererProps = {
  content: string;
  onLinkClick?: (href: string) => boolean;
};

// Transforms :::tip, :::warning, :::danger, :::info, :::note containers
// into <div class="callout callout-{type}"> elements.

type DirectiveNode = Node & {
  type: string;
  name?: string;
  attributes?: Record<string, string>;
  children?: Node[];
  data?: Record<string, unknown>;
};

function remarkCalloutDirectives() {
  const CALLOUT_TYPES = new Set([
    "tip",
    "warning",
    "danger",
    "info",
    "note",
    "success",
  ]);

  return (tree: Node) => {
    visit(tree, (rawNode) => {
      const node = rawNode as DirectiveNode;

      if (
        node.type !== "containerDirective" &&
        node.type !== "leafDirective" &&
        node.type !== "textDirective"
      )
        return;

      const name = node.name ?? "";

      if (!CALLOUT_TYPES.has(name)) return;

      // Attach hast properties so rehype-raw can render the div
      node.data ??= {};
      const data = node.data;
      const label = name.charAt(0).toUpperCase() + name.slice(1);

      data.hName = "div";
      data.hProperties = {
        className: `callout callout-${name}`,
        "data-callout": name,
        "data-label": label,
      };
    });
  };
}

const sanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "abbr",
    "details",
    "kbd",
    "mark",
    "sub",
    "summary",
    "sup",
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      "ariaLabel",
      "className",
      "target",
      "rel",
    ],
    abbr: [...(defaultSchema.attributes?.abbr ?? []), "title"],
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-./],
    ],
    details: [...(defaultSchema.attributes?.details ?? []), "open"],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      "className",
      "data-callout",
      "data-label",
    ],
    h1: [...(defaultSchema.attributes?.h1 ?? []), "id", "className"],
    h2: [...(defaultSchema.attributes?.h2 ?? []), "id", "className"],
    h3: [...(defaultSchema.attributes?.h3 ?? []), "id", "className"],
    h4: [...(defaultSchema.attributes?.h4 ?? []), "id", "className"],
    h5: [...(defaultSchema.attributes?.h5 ?? []), "id", "className"],
    h6: [...(defaultSchema.attributes?.h6 ?? []), "id", "className"],
    input: [
      ...(defaultSchema.attributes?.input ?? []),
      ["type", "checkbox"],
      "checked",
      "disabled",
      "readOnly",
    ],
    li: [...(defaultSchema.attributes?.li ?? []), "className"],
    mark: [...(defaultSchema.attributes?.mark ?? []), "className"],
    section: [
      ...(defaultSchema.attributes?.section ?? []),
      "className",
      "data-footnotes",
    ],
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

function createComponents(
  onLinkClick: MarkdownRendererProps["onLinkClick"]
): Components {
  return {
    a: ({ children, className, href, rel, target, title }) => {
      function handleClick(event: MouseEvent<HTMLAnchorElement>) {
        if (!href || !onLinkClick) return;
        const handled = onLinkClick(href);
        if (handled) event.preventDefault();
      }

      return (
        <a
          className={className}
          href={href}
          onClick={handleClick}
          rel={rel}
          target={target}
          title={title}
        >
          {children}
        </a>
      );
    },

    blockquote: ({ children }) => <blockquote>{children}</blockquote>,

    code: ({ children, className }) => {
      const code = String(children).replace(/\n$/, "");
      const language = /language-([\w-]+)/.exec(className ?? "")?.[1];
      const isBlock = Boolean(language) || code.includes("\n");

      if (!isBlock) return <code className={className}>{children}</code>;
      if (language?.toLowerCase() === "mermaid")
        return <MermaidBlock code={code} />;
      return <HighlightedCode code={code} language={language ?? "text"} />;
    },

    h1: ({ children, id }) => <h1 id={id}>{children}</h1>,
    h2: ({ children, id }) => <h2 id={id}>{children}</h2>,
    h3: ({ children, id }) => <h3 id={id}>{children}</h3>,
    h4: ({ children, id }) => <h4 id={id}>{children}</h4>,
    h5: ({ children, id }) => <h5 id={id}>{children}</h5>,
    h6: ({ children, id }) => <h6 id={id}>{children}</h6>,

    img: ({ alt, src, title }) => (
      <img
        alt={alt ?? ""}
        loading="lazy"
        src={typeof src === "string" ? src : undefined}
        title={title}
      />
    ),

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

export function MarkdownRenderer({
  content,
  onLinkClick,
}: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      components={createComponents(onLinkClick)}
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
