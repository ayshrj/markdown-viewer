import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreCSS = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "CSS",
    text,
    groups: [
      {
        label: "strong CSS patterns",
        points: 26,
        patterns: [/@media\s+[^{]+\{/, /@keyframes\s+[\w-]+\s*\{/, /@supports\s+[^{]+\{/, /:root\s*\{/, /--[\w-]+\s*:/],
      },
      {
        label: "medium CSS rule/property patterns",
        points: 12,
        max: 48,
        patterns: [
          /[.#]?[\w-]+\s*\{[^}]*\}/,
          /\b(?:color|background|margin|padding|display|position|font|border|width|height|grid|flex)\s*:/i,
          /(?:px|rem|em|vh|vw|%)\s*;/,
          /#[0-9a-f]{3,8}\b/i,
          /\b(?:hover|focus|active|before|after)\b/,
        ],
      },
    ],
    bonuses: [
      {
        label: "CSS declaration block",
        points: 20,
        test: value => /[.#]?[\w-]+\s*\{[^}]*:\s*[^}]+;?\s*}/.test(value),
      },
    ],
    penalties: [
      {
        label: "HTML or source syntax",
        points: 22,
        patterns: [/<\/?[a-z][^>]*>/i, /^\s*(?:const|let|function|def|class)\b/m],
      },
    ],
  });
