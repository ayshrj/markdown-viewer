import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scorePHP = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "PHP",
    text,
    groups: [
      {
        label: "strong PHP patterns",
        points: 26,
        patterns: [
          /<\?php/,
          /\$\w+\s*=/,
          /\becho\s+/,
          /\bfunction\s+\w+\s*\(/,
          /->\w+/,
          /::\w+/,
          /\bnamespace\s+[\w\\]+;/,
        ],
      },
      {
        label: "medium PHP patterns",
        points: 12,
        max: 36,
        patterns: [
          /\buse\s+[\w\\]+;/,
          /\bclass\s+\w+\s*(?:extends\s+\w+)?\s*\{/,
          /\bpublic\s+function\b/,
          /\barray\s*\(/,
        ],
      },
    ],
    penalties: [
      {
        label: "non-PHP syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:def|#include|package\s+main|using\s+System)\b/m],
      },
    ],
  });
