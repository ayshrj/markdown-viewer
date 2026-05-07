import { LanguageScore } from "@/types/language-score";

export const scoreBase64 = (text: string): LanguageScore => {
  const reasons: string[] = [];
  let score = 0;

  const trimmed = text.trim();
  const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;

  // Check if it's valid base64
  if (base64Pattern.test(trimmed.replace(/\s/g, ""))) {
    const length = trimmed.replace(/\s/g, "").length;
    if (length % 4 === 0 && length > 10) {
      score = 95;
      reasons.push("Valid Base64 format");
    }
  }

  // Check for common Base64 characteristics
  const base64Chars = (text.match(/[A-Za-z0-9+/]/g) || []).length;
  const totalChars = text.replace(/\s/g, "").length;
  const base64Ratio = base64Chars / totalChars;

  if (base64Ratio > 0.9 && totalChars > 20) {
    score = Math.max(score, 80);
    reasons.push(`${Math.round(base64Ratio * 100)}% Base64 characters`);
  }

  // Check for padding
  if (text.endsWith("=") || text.endsWith("==")) {
    score += 15;
    reasons.push("+15pts for Base64 padding");
  }

  return {
    language: "Base64",
    score: Math.min(100, score),
    confidence: score >= 80 ? "High" : score >= 40 ? "Medium" : "Low",
    reasons,
  };
};
