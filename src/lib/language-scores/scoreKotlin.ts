import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreKotlin = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Kotlin",
    text,
    groups: [
      {
        label: "strong Kotlin patterns",
        points: 26,
        patterns: [
          /\bfun\s+main\s*\(/,
          /\bfun\s+\w+\s*\([^)]*\)/,
          /\bval\s+\w+\s*=/,
          /\bvar\s+\w+\s*:\s*\w+/,
          /\bdata\s+class\s+\w+/,
          /\bobject\s+\w+/,
          /\bwhen\s*\(/,
        ],
      },
      {
        label: "medium Kotlin patterns",
        points: 12,
        max: 36,
        patterns: [
          /\bimport\s+kotlin\./,
          /\bsealed\s+class\b/,
          /\bcompanion\s+object\b/,
          /\.\w+\s*\{/,
          /\bprintln\s*\(/,
        ],
      },
    ],
    penalties: [
      {
        label: "non-Kotlin syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:def|function|#include|using\s+System|package\s+main)\b/m, /<\?php/],
      },
    ],
  });
