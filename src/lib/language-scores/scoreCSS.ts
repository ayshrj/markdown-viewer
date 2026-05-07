import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scoreCSS = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [/@media\s*\([^)]*\)/, /@import\s+['"]/, /@keyframes\s+\w+/];

  const mediumPatterns = [/[.#]?[\w-]+\s*\{[^}]*\}/, /:\s*\w+\s*;/];

  const cssProperties = [
    "color",
    "background",
    "margin",
    "padding",
    "font",
    "border",
    "width",
    "height",
    "display",
    "position",
    "flex",
    "grid",
  ];

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);
  const propertyMatches = countMatches(
    text,
    cssProperties.map(prop => new RegExp(`${prop}\\s*:`, "i"))
  );

  const hasStructure = text.includes("{") && text.includes("}") && text.includes(":");

  let score = strongMatches * 25 + mediumMatches * 15 + propertyMatches * 8;
  if (hasStructure) {
    score += 15;
    reasons.push("+15pts for CSS structure");
  }

  if (strongMatches > 0) reasons.push(`${strongMatches} strong CSS patterns`);
  if (mediumMatches > 0) reasons.push(`${mediumMatches} medium CSS patterns`);
  if (propertyMatches > 0) reasons.push(`${propertyMatches} CSS properties`);

  return {
    language: "CSS",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
