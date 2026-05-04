import { useWindowHeight, useWindowWidth } from "@react-hook/window-size/throttled";
import { useMemo } from "react";

import type { TailwindScreenSize } from "@/lib/tailwind";
import { TAILWIND_SCREEN_SIZE, TAILWIND_SCREEN_WIDTH } from "@/lib/tailwind";

export function useScreenSize(): {
  breakpoint: TailwindScreenSize | undefined;
  screenWidth: number;
  screenHeight: number;
  isMobile: boolean;
} {
  const width = useWindowWidth();
  const height = useWindowHeight();

  const breakpoint = useMemo(() => {
    for (let i = 1; i < TAILWIND_SCREEN_SIZE.length; i++) {
      if (width < TAILWIND_SCREEN_WIDTH[TAILWIND_SCREEN_SIZE[i]]) return TAILWIND_SCREEN_SIZE[i - 1];
    }
    return TAILWIND_SCREEN_SIZE[TAILWIND_SCREEN_SIZE.length - 1];
  }, [width]);

  const isMobile = useMemo(() => {
    return width < TAILWIND_SCREEN_WIDTH.md;
  }, [width]);

  return {
    breakpoint,
    screenWidth: width,
    screenHeight: height,
    isMobile,
  };
}
