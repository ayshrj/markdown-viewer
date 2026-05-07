import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scoreBash = (text: string): LanguageScore => {
  const strongPatterns = [
    /^#!/, // shebang
    /echo\s+['"$]/, // echo with quotes or variables
    /\$\w+/, // $variable
    /\$\{[^}]+\}/, // ${variable}
    /if\s*\[\s*.+\s*\]/, // if [ condition ]
    /for\s+\w+\s+in\s*/, // for var in
    /while\s*\[\s*.+\s*\]/, // while [ condition ]
    /chmod\s+/, // chmod
    /grep\s+/, // grep
    /awk\s+/, // awk
    /sed\s+/, // sed
  ];

  const matches = countMatches(text, strongPatterns);
  const score = calculateScore(matches, strongPatterns.length);

  return {
    language: "Bash",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} Bash patterns matched`],
  };
};
