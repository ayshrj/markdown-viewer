import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreHTML = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "HTML",
    text,
    groups: [
      {
        label: "strong HTML document patterns",
        points: 28,
        patterns: [/<!doctype\s+html/i, /<html\b[^>]*>/i, /<head\b[^>]*>/i, /<body\b[^>]*>/i, /<main\b[^>]*>/i],
      },
      {
        label: "medium HTML element patterns",
        points: 12,
        max: 48,
        patterns: [
          /<div\b[^>]*>[\s\S]*<\/div>/i,
          /<section\b[^>]*>/i,
          /<script\b[^>]*>/i,
          /<style\b[^>]*>/i,
          /<meta\b[^>]*>/i,
          /<link\b[^>]*>/i,
          /<img\b[^>]*>/i,
        ],
      },
      {
        label: "weak HTML tag indicators",
        points: 5,
        max: 15,
        patterns: [/<[a-z][\w:-]*(?:\s+[^>]*)?>/i, /<\/[a-z][\w:-]*>/i],
      },
    ],
    bonuses: [
      {
        label: "paired HTML tag",
        points: 20,
        test: value => /<([a-z][\w:-]*)\b[^>]*>[\s\S]*<\/\1>/i.test(value),
      },
    ],
    penalties: [
      {
        label: "XML or JSX/source syntax",
        points: 20,
        patterns: [/^<\?xml/i, /^\s*(?:const|let|function|import|export)\b/m, /className=/],
      },
    ],
  });
