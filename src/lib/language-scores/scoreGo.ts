import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreGo = (text: string): LanguageScore => {
  const strongPatterns = [
    /package\s+main/, // package main
    /func\s+main\s*\(\)/, // func main()
    /import\s*\(/, // import (
    /fmt\.Print/, // fmt.Print
    /go\s+\w+\s*\(/, // go function()
    /defer\s+/, // defer
    /chan\s+/, // chan
    /:=\s*/, // :=
  ];

  const matches = countMatches(text, strongPatterns);
  const penaltyMatches = countMatches(text, ["def ", "function(", "console.log", "class "]);

  const score = calculateScore(matches, strongPatterns.length, 0, penaltyMatches * 20);

  return {
    language: "Go",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} Go patterns matched`],
  };
};
