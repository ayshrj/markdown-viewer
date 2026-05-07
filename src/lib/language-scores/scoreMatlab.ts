import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreMatlab = (text: string): LanguageScore => {
  const strongPatterns = [
    /function\s+.*=.*\(/, // function output = name(
    /fprintf\s*\(/, // fprintf(
    /disp\s*\(/, // disp(
    /plot\s*\(/, // plot(
    /figure\s*[\(;]/, // figure( or figure;
    /end\s*$/m, // end (at end of line)
    /%.*$/m, // % comment
    /matrix\s*\(/, // matrix(
    /zeros\s*\(/, // zeros(
    /ones\s*\(/, // ones(
  ];

  const matches = countMatches(text, strongPatterns);
  const score = calculateScore(matches, strongPatterns.length);

  return {
    language: "MATLAB",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} MATLAB patterns matched`],
  };
};
