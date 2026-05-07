import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreBash = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Bash",
    text,
    groups: [
      {
        label: "strong shell/package-manager patterns",
        points: 26,
        patterns: [
          /^#!.*\b(?:ba|z|fi)?sh\b/m,
          /^\s*(?:npm|pnpm|yarn|bun)\s+(?:install|i|add|remove|rm|run|exec|dlx|create|init|dev|build|test)\b/m,
          /^\s*npx\s+[\w@./-]+/m,
          /^\s*(?:curl|wget)\s+(?:-[\w-]+\s+)*https?:\/\//m,
          /^\s*git\s+(?:clone|checkout|switch|pull|push|status|commit|add|merge|rebase|branch)\b/m,
          /^\s*(?:chmod|chown|mkdir|rm|cp|mv|touch|cat|grep|awk|sed)\b/m,
          /^\s*(?:export|source|alias)\s+[\w-]+/m,
          /\$\{?[A-Za-z_][\w]*\}?/,
        ],
      },
      {
        label: "medium shell control/pipe patterns",
        points: 14,
        max: 42,
        patterns: [
          /\|\s*(?:grep|awk|sed|sort|uniq|head|tail|xargs)\b/,
          /(?:^|\s)(?:&&|\|\||;)\s*\w+/m,
          /^\s*(?:cd|ls|pwd)\b/m,
          /^\s*if\s+\[\s+.+\s+\];?\s*then\b/m,
          /^\s*for\s+\w+\s+in\s+.+;?\s*do\b/m,
          /^\s*while\s+\[\s+.+\s+\];?\s*do\b/m,
          /(?:^|\s)[A-Z_][A-Z0-9_]*=.*/,
          /(?:>|>>|2>|2>&1)\s*[\w./-]+/,
        ],
      },
      {
        label: "weak command-line indicators",
        points: 5,
        max: 15,
        patterns: [/^\s*-\w+(?:\s|$)/m, /~\//, /\.\//],
      },
    ],
    bonuses: [
      {
        label: "standalone package-manager command",
        points: 50,
        test: value => /^\s*(?:npm|pnpm|yarn|bun|npx)\s+[\w:@./-]+(?:\s+[\w:@./=-]+)*\s*$/m.test(value.trim()),
      },
      {
        label: "multi-line command script",
        points: 10,
        test: value =>
          value.split("\n").filter(line => /^\s*(?:npm|pnpm|yarn|bun|git|cd|mkdir|curl|wget)\b/.test(line)).length >= 2,
      },
    ],
    penalties: [
      {
        label: "non-shell source syntax",
        points: 24,
        patterns: [/^\s*(?:function|const|let|var)\s+/m, /^\s*(?:def|class)\s+\w+/m, /^\s*FROM\s+[\w.:/-]+/m, /<\?php/],
      },
    ],
  });
