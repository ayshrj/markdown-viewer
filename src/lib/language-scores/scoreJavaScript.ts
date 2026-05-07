import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreJavaScript = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "JavaScript",
    text,
    groups: [
      {
        label: "strong JavaScript patterns",
        points: 24,
        patterns: [
          /console\.(?:log|error|warn)\s*\(/,
          /\b(?:const|let|var)\s+\w+\s*=/,
          /=>\s*(?:\{|[^;\n]+)/,
          /\bfunction\s+\w+\s*\(/,
          /\b(?:require|import)\s*\(?["'][^"']+["']\)?/,
          /\bmodule\.exports\s*=/,
          /\bexport\s+(?:default\s+)?(?:function|const|class)\b/,
        ],
      },
      {
        label: "medium browser/node patterns",
        points: 12,
        max: 36,
        patterns: [
          /\bdocument\.\w+/,
          /\bwindow\.\w+/,
          /\.addEventListener\s*\(/,
          /\bsetTimeout\s*\(/,
          /\bPromise\./,
          /\basync\s+function\b/,
        ],
      },
      {
        label: "weak JavaScript indicators",
        points: 5,
        max: 15,
        patterns: [/\{[\s\S]*}/, /;\s*$/m, /\.\w+\s*\(/],
      },
    ],
    bonuses: [
      {
        label: "JavaScript statement structure",
        points: 12,
        test: value => /\b(?:const|let|var|function)\b[\s\S]*;\s*$/.test(value.trim()),
      },
    ],
    penalties: [
      {
        label: "typed or non-JS syntax",
        points: 22,
        patterns: [
          /\binterface\s+\w+/,
          /\btype\s+\w+\s*=/,
          /:\s*\w+\s*[=;,){}]/,
          /^\s*(?:def|public\s+class|#include|package\s+main|fn\s+main)\b/m,
          /<\?php/,
        ],
      },
    ],
  });
