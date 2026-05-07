import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scorePerl = (text: string): LanguageScore => {
  const strongPatterns = [
    /#!\/.*perl/, // #!/usr/bin/perl
    /use\s+strict/, // use strict
    /use\s+warnings/, // use warnings
    /my\s+\$\w+/, // my $variable
    /\$\w+\s*=/, // $variable =
    /sub\s+\w+/, // sub subroutine
    /chomp\s*\(/, // chomp(
    /split\s*\(/, // split(
    /@\w+/, // @array
    /%\w+/, // %hash
  ];

  const matches = countMatches(text, strongPatterns);
  const score = calculateScore(matches, strongPatterns.length);

  return {
    language: "Perl",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} Perl patterns matched`],
  };
};
