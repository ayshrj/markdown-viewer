export const calculateScore = (
  matches: number,
  totalPatterns: number,
  bonusPoints: number = 0,
  penalty: number = 0
): number => {
  if (totalPatterns === 0) return 0;
  const baseScore = (matches / totalPatterns) * 80; // Max 80 from patterns
  const finalScore = Math.min(100, Math.max(0, baseScore + bonusPoints - penalty));
  return Math.round(finalScore * 100) / 100; // Round to 2 decimal places
};
