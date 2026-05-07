import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreRuby = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Ruby",
    text,
    groups: [
      {
        label: "strong Ruby patterns",
        points: 26,
        patterns: [
          /\bdef\s+\w+/,
          /\bclass\s+\w+/,
          /\bmodule\s+\w+/,
          /\bputs\s+/,
          /\brequire\s+['"][^'"]+['"]/,
          /^\s*end\s*$/m,
          /\.each\s+do\b/,
          /\belsif\b/,
        ],
      },
      {
        label: "medium Ruby patterns",
        points: 12,
        max: 36,
        patterns: [/@\w+/, /\|\w+\|/, /\battr_(?:reader|writer|accessor)\b/, /\bdo\s*\|/, /:\w+\s*=>/],
      },
    ],
    penalties: [
      {
        label: "non-Ruby syntax",
        points: 24,
        patterns: [
          /console\.log\s*\(/,
          /^\s*(?:function|def\s+\w+\s*\([^)]*\)\s*:|#include|package\s+main)\b/m,
          /<\?php/,
        ],
      },
    ],
  });
