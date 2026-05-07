import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreRust = (text: string): LanguageScore => {
  const strongPatterns = [
    /fn\s+main\s*\(\)/, // fn main()
    /let\s+mut\s+\w+/, // let mut variable
    /println!\s*\(/, // println!(
    /use\s+std::/, // use std::
    /impl\s+\w+/, // impl Name
    /trait\s+\w+/, // trait Name
    /match\s+\w+\s*\{/, // match variable {
    /Some\(\w+\)/, // Some(value)
    /&str/, // &str
    /&mut\s+/, // &mut
  ];

  const matches = countMatches(text, strongPatterns);
  const penaltyMatches = countMatches(text, ["def ", "function(", "console.log", "class "]);

  const score = calculateScore(matches, strongPatterns.length, 0, penaltyMatches * 25);

  return {
    language: "Rust",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} Rust patterns matched`],
  };
};
