import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreScala = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Scala",
    text,
    groups: [
      {
        label: "strong Scala patterns",
        points: 26,
        patterns: [
          /\bobject\s+\w+/,
          /\bcase\s+class\s+\w+/,
          /\bdef\s+\w+\s*\([^)]*\)\s*[:=]/,
          /\bval\s+\w+\s*=/,
          /\bvar\s+\w+\s*=/,
          /\bimport\s+scala\./,
          /\bmatch\s*\{/,
        ],
      },
      {
        label: "medium Scala patterns",
        points: 12,
        max: 36,
        patterns: [/=>\s*/, /\bOption\[/, /\bSome\s*\(/, /\bNone\b/, /\bextends\s+\w+/],
      },
    ],
    penalties: [
      {
        label: "non-Scala syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:function|#include|package\s+main|using\s+System)\b/m, /<\?php/],
      },
    ],
  });
