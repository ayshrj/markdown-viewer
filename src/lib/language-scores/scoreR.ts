import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreR = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "R",
    text,
    groups: [
      {
        label: "strong R patterns",
        points: 26,
        patterns: [
          /\blibrary\s*\(/,
          /\bdata\.frame\s*\(/,
          /<-\s*/,
          /\bfunction\s*\([^)]*\)\s*\{/,
          /\bggplot\s*\(/,
          /\bsummary\s*\(/,
          /\bstr\s*\(/,
        ],
      },
      {
        label: "medium R patterns",
        points: 12,
        max: 36,
        patterns: [
          /\bc\s*\([^)]*\)/,
          /\$\w+/,
          /\bmutate\s*\(/,
          /\bselect\s*\(/,
          /\bread\.csv\s*\(/,
          /\bTRUE\b|\bFALSE\b/,
        ],
      },
    ],
    penalties: [
      {
        label: "non-R syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:def|const|let|#include|package\s+main)\b/m, /<\?php/],
      },
    ],
  });
