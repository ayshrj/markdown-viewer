export type ThemeMode = "system" | "light" | "dark";

export type Palette = "paper" | "graphite" | "ocean" | "ember";

export type MobileTab = "write" | "preview" | "outline";

export type MarkdownDocument = {
  source: string;
  filename?: string;
  title: string;
  frontmatter: Record<string, unknown>;
  updatedAt: number;
};

export type HeadingItem = {
  id: string;
  depth: number;
  text: string;
};

export type ParsedMarkdownDocument = MarkdownDocument & {
  content: string;
  headings: HeadingItem[];
};

export type DocumentStats = {
  words: number;
  characters: number;
  readingMinutes: number;
  headings: number;
};
