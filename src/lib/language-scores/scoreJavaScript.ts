import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scoreJavaScript = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [
    /console\.log\s*\(/,
    /document\.\w+/,
    /window\.\w+/,
    /=>\s*\{/,
    /require\s*\(['"][^'"]*['"]\)/,
    /module\.exports\s*=/,
  ];

  const mediumPatterns = [
    /function\s+\w+\s*\(/,
    /const\s+\w+\s*=/,
    /let\s+\w+\s*=/,
    /var\s+\w+\s*=/,
    /\.addEventListener\s*\(/,
    /setTimeout\s*\(/,
  ];

  const weakPatterns = ["function", "const", "let", "var", "=>", "import", "export"];

  const penaltyPatterns = ["def ", "print(", "class ", "public class", "interface ", "type ", "#include"];

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);
  const weakMatches = countMatches(text, weakPatterns);
  const penaltyMatches = countMatches(text, penaltyPatterns);

  let score = strongMatches * 25 + mediumMatches * 15 + weakMatches * 5;
  score = Math.max(0, score - penaltyMatches * 25);

  // Bonus for JavaScript structure
  if (text.includes(";") && (text.includes("function") || text.includes("const"))) {
    score += 10;
    reasons.push("+10pts for JavaScript structure");
  }

  if (strongMatches > 0) reasons.push(`${strongMatches} strong JS patterns`);
  if (mediumMatches > 0) reasons.push(`${mediumMatches} medium JS patterns`);
  if (weakMatches > 0) reasons.push(`${weakMatches} weak JS indicators`);
  if (penaltyMatches > 0) reasons.push(`-${penaltyMatches * 25}pts for non-JS syntax`);

  return {
    language: "JavaScript",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
