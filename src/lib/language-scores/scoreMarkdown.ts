import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreMarkdown = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Markdown",
    text,
    groups: [
      {
        label: "strong Markdown block patterns",
        points: 24,
        patterns: [/^#{1,6}\s+\S.+$/m, /^```[\w-]*\s*$/m, /^\|.+\|\s*$/m, /^\s{0,3}>\s+\S/m, /^-{3,}\s*$/m],
      },
      {
        label: "medium Markdown inline/list patterns",
        points: 12,
        max: 36,
        patterns: [
          /^\s*[-*+]\s+\S/m,
          /^\s*\d+\.\s+\S/m,
          /\[[^\]]+\]\([^)]+\)/,
          /!\[[^\]]*]\([^)]+\)/,
          /\*\*[^*\n]+\*\*/,
          /`[^`\n]+`/,
        ],
      },
    ],
    bonuses: [{ label: "multiple Markdown structures", points: 12, test: value => value.split("\n").length >= 3 }],
    penalties: [
      {
        label: "source/config syntax",
        points: 24,
        patterns: [/^\s*(?:function|const|let|def|class|package|import|FROM)\b/m, /^\s*[{[]/],
      },
    ],
  });
