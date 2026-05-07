import { LanguageScore } from "@/types/language-score";

import { scoreByPatterns } from "./patternScore";

export const scoreDockerfile = (text: string): LanguageScore =>
  scoreByPatterns({
    language: "Dockerfile",
    text,
    groups: [
      {
        label: "strong Dockerfile instructions",
        points: 28,
        patterns: [
          /^\s*FROM\s+(?:--platform=\S+\s+)?[\w./:-]+(?:\s+AS\s+\w+)?\s*$/im,
          /^\s*RUN\s+.+$/im,
          /^\s*COPY\s+(?:--from=\S+\s+)?\S+\s+\S+/im,
          /^\s*ADD\s+\S+\s+\S+/im,
          /^\s*CMD\s+(?:\[|.+$)/im,
          /^\s*ENTRYPOINT\s+(?:\[|.+$)/im,
          /^\s*WORKDIR\s+\S+/im,
          /^\s*EXPOSE\s+\d+/im,
        ],
      },
      {
        label: "medium Dockerfile instructions",
        points: 14,
        max: 42,
        patterns: [
          /^\s*ENV\s+\w+=?.*/im,
          /^\s*ARG\s+\w+/im,
          /^\s*LABEL\s+[\w.-]+=/im,
          /^\s*USER\s+\S+/im,
          /^\s*VOLUME\s+(?:\[|\S+)/im,
          /^\s*HEALTHCHECK\s+/im,
          /^\s*SHELL\s+\[/im,
        ],
      },
    ],
    bonuses: [{ label: "starts with FROM", points: 16, test: value => /^\s*FROM\s+/i.test(value.trim()) }],
    penalties: [
      {
        label: "plain shell without Dockerfile structure",
        points: 18,
        patterns: [/^\s*(?:npm|pnpm|yarn|bun|git|curl|wget)\s+/m, /^#!.*\bsh\b/m],
      },
    ],
  });
