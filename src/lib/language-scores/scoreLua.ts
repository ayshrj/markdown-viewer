import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreLua = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Lua",
    text,
    groups: [
      {
        label: "strong Lua patterns",
        points: 26,
        patterns: [
          /\blocal\s+\w+\s*=/,
          /\bfunction\s+[\w.:]+\s*\(/,
          /^\s*end\s*$/m,
          /\brequire\s*\(["'][^"']+["']\)/,
          /\bprint\s*\(/,
          /\bif\s+.+\s+then\b/,
        ],
      },
      {
        label: "medium Lua patterns",
        points: 12,
        max: 36,
        patterns: [
          /\bfor\s+\w+\s*=\s*\d+\s*,\s*\d+/,
          /\bwhile\s+.+\s+do\b/,
          /\belseif\s+/,
          /\btable\.insert\s*\(/,
          /--\s*.*$/m,
        ],
      },
    ],
    penalties: [
      {
        label: "non-Lua syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:def|const|let|#include|package\s+main)\b/m, /<\?php/],
      },
    ],
  });
