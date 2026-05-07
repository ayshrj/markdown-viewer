import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scoreRegex = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [
    /\^.*\$/, // Anchors
    /$$[\w\W-]+$$/, // Character classes
    /$$.*?$$/, // Groups
    /\{?\d+,?\d*\}/, // Quantifiers
    /\\\w/, // Escape sequences
  ];

  const regexChars = ["+", "*", "?", "|", "^", "$", ".", "[", "]", "(", ")", "{", "}"];
  const regexCharCount = regexChars.reduce((count, char) => count + (text.split(char).length - 1), 0);

  const strongMatches = countMatches(text, strongPatterns);
  const density = regexCharCount / text.length;

  let score = strongMatches * 20;
  if (density > 0.3) {
    score += 40;
    reasons.push("+40pts for high regex character density");
  }

  if (strongMatches > 0) reasons.push(`${strongMatches} regex patterns`);

  return {
    language: "RegEx",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
