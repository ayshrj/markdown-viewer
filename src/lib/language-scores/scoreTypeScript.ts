import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";
import { scoreJavaScript } from "./scoreJavaScript";

export const scoreTypeScript = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [
    /interface\s+\w+\s*\{/,
    /type\s+\w+\s*=\s*[^=]/,
    /enum\s+\w+\s*\{/,
    /:\s*\w+\s*[=;,)\]]/,
    /<[A-Z]\w*>/,
  ];

  const mediumPatterns = [
    /namespace\s+\w+\s*\{/,
    /abstract\s+class/,
    /implements\s+\w+/,
    /as\s+\w+/,
    /public\s+\w+\s*:/,
    /private\s+\w+\s*:/,
  ];

  // Must have JavaScript features too
  const jsScore = scoreJavaScript(text);

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);

  let score = strongMatches * 30 + mediumMatches * 20;

  // Bonus if it also has JS features
  if (jsScore.score > 20) {
    score += jsScore.score * 0.3;
    reasons.push(`+${Math.round(jsScore.score * 0.3)}pts for JS compatibility`);
  }

  if (strongMatches > 0) reasons.push(`${strongMatches} strong TS patterns`);
  if (mediumMatches > 0) reasons.push(`${mediumMatches} medium TS patterns`);

  return {
    language: "TypeScript",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
