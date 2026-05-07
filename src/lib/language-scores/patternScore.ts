import { LanguageScore } from "@/types/language-score";

export type Pattern = RegExp | string;

type PatternGroup = {
  label: string;
  patterns: Pattern[];
  points: number;
  max?: number;
};

type Signal = {
  label: string;
  points: number;
  test: Pattern | ((text: string) => boolean);
};

type Penalty = {
  label: string;
  points: number;
  patterns: Pattern[];
};

type ScoreByPatternsOptions = {
  language: string;
  text: string;
  groups?: PatternGroup[];
  bonuses?: Signal[];
  penalties?: Penalty[];
  high?: number;
  medium?: number;
};

export function scoreByPatterns({
  language,
  text,
  groups = [],
  bonuses = [],
  penalties = [],
  high = 70,
  medium = 35,
}: ScoreByPatternsOptions): LanguageScore {
  const reasons: string[] = [];
  let score = 0;

  for (const group of groups) {
    const matches = countPatternMatches(text, group.patterns);
    const points = group.max === undefined ? matches * group.points : Math.min(matches * group.points, group.max);
    score += points;
    if (matches > 0) reasons.push(`${matches} ${group.label}`);
  }

  for (const bonus of bonuses) {
    if (matchesSignal(text, bonus.test)) {
      score += bonus.points;
      reasons.push(`+${bonus.points}pts for ${bonus.label}`);
    }
  }

  for (const penalty of penalties) {
    const matches = countPatternMatches(text, penalty.patterns);
    if (matches > 0) {
      const points = matches * penalty.points;
      score -= points;
      reasons.push(`-${points}pts for ${penalty.label}`);
    }
  }

  const clampedScore = Math.min(100, Math.max(0, Math.round(score)));

  return {
    language,
    score: clampedScore,
    confidence: clampedScore >= high ? "High" : clampedScore >= medium ? "Medium" : "Low",
    reasons,
  };
}

export function countPatternMatches(text: string, patterns: Pattern[]): number {
  return patterns.reduce((count, pattern) => count + (matchesSignal(text, pattern) ? 1 : 0), 0);
}

function matchesSignal(text: string, signal: Pattern | ((text: string) => boolean)): boolean {
  if (typeof signal === "function") return signal(text);
  if (typeof signal === "string") return text.includes(signal);

  signal.lastIndex = 0;
  return signal.test(text);
}
