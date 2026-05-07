import { LanguageScore } from "@/types/language-score";

import { countMatches } from "./countMatches";

export const scoreDockerfile = (text: string): LanguageScore => {
  const reasons: string[] = [];

  const strongPatterns = [
    /^FROM\s+[\w.:/-]+/m, // FROM instruction
    /^RUN\s+/m, // RUN instruction
    /^COPY\s+/m, // COPY instruction
    /^ADD\s+/m, // ADD instruction
    /^WORKDIR\s+/m, // WORKDIR instruction
    /^EXPOSE\s+\d+/m, // EXPOSE instruction
    /^CMD\s+/m, // CMD instruction
    /^ENTRYPOINT\s+/m, // ENTRYPOINT instruction
  ];

  const mediumPatterns = [
    /^ENV\s+\w+=.*/m, // ENV instruction
    /^ARG\s+\w+/m, // ARG instruction
    /^LABEL\s+/m, // LABEL instruction
    /^USER\s+/m, // USER instruction
    /^VOLUME\s+/m, // VOLUME instruction
  ];

  const strongMatches = countMatches(text, strongPatterns);
  const mediumMatches = countMatches(text, mediumPatterns);

  let score = strongMatches * 25 + mediumMatches * 15;

  // Must start with FROM (typically)
  if (/^FROM\s+/.test(text.trim())) {
    score += 20;
    reasons.push("+20pts for FROM instruction start");
  }

  if (strongMatches > 0) reasons.push(`${strongMatches} strong Dockerfile patterns`);
  if (mediumMatches > 0) reasons.push(`${mediumMatches} medium Dockerfile patterns`);

  return {
    language: "Dockerfile",
    score: Math.min(100, score),
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons,
  };
};
