import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreDart = (text: string): LanguageScore => {
  const strongPatterns = [
    /import\s+'dart:/, // import 'dart:
    /void\s+main\s*\(\)/, // void main()
    /final\s+\w+\s*=/, // final variable =
    /const\s+\w+\s*=/, // const variable =
    /class\s+\w+\s+extends/, // class Name extends
    /Widget\s+build/, // Widget build (Flutter)
    /@override/i, // @override
    /setState\s*\(/, // setState( (Flutter)
  ];

  const matches = countMatches(text, strongPatterns);
  const flutterBonus = text.includes("Widget") || text.includes("StatelessWidget") ? 10 : 0;
  const penaltyMatches = countMatches(text, ["def ", "function(", "console.log", "printf"]);

  const score = calculateScore(matches, strongPatterns.length, flutterBonus, penaltyMatches * 20);

  return {
    language: "Dart",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} Dart patterns matched`],
  };
};
