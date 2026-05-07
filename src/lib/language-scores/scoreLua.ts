import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreLua = (text: string): LanguageScore => {
  const strongPatterns = [
    /local\s+\w+\s*=/, // local variable =
    /function\s+\w+\s*\(/, // function name(
    /end\s*$/m, // end
    /require\s*\(/, // require(
    /print\s*\(/, // print(
    /for\s+\w+\s*=\s*\d+,\d+/, // for i=1,10
    /while\s+.*\s+do/, // while condition do
    /if\s+.*\s+then/, // if condition then
    /elseif\s+/, // elseif
  ];

  const matches = countMatches(text, strongPatterns);
  const score = calculateScore(matches, strongPatterns.length);

  return {
    language: "Lua",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} Lua patterns matched`],
  };
};
