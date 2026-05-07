import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";
import { scoreJavaScript } from "./scoreJavaScript";

export const scoreTypeScript = (text: string): LanguageScore => {
  const base = scoreByPatterns({
    language: "TypeScript",
    text,
    groups: [
      {
        label: "strong TypeScript patterns",
        points: 30,
        patterns: [
          /\binterface\s+\w+(?:\s+extends\s+\w+)?\s*\{/,
          /\btype\s+\w+\s*=\s*[^=]/,
          /\benum\s+\w+\s*\{/,
          /\b(?:public|private|protected|readonly)\s+\w+/,
          /\bimplements\s+\w+/,
          /\bas\s+(?:const|\w+)/,
          /:\s*(?:string|number|boolean|unknown|never|void|Promise<[^>]+>)/,
        ],
      },
      {
        label: "medium TypeScript annotations",
        points: 14,
        max: 42,
        patterns: [/<[A-Z]\w*(?:,\s*\w+)?>/, /\w+\?:\s*\w+/, /\)\s*:\s*\w+/, /\bnamespace\s+\w+\s*\{/],
      },
    ],
    penalties: [
      {
        label: "non-TypeScript syntax",
        points: 24,
        patterns: [/^\s*(?:def|#include|package\s+main|fn\s+main|public\s+class)\b/m, /<\?php/],
      },
    ],
    bonuses: [
      {
        label: "typed variable declaration",
        points: 12,
        test: value => /\b(?:const|let|var)\s+\w+\s*:\s*\w+\s*=/.test(value),
      },
    ],
  });

  const jsScore = scoreJavaScript(text);
  const jsBonus = jsScore.score >= 35 ? Math.min(18, Math.round(jsScore.score * 0.2)) : 0;
  const score = Math.min(100, base.score + jsBonus);

  return {
    ...base,
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: jsBonus > 0 ? [...base.reasons, `+${jsBonus}pts for JavaScript compatibility`] : base.reasons,
  };
};
