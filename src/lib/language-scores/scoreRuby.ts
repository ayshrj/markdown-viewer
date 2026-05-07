import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreRuby = (text: string): LanguageScore => {
  const strongPatterns = [
    /def\s+\w+/, // def method_name
    /class\s+\w+/, // class Name
    /module\s+\w+/, // module Name
    /puts\s+/, // puts
    /require\s+['"][^'"]*['"]/, // require 'gem'
    /end\s*$/m, // end
    /\.each\s+do/, // .each do
    /elsif\s+/, // elsif
    /@\w+/, // @instance_variable
    /\|\w+\|/, // |variable|
  ];

  const matches = countMatches(text, strongPatterns);
  const penaltyMatches = countMatches(text, ["function(", "console.log", "printf", "#include"]);

  const score = calculateScore(matches, strongPatterns.length, 0, penaltyMatches * 20);

  return {
    language: "Ruby",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} Ruby patterns matched`],
  };
};
