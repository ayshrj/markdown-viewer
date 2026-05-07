export const SAMPLE_MARKDOWN = `---
title: Field Notes for MDLens
author: MDLens
tags:
  - markdown
  - preview
  - diagrams
  - math
  - callouts
---

# Field Notes for MDLens

Paste markdown, drop a file, or edit this sample. The preview supports **GFM**, math, diagrams, callouts, sanitized raw HTML, footnotes, external links, images, and syntax-highlighted code.

> Good readers should stay calm when the document gets complicated.

## What this viewer handles

- [x] GitHub flavored markdown tables and task lists
- [x] Syntax highlighting with Shiki
- [x] Math such as $E = mc^2$ and display equations
- [x] Mermaid diagrams rendered client-side
- [x] Callout blocks using directives
- [x] GitHub-style alerts
- [x] Sanitized raw HTML like <mark>highlighted text</mark>
- [x] Footnotes and heading deep links
- [x] Safe external links
- [x] Images with lazy loading
- [ ] Anything that requires executing MDX components

## GitHub Alerts

> [!NOTE]
> GitHub-style alerts render as calm MDLens callouts.

> [!TIP]
> Use headings to create a useful outline automatically.

> [!IMPORTANT]
> External links open in a new tab with safe \`rel\` attributes.

> [!WARNING]
> Raw HTML is sanitized before it reaches the preview.

> [!CAUTION]
> Scripts and dangerous inline attributes should never execute.

## Callouts

:::info
MDLens keeps the reading experience focused while still supporting advanced Markdown features.
:::

:::tip
Use the outline to jump between headings. Each heading receives a stable linkable ID.
:::

:::success
This document is safe to preview because raw HTML is sanitized before rendering.
:::

:::warning
Raw HTML is allowed, but dangerous tags and attributes are removed.
:::

:::danger
Scripts should never execute inside the preview.
:::

:::note
Callouts are written using markdown directives such as \`:::tip\` and \`:::warning\`.
:::

:::tip[Reader tip]
Custom callout titles can make notes feel more intentional.
:::

:::warning{title="Sanitization reminder"}
Even when HTML is allowed, unsafe protocols and attributes should be blocked.
:::

## Links

External links like [React Markdown](https://github.com/remarkjs/react-markdown) open in a new tab with safe \`rel\` attributes.

You can also link to a local heading: [Jump to the diagram](#diagram).

Unsafe links should be blocked by the renderer: [This should not run](javascript:alert("blocked")).

Email and phone links can still be useful: [hello@example.com](mailto:hello@example.com) and [Call support](tel:+911234567890).

## Table Alignment

| Feature | Status | Notes |
| :--- | :---: | ---: |
| Uploads | Ready | Accepts .md, .markdown, .mdx, and .txt |
| Themes | Ready | System, light, dark, and palette presets |
| Safety | Ready | Scripts and dangerous HTML are removed |
| Outline | Ready | Generated from headings |
| Tables | Ready | Wide tables scroll horizontally |

## Task List

- [x] Paste markdown
- [x] Drop a local file
- [x] Preview safely
- [ ] Export polished notes
- [ ] Add custom typography presets

## Lists

1. Parse markdown.
2. Sanitize raw HTML.
3. Render the preview.
4. Keep the reading experience calm.

Nested lists work too:

- Markdown
  - GFM
  - Math
  - Diagrams
- Reader features
  - Outline
  - Deep links
  - Safe external links

## Code

Inline code like \`readingTime(440)\` stays compact.

\`\`\`ts
type MarkdownDocument = {
  source: string;
  filename?: string;
  title: string;
  updatedAt: number;
};

export function readingTime(words: number) {
  return Math.max(1, Math.ceil(words / 220));
}
\`\`\`

\`\`\`json
{
  "name": "MDLens",
  "features": ["preview", "math", "diagrams", "callouts"],
  "safeByDefault": true
}
\`\`\`

\`\`\`bash
pnpm add react-markdown remark-gfm remark-math rehype-katex rehype-sanitize
\`\`\`

## Diagram

\`\`\`mermaid
flowchart LR
  A[Drop or paste markdown] --> B[Parse safely]
  B --> C[Render preview]
  C --> D[Read on desktop or mobile]
\`\`\`

## Math

Inline math works with $a^2 + b^2 = c^2$.

$$
\\int_0^1 x^2\\,dx = \\frac{1}{3}
$$

A display equation can also show something more familiar:

$$
E = mc^2
$$

## Footnotes

MDLens is designed for calm long-form reading.[^calm]

Footnotes are useful for references, notes, and extra context without interrupting the main flow.[^extra]

[^calm]: Calm UI matters when documents contain code, tables, math, and diagrams.
[^extra]: This is rendered through GitHub flavored markdown support.

## Rich Inline HTML

You can use <mark>highlighted text</mark>, <kbd>⌘</kbd> + <kbd>K</kbd>, H<sub>2</sub>O, and x<sup>2</sup>.

The abbreviation <abbr title="Markdown">MD</abbr> stays readable with a title tooltip.

## Raw HTML Safety

<details open>
  <summary>Allowed HTML can still be useful</summary>
  <p>This block is sanitized before it reaches the preview.</p>
</details>

<script>alert("this should never run")</script>

<img src="x" onerror="alert('this should also never run')" />

<a href="javascript:alert('blocked')">This unsafe link should be neutralized</a>

## Image

![Minimal document preview illustration](https://images.unsplash.com/photo-1499750310107-5fef28a66643?q=80&w=1200&auto=format&fit=crop "A calm writing desk used as an image caption.")

## Formatting

You can use **bold**, _italic_, ***bold italic***, and ~~double-tilde strikethrough~~.

Single tilde is intentionally not treated as strikethrough because \`singleTilde: false\` is enabled.

Horizontal rules are useful for separating sections.

---

## Deep Links

Headings get stable IDs, so the outline can link straight to each section.

### A nested heading

Nested headings should also appear in the outline.

#### A deeper heading

This helps test heading levels from \`h1\` through \`h6\`.

##### Small heading

Useful for dense technical notes.

###### Tiny heading

Still linkable, still readable.
`;
