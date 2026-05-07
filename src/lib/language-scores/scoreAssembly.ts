import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreAssembly = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Assembly",
    text,
    groups: [
      {
        label: "strong assembly instructions",
        points: 18,
        patterns: [
          /\b(?:mov|lea|add|sub|imul|idiv|xor|and|or|shl|shr)\s+/i,
          /\b(?:jmp|je|jne|jz|jnz|jg|jl|call|ret)\b/i,
          /\b(?:push|pop|cmp|test|nop|int)\b/i,
          /^\s*(?:section|segment)\s+\.\w+/im,
          /^\s*(?:global|extern)\s+\w+/im,
        ],
      },
      {
        label: "medium register/label patterns",
        points: 10,
        max: 40,
        patterns: [
          /\b(?:e?[abcd]x|e?[sb]p|e?[sd]i|r(?:[0-9]|1[0-5])|rax|rbx|rcx|rdx)\b/i,
          /^\s*[A-Za-z_.$][\w.$]*:\s*$/m,
          /;\s*.*$/m,
          /^\s*\.\w+/m,
        ],
      },
    ],
    penalties: [
      {
        label: "high-level source syntax",
        points: 24,
        patterns: [/console\.log\s*\(/, /^\s*(?:function|def|class|import|export|package\s+main)\b/m, /<\?php/],
      },
    ],
  });
