import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreR = (text: string): LanguageScore => {
  const strongPatterns = [
    /library\s*\(/, // library(
    /data\.frame\s*\(/, // data.frame(
    /<-\s*/, // <- assignment
    /function\s*\(/, // function(
    /c\s*\(/, // c(
    /summary\s*\(/, // summary(
    /str\s*\(/, // str(
    /ggplot\s*\(/, // ggplot(
    /\$\w+/, // $column
  ];

  const matches = countMatches(text, strongPatterns);
  const score = calculateScore(matches, strongPatterns.length);

  return {
    language: "R",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} R patterns matched`],
  };
};
