export interface LanguageScore {
  language: string;
  score: number;
  confidence: "High" | "Medium" | "Low";
  reasons: string[];
}
