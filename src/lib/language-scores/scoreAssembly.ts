import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scoreAssembly = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const x86Instructions = [
    /\bmov\s+/,
    /\badd\s+/,
    /\bsub\s+/,
    /\bmul\s+/,
    /\bdiv\s+/,
    /\bjmp\s+/,
    /\bcall\s+/,
    /\bret\b/,
    /\bpush\s+/,
    /\bpop\s+/,
    /\bcmp\s+/,
    /\btest\s+/,
    /\bjz\s+/,
    /\bjnz\s+/,
  ];

  const registers = [/\b[er]?[abcd]x\b/i, /\b[er]?[sb]p\b/i, /\b[er]?[sd]i\b/i, /\brd?\b/i, /\br1[0-5]d?\b/i];

  const asmPatterns = [
    /^\s*\w+:/m, // Labels
    /;\s*.*$/m, // Comments
    /^\s*\.\w+/m, // Directives
  ];

  const instructionMatches = countMatches(text, x86Instructions);
  const registerMatches = countMatches(text, registers);
  const patternMatches = countMatches(text, asmPatterns);

  const score = instructionMatches * 15 + registerMatches * 10 + patternMatches * 12;

  if (instructionMatches > 0) reasons.push(`${instructionMatches} assembly instructions`);
  if (registerMatches > 0) reasons.push(`${registerMatches} register references`);
  if (patternMatches > 0) reasons.push(`${patternMatches} assembly patterns`);

  return {
    language: "Assembly",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
