export const SAMPLE_MARKDOWN = `---
title: Field Notes for MDLens
author: MDLens
tags:
  - markdown
  - preview
  - diagrams
---

# Field Notes for MDLens

Paste markdown, drop a file, or edit this sample. The preview supports **GFM**, math, diagrams, raw HTML that is sanitized, and syntax-highlighted code.

> Good readers should stay calm when the document gets complicated.

## What this viewer handles

- [x] GitHub flavored markdown tables and task lists
- [x] Syntax highlighting with Shiki
- [x] Math such as $E = mc^2$ and display equations
- [x] Mermaid diagrams rendered client-side
- [x] Sanitized raw HTML like <mark>highlighted text</mark>
- [ ] Anything that requires executing MDX components

| Feature | Status | Notes |
| --- | --- | --- |
| Uploads | Ready | Accepts .md, .markdown, .mdx, and .txt |
| Themes | Ready | System, light, dark, and palette presets |
| Safety | Ready | Scripts and dangerous HTML are removed |

## Code

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

## Raw HTML Safety

<details>
  <summary>Allowed HTML can still be useful</summary>
  <p>This block is sanitized before it reaches the preview.</p>
</details>

<script>alert("this should never run")</script>

## Deep Links

Headings get stable IDs, so the outline can link straight to each section.
`;
