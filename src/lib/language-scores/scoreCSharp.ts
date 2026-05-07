import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreCSharp = (text: string): LanguageScore => {
  const patterns = [
    /using\s+System/,
    /namespace\s+\w+/,
    /Console\.WriteLine/,
    /public\s+static\s+void\s+Main/,
    /\[.*\]/,
  ];

  const matches = countMatches(text, patterns);
  const score = calculateScore(
    matches,
    patterns.length,
    0,
    countMatches(text, ["import java", "System.out.print", "console.log"]) * 25
  );

  return {
    language: "C#",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${patterns.length} C# patterns matched`],
  };
};
