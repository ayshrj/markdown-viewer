import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreRegex = (text: string): LanguageScore => {
  const trimmed = text.trim();
  const regexCharCount = (trimmed.match(/[\\^$.*+?()[\]{}|]/g) ?? []).length;
  const density = trimmed.length > 0 ? regexCharCount / trimmed.length : 0;

  return scoreByPatterns({
    language: "RegEx",
    text,
    groups: [
      {
        label: "strong regex syntax patterns",
        points: 24,
        patterns: [/^\^.+\$$/, /\[[^\]\n]+\]/, /\([^)\n]+\)/, /\\[dDsSwWbB]/, /\{\d+,?\d*}/, /\(\?:[^)]+\)/],
      },
      {
        label: "medium regex operators",
        points: 10,
        max: 30,
        patterns: [/[.*+?]/, /\|/, /\$\//, /^\/.+\/[gimsuy]*$/],
      },
    ],
    bonuses: [{ label: "high regex token density", points: 25, test: () => density >= 0.22 && trimmed.length >= 8 }],
    penalties: [
      {
        label: "source or prose syntax",
        points: 24,
        patterns: [/\s{2,}/, /^\s*(?:function|const|let|def|class|SELECT|npm)\b/m, /[.;]\s*$/m],
      },
    ],
  });
};
