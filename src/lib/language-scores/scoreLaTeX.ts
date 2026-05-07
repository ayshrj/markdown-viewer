import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreLaTeX = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "LaTeX",
    text,
    groups: [
      {
        label: "strong LaTeX document patterns",
        points: 28,
        patterns: [
          /\\documentclass(?:\[[^\]]+])?\{[^}]+}/,
          /\\begin\{document}/,
          /\\end\{document}/,
          /\\usepackage(?:\[[^\]]+])?\{[^}]+}/,
          /\\begin\{(?:equation|align|figure|table|itemize|enumerate)}/,
        ],
      },
      {
        label: "medium LaTeX command/math patterns",
        points: 12,
        max: 48,
        patterns: [
          /\\(?:section|subsection|chapter|title|author)\{[^}]+}/,
          /\\[A-Za-z]+\{[^}]*}/,
          /\$[^$\n]+\$/,
          /\\\[[\s\S]*?\\]/,
        ],
      },
    ],
    bonuses: [{ label: "LaTeX math mode", points: 15, test: value => /\$[^$\n]+\$|\\\[[\s\S]*?\\]/.test(value) }],
    penalties: [
      {
        label: "Markdown/source syntax",
        points: 22,
        patterns: [/^#{1,6}\s+/m, /^\s*(?:function|const|let|def|class)\b/m, /<\/?[a-z][^>]*>/i],
      },
    ],
  });
