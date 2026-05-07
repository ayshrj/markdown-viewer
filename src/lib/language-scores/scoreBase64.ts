import { LanguageScore } from "@/types/language-score";

export const scoreBase64 = (text: string): LanguageScore => {
  const reasons: string[] = [];
  const compact = text.trim().replace(/\s+/g, "");
  let score = 0;

  if (compact.length < 24 || compact.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) {
    return { language: "Base64", score: 0, confidence: "Low", reasons };
  }

  const padding = compact.endsWith("==") ? 2 : compact.endsWith("=") ? 1 : 0;
  const hasMixedCase = /[a-z]/.test(compact) && /[A-Z]/.test(compact);
  const hasDigits = /\d/.test(compact);
  const hasSymbols = /[+/]/.test(compact);

  score = 45;
  reasons.push("Base64 alphabet and length");

  if (compact.length >= 40) {
    score += 20;
    reasons.push("+20pts for encoded-length plausibility");
  }
  if (hasMixedCase && hasDigits) {
    score += 20;
    reasons.push("+20pts for mixed Base64 character distribution");
  }
  if (hasSymbols || padding > 0) {
    score += 15;
    reasons.push("+15pts for Base64 symbols/padding");
  }

  if (/\b(?:function|class|SELECT|FROM|npm|pnpm|yarn|const|let)\b/.test(text)) {
    score = Math.max(0, score - 45);
    reasons.push("-45pts for source/plain text words");
  }

  return {
    language: "Base64",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
