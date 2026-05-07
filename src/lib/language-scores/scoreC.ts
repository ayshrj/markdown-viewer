import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";
import { scoreCPlusPlus } from "./scoreCPlusPlus";

export const scoreC = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [
    /#include\s*<stdio\.h>/, // #include <stdio.h>
    /#include\s*<stdlib\.h>/, // #include <stdlib.h>
    /printf\s*\(/, // printf(
    /scanf\s*\(/, // scanf(
    /malloc\s*\(/, // malloc(
    /free\s*\(/, // free(
  ];

  const mediumPatterns = [
    /int\s+main\s*\(/, // int main(
    /void\s+\w+\s*\(/, // void function(
    /struct\s+\w+/, // struct
    /typedef\s+/, // typedef
    /#define\s+/, // #define
  ];

  const weakPatterns = ["#include", "printf", "scanf", "malloc", "free", "void", "int", "char", "struct"];

  const penaltyPatterns = ["using namespace", "cout", "cin", "class", "console.log", "def ", "print("];

  // Extra penalty if C++ features are detected
  const cppScore = scoreCPlusPlus(text);
  const cppPenalty = cppScore.score > 30 ? 40 : 0;

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);
  const weakMatches = countMatches(text, weakPatterns);
  const penaltyMatches = countMatches(text, penaltyPatterns);

  let score = strongMatches * 25 + mediumMatches * 15 + weakMatches * 5;
  score = Math.max(0, score - penaltyMatches * 25 - cppPenalty);

  if (strongMatches > 0) reasons.push(`${strongMatches} strong C patterns`);
  if (mediumMatches > 0) reasons.push(`${mediumMatches} medium C patterns`);
  if (weakMatches > 0) reasons.push(`${weakMatches} weak C indicators`);
  if (penaltyMatches > 0) reasons.push(`-${penaltyMatches * 25}pts for non-C syntax`);
  if (cppPenalty > 0) reasons.push(`-${cppPenalty}pts for C++ features`);

  return {
    language: "C",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
