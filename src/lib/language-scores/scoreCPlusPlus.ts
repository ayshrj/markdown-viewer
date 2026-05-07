import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scoreCPlusPlus = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [
    /#include\s*<[^>]+>/, // #include <iostream>
    /using\s+namespace\s+std/, // using namespace std
    /std::/, // std::cout
    /cout\s*<<|cin\s*>>/, // cout << or cin >>
    /class\s+\w+\s*\{/, // class Name {
    /public\s*:|private\s*:|protected\s*:/, // access specifiers
  ];

  const mediumPatterns = [
    /int\s+main\s*\(/, // int main(
    /#include\s*"/, // #include "header.h"
    /endl/, // endl
    /vector\s*</, // vector<
    /string\s+\w+/, // string variable
    /new\s+\w+/, // new keyword
    /delete\s+/, // delete keyword
  ];

  const weakPatterns = ["#include", "using", "namespace", "cout", "cin", "endl", "class", "public:", "private:"];

  const penaltyPatterns = ["def ", "print(", "console.log", "function(", "import java", "using System", "<?php"];

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);
  const weakMatches = countMatches(text, weakPatterns);
  const penaltyMatches = countMatches(text, penaltyPatterns);

  let score = strongMatches * 25 + mediumMatches * 15 + weakMatches * 5;
  score = Math.max(0, score - penaltyMatches * 30);

  if (strongMatches > 0) reasons.push(`${strongMatches} strong C++ patterns`);
  if (mediumMatches > 0) reasons.push(`${mediumMatches} medium C++ patterns`);
  if (weakMatches > 0) reasons.push(`${weakMatches} weak C++ indicators`);
  if (penaltyMatches > 0) reasons.push(`-${penaltyMatches * 30}pts for non-C++ syntax`);

  return {
    language: "C++",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
