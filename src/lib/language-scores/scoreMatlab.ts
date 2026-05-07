import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreMatlab = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "MATLAB",
    text,
    groups: [
      {
        label: "strong MATLAB patterns",
        points: 26,
        patterns: [
          /^\s*function\s+(?:\[?[\w,\s]+\]?\s*=)?\s*\w+\s*\(/m,
          /\bfprintf\s*\(/,
          /\bdisp\s*\(/,
          /\bplot\s*\(/,
          /^\s*end\s*$/m,
          /^\s*%.*$/m,
        ],
      },
      {
        label: "medium MATLAB patterns",
        points: 12,
        max: 36,
        patterns: [
          /\b(?:zeros|ones|rand|linspace|meshgrid)\s*\(/,
          /\bfigure\s*(?:\(|;|$)/,
          /\bfor\s+\w+\s*=\s*\d+:/,
          /\w+\s*\(\s*:\s*,/,
        ],
      },
    ],
    penalties: [
      {
        label: "non-MATLAB syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:def|const|let|#include|package\s+main)\b/m, /<\?php/],
      },
    ],
  });
