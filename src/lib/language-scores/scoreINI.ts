import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scoreINI = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [
    /^$$.*$$\s*$/m, // Section headers
    /^\w+\s*=\s*.+$/m, // Key=value pairs
  ];

  const mediumPatterns = [
    /^[;#].*$/m, // Comments
    /^\s*$/m, // Empty lines (structural)
  ];

  const structure = [
    /^$$.*$$/m.test(text), // Has sections
    /^\w+\s*=/m.test(text), // Has key-value pairs
    !/[{}]/.test(text), // No braces (not JSON/JS)
  ];

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);
  const structureScore = structure.filter(Boolean).length;

  const score = strongMatches * 25 + mediumMatches * 10 + structureScore * 15;

  if (strongMatches > 0) reasons.push(`${strongMatches} strong INI patterns`);
  if (structureScore > 0) reasons.push(`${structureScore}/3 INI structure checks`);

  return {
    language: "INI",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
