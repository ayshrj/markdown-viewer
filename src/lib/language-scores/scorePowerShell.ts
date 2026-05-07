import { LanguageScore } from "@/types/language-score";

import { calculateScore } from "./calculateScore";
import { countMatches } from "./countMatches";

export const scorePowerShell = (text: string): LanguageScore => {
  const strongPatterns = [
    /Write-Host\s+/, // Write-Host
    /Get-\w+/, // Get-Something
    /Set-\w+/, // Set-Something
    /\$_/, // $_
    /param\s*\(/, // param(
    /Import-Module\s+/, // Import-Module
    /\[Parameter\(/, // [Parameter(
    /\$PSVersionTable/, // $PSVersionTable
    /\$\w+\s*=/, // $variable =
  ];

  const matches = countMatches(text, strongPatterns);
  const score = calculateScore(matches, strongPatterns.length);

  return {
    language: "PowerShell",
    score,
    confidence: score >= 70 ? "High" : score >= 35 ? "Medium" : "Low",
    reasons: [`${matches}/${strongPatterns.length} PowerShell patterns matched`],
  };
};
