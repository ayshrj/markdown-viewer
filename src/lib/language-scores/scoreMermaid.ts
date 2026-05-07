import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreMermaid = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Mermaid",
    text,
    groups: [
      {
        label: "strong Mermaid diagram declarations",
        points: 34,
        patterns: [
          /^\s*(?:graph|flowchart)\s+(?:TB|TD|BT|RL|LR)\b/m,
          /^\s*sequenceDiagram\b/m,
          /^\s*classDiagram(?:-v2)?\b/m,
          /^\s*stateDiagram(?:-v2)?\b/m,
          /^\s*erDiagram\b/m,
          /^\s*(?:gantt|gitGraph|journey|mindmap|quadrantChart|requirementDiagram|timeline)\b/m,
          /^\s*pie(?:\s+title\b)?/m,
        ],
      },
      {
        label: "medium Mermaid syntax patterns",
        points: 13,
        max: 39,
        patterns: [
          /-->|---|-.->|==>/,
          /\bparticipant\s+[\w-]+/,
          /\bactor\s+[\w-]+/,
          /^\s*[\w-]+\s*:\s*.+$/m,
          /\bsubgraph\b/,
        ],
      },
      {
        label: "weak Mermaid indicators",
        points: 5,
        max: 10,
        patterns: [/\bactivate\b|\bdeactivate\b|\bautonumber\b/, /\bsection\s+.+/m, /\btitle\s+.+/m],
      },
    ],
    bonuses: [
      {
        label: "standalone Mermaid edge",
        points: 25,
        test: value => /^\s*[\w-]+\s*(?:-->|---|-.->|==>)\s*[\w-]+\s*$/m.test(value),
      },
      {
        label: "declared Mermaid diagram with links",
        points: 30,
        test: value =>
          /^\s*(?:graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram)\b/m.test(value) &&
          /-->|---|-.->|==>/.test(value),
      },
    ],
    penalties: [
      {
        label: "source or shell syntax",
        points: 26,
        patterns: [/^\s*(?:function|const|let|def|class|#include|npm|pnpm|yarn|bun)\b/m, /console\.log\s*\(/, /<\?php/],
      },
    ],
  });
