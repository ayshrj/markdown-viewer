import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreSwift = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Swift",
    text,
    groups: [
      {
        label: "strong Swift patterns",
        points: 26,
        patterns: [
          /\bimport\s+(?:Foundation|UIKit|SwiftUI)\b/,
          /\bfunc\s+\w+\s*\([^)]*\)\s*(?:->\s*\w+)?\s*\{/,
          /\b(?:var|let)\s+\w+\s*:\s*\w+/,
          /\bstruct\s+\w+\s*:\s*(?:View|Codable|Decodable|Encodable)/,
          /@\w+/,
          /\bguard\s+let\b|\bif\s+let\b/,
        ],
      },
      {
        label: "medium Swift patterns",
        points: 12,
        max: 36,
        patterns: [/\bclass\s+\w+\s*:/, /\bextension\s+\w+/, /\bprint\s*\(/, /\bView\s*\{/, /\bTask\s*\{/],
      },
    ],
    penalties: [
      {
        label: "non-Swift syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:def|function|#include|using\s+System|package\s+main)\b/m, /<\?php/],
      },
    ],
  });
