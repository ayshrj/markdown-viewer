import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreJava = (text: string): LanguageScore => {
  const patterns = [
    /public\s+class\s+\w+/,
    /public\s+static\s+void\s+main/,
    /import\s+java\./,
    /System\.out\.print/,
    /@Override/,
  ];

  const matches = countMatches(text, patterns);
  const score = calculateScore(
    matches,
    patterns.length,
    0,
    countMatches(text, ["console.log", "function(", "def ", "print("]) * 20
  );

  return {
    language: "Java",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${patterns.length} Java patterns matched`],
  };
};
