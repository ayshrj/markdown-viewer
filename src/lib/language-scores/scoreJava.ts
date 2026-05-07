import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreJava = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Java",
    text,
    groups: [
      {
        label: "strong Java patterns",
        points: 26,
        patterns: [
          /\bpublic\s+class\s+\w+/,
          /\bpublic\s+static\s+void\s+main\s*\(\s*String\[\]\s+\w+\s*\)/,
          /\bimport\s+java\.[\w.*]+;/,
          /\bSystem\.out\.print(?:ln)?\s*\(/,
          /@\w+/,
          /\bnew\s+\w+<.*>\s*\(/,
        ],
      },
      {
        label: "medium Java patterns",
        points: 12,
        max: 36,
        patterns: [
          /\b(?:private|protected|public)\s+(?:static\s+)?\w+[\w<>[\]]*\s+\w+/,
          /\bextends\s+\w+/,
          /\bimplements\s+\w+/,
          /\bthrows\s+\w+/,
        ],
      },
    ],
    penalties: [
      {
        label: "non-Java syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:function|def|#include|using\s+System|package\s+main)\b/m, /<\?php/],
      },
    ],
  });
