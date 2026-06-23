import { useEffect, useLayoutEffect } from "react";

// useLayoutEffect on the client avoids first-paint flicker; falls back to useEffect on the server.
export const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
