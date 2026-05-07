import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreHaskell = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Haskell",
    text,
    groups: [
      {
        label: "strong Haskell patterns",
        points: 26,
        patterns: [
          /\bmain\s*::\s*IO\b/,
          /^\s*\w+\s*::\s*.+$/m,
          /\bdata\s+\w+/,
          /\bnewtype\s+\w+/,
          /\bcase\s+.+\s+of\b/,
          /<-\s*/,
          /\bwhere\s*$/m,
        ],
      },
      {
        label: "medium Haskell patterns",
        points: 12,
        max: 36,
        patterns: [/\bimport\s+[A-Z]\w*(?:\.\w+)*/, /\blet\s+\w+\s*=/, /\bin\s+/, /=>\s*/, /\bdo\s*$/m],
      },
    ],
    penalties: [
      {
        label: "non-Haskell syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:function|const|let|def|#include|package\s+main)\b/m, /<\?php/],
      },
    ],
  });
