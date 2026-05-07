import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreCSharp = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "C#",
    text,
    groups: [
      {
        label: "strong C# patterns",
        points: 26,
        patterns: [
          /\busing\s+System(?:\.\w+)*;/,
          /\bnamespace\s+\w+(?:\.\w+)*\s*[;{]/,
          /\bConsole\.Write(?:Line)?\s*\(/,
          /\bpublic\s+static\s+void\s+Main\s*\(/,
          /\b(?:var|string|int|bool|List<[^>]+>)\s+\w+\s*=/,
          /\[[A-Z]\w+(?:\([^)]*\))?]/,
        ],
      },
      {
        label: "medium C# patterns",
        points: 12,
        max: 36,
        patterns: [/\basync\s+Task\b/, /\bget;\s*set;/, /\bnew\s+\w+\s*\(/, /\bIEnumerable<[^>]+>/],
      },
    ],
    penalties: [
      {
        label: "non-C# syntax",
        points: 24,
        patterns: [/System\.out\.print/, /console\.log\s*\(/, /^\s*(?:function|def|#include|package\s+main)\b/m],
      },
    ],
  });
