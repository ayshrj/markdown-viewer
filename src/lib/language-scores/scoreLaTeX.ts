import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scoreLaTeX = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [
    /\\documentclass\s*\{/, // Document class
    /\\begin\s*\{document\}/, // Begin document
    /\\end\s*\{document\}/, // End document
    /\\usepackage\s*\{/, // Packages
    /\\\w+\s*\{[^}]*\}/, // LaTeX commands
  ];

  const mediumPatterns = [
    /\\section\s*\{/, // Sections
    /\\subsection\s*\{/, // Subsections
    /\\\w+/, // Any LaTeX command
    /\$.*?\$/, // Inline math
    /\\$$[\s\S]*?\\$$/, // Display math
  ];

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);

  let score = strongMatches * 30 + mediumMatches * 15;

  // Bonus for math mode
  if (/\$.*?\$/.test(text) || /\\$$[\s\S]*?\\$$/.test(text)) {
    score += 10;
    reasons.push("+10pts for LaTeX math");
  }

  if (strongMatches > 0) reasons.push(`${strongMatches} strong LaTeX patterns`);
  if (mediumMatches > 0) reasons.push(`${mediumMatches} medium LaTeX patterns`);

  return {
    language: "LaTeX",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
