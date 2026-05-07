import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreScala = (text: string): LanguageScore => {
  const strongPatterns = [
    /object\s+\w+/, // object Name
    /class\s+\w+/, // class Name
    /def\s+\w+/, // def method
    /val\s+\w+\s*=/, // val variable =
    /var\s+\w+\s*=/, // var variable =
    /import\s+scala\./, // import scala.
    /case\s+class/, // case class
    /match\s*\{/, // match {
    /=>\s*/, // =>
  ];

  const matches = countMatches(text, strongPatterns);
  const score = calculateScore(matches, strongPatterns.length);

  return {
    language: "Scala",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} Scala patterns matched`],
  };
};
