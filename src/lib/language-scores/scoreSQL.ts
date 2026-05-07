import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreSQL = (text: string): LanguageScore => {
  const patterns = [
    /\bSELECT\b.*\bFROM\b/i,
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\b.*\bSET\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bCREATE\s+TABLE\b/i,
  ];

  const matches = countMatches(text, patterns);
  const score = calculateScore(matches, patterns.length);

  return {
    language: "SQL",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${patterns.length} SQL patterns matched`],
  };
};
