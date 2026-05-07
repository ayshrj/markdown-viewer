import { LanguageScore } from "@/types/language-score";

export const scoreJSON = (text: string): LanguageScore => {
  const reasons: string[] = [];
  let score = 0;

  const trimmed = text.trim();
  if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    try {
      JSON.parse(text);
      score = 100;
      reasons.push("Valid JSON structure");
    } catch {
      if (trimmed.includes(":") && trimmed.includes('"')) {
        score = 30;
        reasons.push("JSON-like structure but invalid syntax");
      }
    }
  } else if (trimmed.startsWith("{") && !trimmed.endsWith("}") && trimmed.includes(":")) {
    score = 20;
    reasons.push("Incomplete JSON structure");
  }

  return {
    language: "JSON",
    score,
    confidence: score >= 80 ? "High" : score >= 40 ? "Medium" : "Low",
    reasons,
  };
};
