import { LanguageScore } from "@/types/language-score";

export const scoreJSON = (text: string): LanguageScore => {
  const reasons: string[] = [];
  const trimmed = text.trim();
  let score = 0;

  if (!trimmed) {
    return { language: "JSON", score: 0, confidence: "Low", reasons };
  }

  const hasJsonBoundary =
    (trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"));

  if (hasJsonBoundary) {
    try {
      JSON.parse(trimmed);
      score = 100;
      reasons.push("Valid JSON structure");
    } catch {
      if (/"[^"]+"\s*:/.test(trimmed)) {
        score = 40;
        reasons.push("JSON-like object with invalid syntax");
      }
    }
  } else if (/^\s*"[^"]+"\s*:/.test(trimmed) && !/^\s*[\w-]+\s*:/.test(trimmed)) {
    score = 28;
    reasons.push("JSON property fragment");
  }

  if (/^\s*(?:const|let|var|export|function)\b/m.test(trimmed)) {
    score = Math.max(0, score - 45);
    reasons.push("-45pts for JavaScript syntax");
  }

  return {
    language: "JSON",
    score,
    confidence: score >= 80 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
