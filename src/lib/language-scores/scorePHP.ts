import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scorePHP = (text: string): LanguageScore => {
  const patterns = [/<\?php/, /\$\w+\s*=/, /echo\s+/, /function\s+\w+\s*\(/, /->\w+/];

  const matches = countMatches(text, patterns);
  const score = calculateScore(matches, patterns.length);

  return {
    language: "PHP",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${patterns.length} PHP patterns matched`],
  };
};
