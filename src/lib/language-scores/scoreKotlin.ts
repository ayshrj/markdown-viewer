import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreKotlin = (text: string): LanguageScore => {
  const strongPatterns = [
    /fun\s+main\s*\(/, // fun main(
    /fun\s+\w+\s*\(/, // fun name(
    /val\s+\w+\s*=/, // val variable =
    /var\s+\w+\s*:/, // var variable: Type
    /data\s+class\s+\w+/, // data class Name
    /object\s+\w+/, // object Name
    /when\s*\(/, // when(
    /\.let\s*\{/, // .let {
    /\.also\s*\{/, // .also {
  ];

  const matches = countMatches(text, strongPatterns);
  const penaltyMatches = countMatches(text, ["def ", "function(", "console.log", "printf"]);

  const score = calculateScore(matches, strongPatterns.length, 0, penaltyMatches * 20);

  return {
    language: "Kotlin",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} Kotlin patterns matched`],
  };
};
