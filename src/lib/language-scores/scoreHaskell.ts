import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreHaskell = (text: string): LanguageScore => {
  const strongPatterns = [
    /import\s+\w+/, // import Module
    /main\s*::\s*IO/, // main :: IO
    /\w+\s*::\s*\w+/, // function :: Type
    /data\s+\w+/, // data Type
    /type\s+\w+/, // type alias
    /where\s*$/m, // where
    /let\s+\w+\s*=/, // let variable =
    /case\s+\w+\s+of/, // case expression of
    /<-\s*/, // <- (do notation)
  ];

  const matches = countMatches(text, strongPatterns);
  const score = calculateScore(matches, strongPatterns.length);

  return {
    language: "Haskell",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} Haskell patterns matched`],
  };
};
