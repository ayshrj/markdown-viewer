import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreDart = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Dart",
    text,
    groups: [
      {
        label: "strong Dart/Flutter patterns",
        points: 26,
        patterns: [
          /\bimport\s+['"]dart:/,
          /\bvoid\s+main\s*\(\)/,
          /\b(?:final|const)\s+\w+\s*=/,
          /\bclass\s+\w+\s+extends\s+\w+/,
          /\bWidget\s+build\s*\(/,
          /@override\b/i,
          /\bsetState\s*\(/,
        ],
      },
      {
        label: "medium Dart patterns",
        points: 12,
        max: 36,
        patterns: [
          /\bFuture<[^>]+>/,
          /\basync\s*\{/,
          /\bStatelessWidget\b|\bStatefulWidget\b/,
          /\bprint\s*\(/,
          /\bMap<[^>]+>/,
        ],
      },
    ],
    penalties: [
      {
        label: "non-Dart syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:def|function|#include|using\s+System|package\s+main)\b/m, /<\?php/],
      },
    ],
  });
