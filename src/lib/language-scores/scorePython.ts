import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scorePython = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Python",
    text,
    groups: [
      {
        label: "strong Python patterns",
        points: 25,
        patterns: [
          /^\s*def\s+\w+\s*\([^)]*\)\s*:/m,
          /^\s*class\s+\w+(?:\([^)]*\))?\s*:/m,
          /^\s*if\s+__name__\s*==\s*['"]__main__['"]\s*:/m,
          /\bprint\s*\(/,
          /\bfrom\s+[\w.]+\s+import\s+/,
          /\bimport\s+[\w.]+/,
          /\bf["'][^"']*\{[^}]+}[^"']*["']/,
        ],
      },
      {
        label: "medium Python control/library patterns",
        points: 12,
        max: 48,
        patterns: [
          /^\s*(?:elif|except|finally|with)\b.*:/m,
          /\b(?:range|len|enumerate|zip|open)\s*\(/,
          /\bself\.\w+/,
          /->\s*\w+\s*:/,
        ],
      },
      {
        label: "weak Python indicators",
        points: 5,
        max: 15,
        patterns: [/^\s*#.*$/m, /^\s*(?:for|while|try|if)\b.*:/m],
      },
    ],
    penalties: [
      {
        label: "non-Python syntax",
        points: 26,
        patterns: [
          /console\.log\s*\(/,
          /^\s*(?:function|const|let|public\s+class|#include|using\s+namespace)\b/m,
          /<\?php/,
        ],
      },
    ],
  });
