import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scorePowerShell = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "PowerShell",
    text,
    groups: [
      {
        label: "strong PowerShell patterns",
        points: 26,
        patterns: [
          /\b(?:Get|Set|New|Remove|Start|Stop|Restart|Invoke|Import|Export|Install|Update)-[A-Z]\w+\b/,
          /\bWrite-(?:Host|Output|Error|Warning)\b/,
          /\$env:[A-Za-z_][\w]*/,
          /\$PSVersionTable\b/,
          /^\s*param\s*\(/m,
          /\[Parameter\(/,
          /\bSet-ExecutionPolicy\b/,
          /\bInstall-Module\b/,
        ],
      },
      {
        label: "medium Windows shell/package patterns",
        points: 14,
        max: 42,
        patterns: [
          /^\s*(?:winget|choco|scoop)\s+(?:install|upgrade|search|list)\b/m,
          /\|\s*(?:Where-Object|ForEach-Object|Select-Object|Sort-Object)\b/,
          /\$_\./,
          /-[A-Z][A-Za-z]+\s+["'\w]/,
          /\$\w+\s*=/,
          /\bConvertTo-Json\b|\bConvertFrom-Json\b/,
        ],
      },
      {
        label: "weak PowerShell indicators",
        points: 5,
        max: 15,
        patterns: [/\b.ps1\b/i, /\b-NoProfile\b/, /\b-ExecutionPolicy\b/],
      },
    ],
    bonuses: [
      {
        label: "standalone Windows package-manager command",
        points: 40,
        test: value => /^\s*(?:winget|choco|scoop)\s+(?:install|upgrade|search|list)\b.+$/m.test(value.trim()),
      },
    ],
    penalties: [
      {
        label: "Unix shell or source syntax",
        points: 24,
        patterns: [/^#!.*\bsh\b/m, /^\s*(?:npm|pnpm|yarn|bun|git)\s+/m, /^\s*(?:function|const|let|def)\s+/m],
      },
    ],
  });
