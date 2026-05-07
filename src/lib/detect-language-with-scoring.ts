import { LanguageScore } from "@/types/language-score";

import {
  scoreAssembly,
  scoreBase64,
  scoreBash,
  scoreC,
  scoreCPlusPlus,
  scoreCSharp,
  scoreCSS,
  scoreDart,
  scoreDockerfile,
  scoreGo,
  scoreHaskell,
  scoreHTML,
  scoreINI,
  scoreJava,
  scoreJavaScript,
  scoreJSON,
  scoreKotlin,
  scoreLaTeX,
  scoreLua,
  scoreMarkdown,
  scoreMatlab,
  scoreMermaid,
  scorePerl,
  scorePHP,
  scorePowerShell,
  scorePython,
  scoreR,
  scoreRegex,
  scoreRuby,
  scoreRust,
  scoreScala,
  scoreSQL,
  scoreSwift,
  scoreTypeScript,
  scoreXML,
  scoreYAML,
} from "./language-scores";

export const detectLanguageWithScoring = (
  text: string
): { topLanguage: LanguageScore | null; allScores: LanguageScore[] } => {
  if (!text.trim()) return { topLanguage: null, allScores: [] };

  const scorers = [
    scoreJSON,
    scorePython,
    scoreJavaScript,
    scoreTypeScript,
    scoreHTML,
    scoreCSS,
    scoreJava,
    scoreCSharp,
    scorePHP,
    scoreSQL,
    scoreCPlusPlus,
    scoreC,
    scoreGo,
    scoreRust,
    scoreSwift,
    scoreKotlin,
    scoreDart,
    scoreRuby,
    scorePerl,
    scoreBash,
    scorePowerShell,
    scoreR,
    scoreMatlab,
    scoreScala,
    scoreHaskell,
    scoreLua,
    scoreAssembly,
    scoreBase64,
    scoreDockerfile,
    scoreINI,
    scoreLaTeX,
    scoreMermaid,
    scoreMarkdown,
    scoreRegex,
    scoreXML,
    scoreYAML,
  ];

  const allScores = scorers
    .map(fn => fn(text))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score);

  return { topLanguage: allScores[0] ?? null, allScores };
};
