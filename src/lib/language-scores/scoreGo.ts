import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreGo = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Go",
    text,
    groups: [
      {
        label: "strong Go patterns",
        points: 26,
        patterns: [
          /\bpackage\s+\w+/,
          /\bfunc\s+main\s*\(\)/,
          /\bfunc\s+\w+\s*\([^)]*\)\s*(?:\([^)]*\)|\w+)?\s*\{/,
          /\bfmt\.Print/,
          /\b:=/,
          /\bdefer\s+/,
          /\bgo\s+\w+\s*\(/,
        ],
      },
      {
        label: "medium Go patterns",
        points: 12,
        max: 36,
        patterns: [/\bimport\s*\(/, /\bchan\s+\w+/, /\bstruct\s*\{/, /\berr\s*!=\s*nil/, /\brange\s+\w+/],
      },
    ],
    penalties: [
      {
        label: "non-Go syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:def|function|class|#include|using\s+System)\b/m, /<\?php/],
      },
    ],
  });
