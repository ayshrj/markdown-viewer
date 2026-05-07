# MDLens

A Next.js markdown reader with split/edit/read modes, multi-file sessions, local file upload, theme controls, document outline, stats, math, diagrams, sanitized HTML, and syntax highlighting.

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## Verify

```bash
npm run lint
npm run build
```

## Markdown Support

- GitHub flavored markdown with tables, task lists, and footnotes.
- KaTeX math through `remark-math` and `rehype-katex`.
- Mermaid diagrams rendered client-side with strict security mode.
- Shiki syntax highlighting with plain-text fallback.
- Raw HTML parsed through `rehype-raw` and sanitized before rendering.
- `.mdx` uploads are treated as markdown text and are not executed.
