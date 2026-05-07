import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scorePerl = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Perl",
    text,
    groups: [
      {
        label: "strong Perl patterns",
        points: 26,
        patterns: [
          /^#!.*\bperl\b/m,
          /\buse\s+strict\b/,
          /\buse\s+warnings\b/,
          /\bmy\s+[$@%]\w+/,
          /\bsub\s+\w+\s*\{/,
          /\bchomp\s*\(/,
          /\bsplit\s*\(/,
        ],
      },
      {
        label: "medium Perl patterns",
        points: 12,
        max: 36,
        patterns: [/[$@%]\w+\s*=/, /=~\s*[ms]?\//, /\bforeach\s+my\b/, /\bprint\s+/, /\bqw\(/],
      },
    ],
    penalties: [
      {
        label: "non-Perl syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:function|def|#include|package\s+main)\b/m, /<\?php/],
      },
    ],
  });
