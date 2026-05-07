// Helper function to count pattern matches
export const countMatches = (text: string, patterns: (string | RegExp)[]): number => {
  return patterns.reduce((count, pattern) => {
    if (typeof pattern === "string") {
      return count + (text.includes(pattern) ? 1 : 0);
    } else {
      return count + (pattern.test(text) ? 1 : 0);
    }
  }, 0);
};
