import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreCPlusPlus = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "C++",
    text,
    groups: [
      {
        label: "strong C++ patterns",
        points: 26,
        patterns: [
          /#include\s*<iostream>/,
          /\busing\s+namespace\s+std\b/,
          /\bstd::\w+/,
          /\b(?:cout\s*<<|cin\s*>>)/,
          /\bclass\s+\w+\s*\{/,
          /\b(?:public|private|protected)\s*:/,
          /\btemplate\s*<[^>]+>/,
        ],
      },
      {
        label: "medium C++ patterns",
        points: 12,
        max: 36,
        patterns: [
          /#include\s*<[^>]+>/,
          /\bvector\s*</,
          /\bstring\s+\w+/,
          /\bauto\s+\w+\s*=/,
          /\bnew\s+\w+|\bdelete\s+/,
        ],
      },
    ],
    penalties: [
      {
        label: "non-C++ syntax",
        points: 24,
        patterns: [
          /^\s*(?:def|function|import\s+java|using\s+System|package\s+main)\b/m,
          /console\.log\s*\(/,
          /<\?php/,
        ],
      },
    ],
  });
