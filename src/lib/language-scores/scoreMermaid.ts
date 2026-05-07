import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scoreMermaid = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [
    /^\s*(graph|flowchart)\s+(TB|TD|BT|RL|LR)\b/m,
    /^\s*sequenceDiagram\b/m,
    /^\s*classDiagram\b/m,
    /^\s*classDiagram-v2\b/m,
    /^\s*stateDiagram\b/m,
    /^\s*stateDiagram-v2\b/m,
    /^\s*erDiagram\b/m,
    /^\s*gantt\b/m,
    /^\s*gitGraph\b/m,
    /^\s*journey\b/m,
    /^\s*mindmap\b/m,
    /^\s*pie(\s+title\b)?/m,
    /^\s*quadrantChart\b/m,
    /^\s*requirementDiagram\b/m,
    /^\s*timeline\b/m,
  ];

  const mediumPatterns = [
    /-->|---|-.->|==>/,
    /\bparticipant\s+[\w-]+/,
    /\bactor\s+[\w-]+/,
    /^\s*[\w-]+\s*:\s*.+$/m,
    /^\s*[\w-]+\s*(-->|---|-.->|==>)\s*[\w-]+/m,
    /^\s*[\w-]+\s*\{[^}]*$/m,
  ];

  const weakPatterns = [
    /\bsubgraph\b/,
    /\bend\b/,
    /\bactivate\b/,
    /\bdeactivate\b/,
    /\bautonumber\b/,
    /\bsection\s+.+/m,
    /\btitle\s+.+/m,
  ];

  const penaltyPatterns = [
    /^import\s+/m,
    /^export\s+/m,
    /^function\s+\w+\s*\(/m,
    /^def\s+\w+\s*\(/m,
    /^#include\b/m,
    /console\.log\s*\(/,
  ];

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);
  const weakMatches = countMatches(text, weakPatterns);
  const penaltyMatches = countMatches(text, penaltyPatterns);

  let score = strongMatches * 35 + mediumMatches * 14 + weakMatches * 6;
  score = Math.max(0, score - penaltyMatches * 25);

  if (strongMatches > 0) reasons.push(`${strongMatches} strong Mermaid patterns`);
  if (mediumMatches > 0) reasons.push(`${mediumMatches} medium Mermaid patterns`);
  if (weakMatches > 0) reasons.push(`${weakMatches} weak Mermaid indicators`);
  if (penaltyMatches > 0) reasons.push(`-${penaltyMatches * 25}pts for non-Mermaid syntax`);

  return {
    language: "Mermaid",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
