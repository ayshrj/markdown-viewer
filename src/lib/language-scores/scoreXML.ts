import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scoreXML = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [
    /^<\?xml\s+version/i, // XML declaration
    /<!DOCTYPE\s+\w+/i, // DOCTYPE
    /xmlns\s*=\s*['"]/i, // XML namespace
  ];

  const mediumPatterns = [
    /<\/\w+>/, // Closing tags
    /<\w+[^>]*\/?>/, // Opening/self-closing tags
    /<!--.*?-->/, // Comments
  ];

  const structureChecks = [
    text.includes("<") && text.includes(">"),
    /<\w+[^>]*>[\s\S]*?<\/\w+>/.test(text), // Matched tags
    text.trim().startsWith("<"),
  ];

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);
  const structureScore = structureChecks.filter(Boolean).length;

  let score = strongMatches * 30 + mediumMatches * 15 + structureScore * 10;

  // Penalty for non-XML patterns
  const penalties = countMatches(text, ["console.log", "def ", "function("]);
  score = Math.max(0, score - penalties * 25);

  if (strongMatches > 0) reasons.push(`${strongMatches} strong XML patterns`);
  if (mediumMatches > 0) reasons.push(`${mediumMatches} medium XML patterns`);
  if (structureScore > 0) reasons.push(`${structureScore}/3 XML structure checks`);

  return {
    language: "XML",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
