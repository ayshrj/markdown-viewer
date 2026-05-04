"use client";

/* eslint-disable @next/next/no-img-element */

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
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { HighlightedCode } from "@/components/highlighted-code";
import { MermaidBlock } from "@/components/mermaid-block";

type MarkdownRendererProps = {
  content: string;
};

const sanitizeSchema: SanitizeOptions = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "details",
    "summary",
    "mark",
    "kbd",
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
    code: [
      ...(defaultSchema.attributes?.code ?? []),
      ["className", /^language-./],
    ],
    details: [...(defaultSchema.attributes?.details ?? []), "open"],
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
    span: [...(defaultSchema.attributes?.span ?? []), "className"],
    summary: [...(defaultSchema.attributes?.summary ?? []), "className"],
    table: [...(defaultSchema.attributes?.table ?? []), "className"],
    tbody: [...(defaultSchema.attributes?.tbody ?? []), "className"],
    td: [...(defaultSchema.attributes?.td ?? []), "align", "className"],
    th: [...(defaultSchema.attributes?.th ?? []), "align", "className"],
    thead: [...(defaultSchema.attributes?.thead ?? []), "className"],
    tr: [...(defaultSchema.attributes?.tr ?? []), "className"],
    ul: [...(defaultSchema.attributes?.ul ?? []), "className"],
  },
};

const components: Components = {
  a: ({ children, className, href, rel, target, title }) => (
    <a className={className} href={href} rel={rel} target={target} title={title}>
      {children}
    </a>
  ),
  blockquote: ({ children }) => <blockquote>{children}</blockquote>,
  code: ({ children, className }) => {
    const code = String(children).replace(/\n$/, "");
    const language = /language-([\w-]+)/.exec(className ?? "")?.[1];
    const isBlock = Boolean(language) || code.includes("\n");

    if (!isBlock) {
      return <code className={className}>{children}</code>;
    }

    if (language?.toLowerCase() === "mermaid") {
      return <MermaidBlock code={code} />;
    }

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
    if (type !== "checkbox") {
      return null;
    }

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

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown
      components={components}
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
      remarkPlugins={[remarkFrontmatter, remarkGfm, remarkMath]}
    >
      {content}
    </ReactMarkdown>
  );
}
