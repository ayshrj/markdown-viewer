import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scoreYAML = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [
    /^---\s*$/m, // Document separator
    /^\s*\w+:\s*$/m, // Key without value
    /^\s*-\s+\w+:\s/m, // List item with key
    /^\s*\|\s*$/m, // Literal block scalar
    /^\s*>\s*$/m, // Folded block scalar
  ];

  const mediumPatterns = [
    /^\s*\w+:\s+.+$/m, // Key: value pairs
    /^\s*-\s+/m, // List items
    /^\s*#.*$/m, // Comments
    /:\s*\[.*\]/, // Inline arrays
    /:\s*\{.*\}/, // Inline objects
  ];

  const yamlStructure = [
    /:\s/.test(text), // Contains key-value pairs
    /^\s*-\s/m.test(text), // Contains lists
    !/[{}]/.test(text) || /:\s*[{[]/.test(text), // Minimal braces or YAML-style
  ];

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);
  const structureScore = yamlStructure.filter(Boolean).length;

  let score = strongMatches * 25 + mediumMatches * 15 + structureScore * 8;

  // Bonus for proper indentation
  const lines = text.split("\n").filter(line => line.trim());
  const indentedLines = lines.filter(line => /^\s{2,}/.test(line));
  if (indentedLines.length > 0) {
    score += 10;
    reasons.push("+10pts for YAML indentation");
  }

  if (strongMatches > 0) reasons.push(`${strongMatches} strong YAML patterns`);
  if (mediumMatches > 0) reasons.push(`${mediumMatches} medium YAML patterns`);

  return {
    language: "YAML",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
