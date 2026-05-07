import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scoreMarkdown = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [
    /^#{1,6}\s+.+$/m, // Headers
    /^```/m, // Code blocks
    /^\|\s*.+\s*\|/m, // Tables
    /^\s*\*\s+/m, // Unordered lists
    /^\s*\d+\.\s+/m, // Ordered lists
  ];

  const mediumPatterns = [
    /\*\*.*?\*\*/, // Bold
    /\*.*?\*/, // Italic
    /`.*?`/, // Inline code
    /$$.*?$$$$.*?$$/, // Links
    /!$$.*?$$$$.*?$$/, // Images
    /^>\s+/m, // Blockquotes
  ];

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);

  let score = strongMatches * 25 + mediumMatches * 12;

  // Bonus for README patterns
  if (/^#\s+/.test(text.trim())) {
    score += 15;
    reasons.push("+15pts for document title");
  }

  if (strongMatches > 0) reasons.push(`${strongMatches} strong Markdown patterns`);
  if (mediumMatches > 0) reasons.push(`${mediumMatches} medium Markdown patterns`);

  return {
    language: "Markdown",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
