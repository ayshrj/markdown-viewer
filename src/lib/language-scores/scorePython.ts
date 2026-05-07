import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scorePython = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [
    /^def\s+\w+\s*\(/m,
    /^class\s+\w+\s*:/m,
    /^if\s+__name__\s*==\s*['"']__main__['"']\s*:/m,
    /print\s*\(/,
    /input\s*\(/,
    /f["'].*\{.*\}.*["']/,
  ];

  const mediumPatterns = [
    /import\s+\w+/,
    /from\s+\w+\s+import/,
    /^\s*elif\s+/m,
    /^\s*except\s*:/m,
    /range\s*\(/,
    /len\s*\(/,
  ];

  const weakPatterns = [
    /^#.*$/m,
    "def ",
    "class ",
    "import ",
    "from ",
    "if ",
    "elif ",
    "else:",
    "for ",
    "while ",
    "try:",
    "except:",
  ];

  // Penalty patterns (non-Python syntax)
  const penaltyPatterns = [
    "function(",
    "console.log",
    "document.",
    "public class",
    "static void",
    "#include",
    "using namespace",
    "<?php",
  ];

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);
  const weakMatches = countMatches(text, weakPatterns);
  const penaltyMatches = countMatches(text, penaltyPatterns);

  let score = strongMatches * 25 + mediumMatches * 15 + weakMatches * 5;
  score = Math.max(0, score - penaltyMatches * 30);

  if (strongMatches > 0) reasons.push(`${strongMatches} strong Python patterns`);
  if (mediumMatches > 0) reasons.push(`${mediumMatches} medium Python patterns`);
  if (weakMatches > 0) reasons.push(`${weakMatches} weak Python indicators`);
  if (penaltyMatches > 0) reasons.push(`-${penaltyMatches * 30}pts for non-Python syntax`);

  return {
    language: "Python",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
