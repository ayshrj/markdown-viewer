import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreXML = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "XML",
    text,
    groups: [
      {
        label: "strong XML patterns",
        points: 30,
        patterns: [/^<\?xml\s+version=/i, /<!DOCTYPE\s+\w+/i, /\sxmlns(?::\w+)?=/i, /<\w+:[\w.-]+(?:\s|>)/i],
      },
      {
        label: "medium XML structure patterns",
        points: 14,
        max: 42,
        patterns: [/<([A-Za-z_][\w.-]*)\b[^>]*>[\s\S]*<\/\1>/, /<\w+[^>]*\/>/, /<!--[\s\S]*?-->/],
      },
    ],
    bonuses: [
      { label: "starts with XML-like tag", points: 10, test: value => value.trim().startsWith("<") },
      { label: "paired XML tags", points: 18, test: value => /<([A-Za-z_][\w.-]*)\b[^>]*>[\s\S]*<\/\1>/.test(value) },
    ],
    penalties: [
      {
        label: "HTML/source syntax",
        points: 22,
        patterns: [/<!doctype\s+html/i, /<html\b/i, /^\s*(?:const|let|function|import|export)\b/m],
      },
    ],
  });
