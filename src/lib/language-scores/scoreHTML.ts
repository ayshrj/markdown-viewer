import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scoreHTML = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [/<!doctype\s+html/i, /<html[^>]*>/i, /<head[^>]*>/i, /<body[^>]*>/i];

  const mediumPatterns = [
    /<meta[^>]*>/i,
    /<title[^>]*>/i,
    /<script[^>]*>/i,
    /<style[^>]*>/i,
    /<link[^>]*>/i,
    /<div[^>]*>/i,
    /<span[^>]*>/i,
  ];

  const weakPatterns = [/<[a-zA-Z][^>]*>/, /<\/[a-zA-Z][^>]*>/];

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);
  const weakMatches = countMatches(text, weakPatterns);

  const score = strongMatches * 30 + mediumMatches * 15 + Math.min(weakMatches * 3, 30);

  if (strongMatches > 0) reasons.push(`${strongMatches} strong HTML patterns`);
  if (mediumMatches > 0) reasons.push(`${mediumMatches} medium HTML patterns`);
  if (weakMatches > 0) reasons.push(`${weakMatches} HTML tags found`);

  return {
    language: "HTML",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
