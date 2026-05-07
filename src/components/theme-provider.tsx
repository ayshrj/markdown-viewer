"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Keep the server and first client render identical. The real app mounts
  // only after next-themes can read the user's stored/system preference.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!mounted) {
    return <StartupLoader />;
  }

  return (
    <NextThemesProvider
      attribute="data-mode"
      defaultTheme="system"
      disableTransitionOnChange
      enableColorScheme
      enableSystem
      storageKey="markdown-reader:theme-mode"
    >
      {children}
    </NextThemesProvider>
  );
}

function StartupLoader() {
  return (
    <main className="grid min-h-screen place-items-center bg-[var(--bg)] p-6 text-[var(--text)]">
      <div className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-5 py-4 text-sm shadow-sm">
        <p className="font-bold">Loading MDLens</p>
        <p className="mt-1 text-xs text-[var(--muted)]">Preparing your theme...</p>
      </div>
    </main>
  );
}
