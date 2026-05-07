import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";
import { scoreCPlusPlus } from "./scoreCPlusPlus";

export const scoreC = (text: string): LanguageScore => {
  const base = scoreByPatterns({
    language: "C",
    text,
    groups: [
      {
        label: "strong C patterns",
        points: 26,
        patterns: [
          /#include\s*<(?:stdio|stdlib|string|stdint|stdbool)\.h>/,
          /\bprintf\s*\(/,
          /\bscanf\s*\(/,
          /\bmalloc\s*\(/,
          /\bfree\s*\(/,
        ],
      },
      {
        label: "medium C patterns",
        points: 12,
        max: 36,
        patterns: [
          /\bint\s+main\s*\(/,
          /\bstruct\s+\w+/,
          /\btypedef\s+/,
          /#define\s+\w+/,
          /\b(?:int|char|float|double|void)\s+\*?\w+/,
        ],
      },
    ],
    penalties: [
      {
        label: "non-C syntax",
        points: 24,
        patterns: [
          /using\s+namespace|std::|cout\s*<</,
          /^\s*(?:def|function|import\s+java|using\s+System|package\s+main)\b/m,
        ],
      },
    ],
  });

  const cppPenalty = scoreCPlusPlus(text).score >= 50 ? 35 : 0;
  const score = Math.max(0, base.score - cppPenalty);

  return {
    ...base,
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: cppPenalty > 0 ? [...base.reasons, `-${cppPenalty}pts for C++ features`] : base.reasons,
  };
};
