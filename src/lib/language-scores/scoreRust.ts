import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreRust = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Rust",
    text,
    groups: [
      {
        label: "strong Rust patterns",
        points: 26,
        patterns: [
          /\bfn\s+main\s*\(\)/,
          /\blet\s+mut\s+\w+/,
          /\bprintln!\s*\(/,
          /\buse\s+std::/,
          /\bimpl\s+\w+/,
          /\btrait\s+\w+/,
          /\bmatch\s+\w+\s*\{/,
          /\b(?:Some|None|Ok|Err)\b/,
        ],
      },
      {
        label: "medium Rust patterns",
        points: 12,
        max: 36,
        patterns: [
          /\b&(?:mut\s+)?\w+/,
          /\bString::from\s*\(/,
          /\bVec<[^>]+>/,
          /->\s*(?:Result|Option|impl|\w+)/,
          /\bpub\s+(?:fn|struct|enum)\b/,
        ],
      },
    ],
    penalties: [
      {
        label: "non-Rust syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:def|function|class|#include|package\s+main)\b/m, /<\?php/],
      },
    ],
  });
