export const TAILWIND_SCREEN_SIZE = ["xs", "sm", "md", "lg", "xl", "2xl"] as const;

export type TailwindScreenSize = (typeof TAILWIND_SCREEN_SIZE)[number];

export const TAILWIND_SCREEN_WIDTH: Record<TailwindScreenSize, number> = {
  xs: 320,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  "2xl": 1536,
};

export const divisionMap: Record<number, number> = {
  0: 1,
  [TAILWIND_SCREEN_WIDTH.sm]: 2,
  [TAILWIND_SCREEN_WIDTH.md]: 3,
  [TAILWIND_SCREEN_WIDTH.lg]: 4,
  [TAILWIND_SCREEN_WIDTH.xl]: 5,
  [TAILWIND_SCREEN_WIDTH["2xl"]]: 6,
} as const;
