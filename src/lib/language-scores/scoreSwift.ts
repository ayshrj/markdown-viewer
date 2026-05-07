import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreSwift = (text: string): LanguageScore => {
  const strongPatterns = [
    /import\s+Foundation/, // import Foundation
    /import\s+UIKit/, // import UIKit
    /func\s+\w+\s*\(/, // func name(
    /var\s+\w+\s*:/, // var name: Type
    /let\s+\w+\s*:/, // let name: Type
    /class\s+\w+\s*:/, // class Name:
    /struct\s+\w+\s*\{/, // struct Name {
    /@\w+/, // @objc, @IBAction, etc.
    /guard\s+let/, // guard let
    /if\s+let/, // if let
  ];

  const matches = countMatches(text, strongPatterns);
  const bonus = text.includes("import Foundation") || text.includes("import UIKit") ? 15 : 0;
  const penaltyMatches = countMatches(text, ["def ", "function(", "console.log", "printf"]);

  const score = calculateScore(matches, strongPatterns.length, bonus, penaltyMatches * 20);

  return {
    language: "Swift",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} Swift patterns matched`],
  };
};
