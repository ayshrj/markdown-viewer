import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreINI = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "INI",
    text,
    groups: [
      {
        label: "strong INI patterns",
        points: 35,
        patterns: [/^\s*\[[^\]\n]+\]\s*$/m, /^\s*[\w.-]+\s*=\s*.+$/m],
      },
      {
        label: "medium INI patterns",
        points: 12,
        max: 36,
        patterns: [/^\s*[;#].*$/m, /^\s*[\w.-]+\s*:\s*.+$/m, /^\s*\[[^\]\n]+\]\s*\n\s*[\w.-]+\s*=/m],
      },
    ],
    penalties: [
      {
        label: "JSON/YAML/source syntax",
        points: 22,
        patterns: [/^\s*\{/, /^\s*\[\s*(?:\{|")/, /^\s*-\s+/m, /^\s*(?:const|let|function|def)\b/m, /<\/?\w+[^>]*>/],
      },
    ],
  });
