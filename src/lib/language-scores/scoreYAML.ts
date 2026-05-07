import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreYAML = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "YAML",
    text,
    groups: [
      {
        label: "strong YAML structure patterns",
        points: 26,
        patterns: [
          /^---\s*$/m,
          /^\s*[\w.-]+:\s*$/m,
          /^\s*-\s+[\w.-]+:\s+/m,
          /^\s*[\w.-]+:\s*\|/m,
          /^\s*[\w.-]+:\s*>/m,
          /^\s*[\w.-]+:\s*\n\s{2,}[\w.-]+:/m,
        ],
      },
      {
        label: "medium YAML key/list patterns",
        points: 13,
        max: 39,
        patterns: [/^\s*[\w.-]+:\s+[^{}\[\],]+$/m, /^\s*-\s+[^-:\s].+$/m, /:\s*\[[^\]]*\]/, /:\s*\{[^}]*\}/],
      },
      {
        label: "weak YAML indicators",
        points: 5,
        max: 10,
        patterns: [/^\s*#.*$/m, /^\s{2,}\w+:/m],
      },
    ],
    bonuses: [
      {
        label: "multiple YAML key-value lines",
        points: 24,
        test: value => value.split("\n").filter(line => /^\s*[\w.-]+:\s+.+$/.test(line)).length >= 2,
      },
    ],
    penalties: [
      {
        label: "JSON or source syntax",
        points: 28,
        patterns: [/^\s*[{[]/, /"[^"]+"\s*:/, /^\s*(?:const|let|var|function|import|export)\b/m],
      },
      {
        label: "shell command syntax",
        points: 18,
        patterns: [/^\s*(?:npm|pnpm|yarn|bun|git)\s+/m],
      },
    ],
  });
