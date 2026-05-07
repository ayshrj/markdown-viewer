import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreSQL = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "SQL",
    text,
    groups: [
      {
        label: "strong SQL statement patterns",
        points: 28,
        patterns: [
          /\bSELECT\b[\s\S]+\bFROM\b/i,
          /\bINSERT\s+INTO\b/i,
          /\bUPDATE\b[\s\S]+\bSET\b/i,
          /\bDELETE\s+FROM\b/i,
          /\bCREATE\s+(?:TABLE|INDEX|VIEW|DATABASE)\b/i,
          /\bALTER\s+TABLE\b/i,
          /\bDROP\s+(?:TABLE|INDEX|VIEW|DATABASE)\b/i,
        ],
      },
      {
        label: "medium SQL clause patterns",
        points: 12,
        max: 36,
        patterns: [/\bWHERE\b/i, /\bJOIN\b/i, /\bGROUP\s+BY\b/i, /\bORDER\s+BY\b/i, /\bHAVING\b/i, /\bLIMIT\s+\d+/i],
      },
      {
        label: "weak SQL indicators",
        points: 5,
        max: 15,
        patterns: [/\bPRIMARY\s+KEY\b/i, /\bFOREIGN\s+KEY\b/i, /\bVARCHAR\s*\(/i, /\bCOUNT\s*\(/i],
      },
    ],
    penalties: [
      {
        label: "non-SQL source syntax",
        points: 24,
        patterns: [/^\s*(?:function|const|let|def|class|import|export)\b/m, /console\.log\s*\(/, /^\s*[{[]/],
      },
    ],
  });
