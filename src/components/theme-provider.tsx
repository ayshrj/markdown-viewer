"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useEffect, useState } from "react";

import MDLensIcon from "@/components/mdlens-icon";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  // Keep the server and first client render identical. The real app mounts
  // only after next-themes can read the user's stored/system preference.

  useEffect(() => {
    setMounted(true);
  }, []);

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
        <div className="flex items-center gap-3">
          <MDLensIcon
            aria-hidden
            className="mdlens-icon size-9 rounded-lg"
            focusable="false"
            showSubtitle={false}
            size={36}
          />
          <p className="font-bold">
            <span>
              <span className="mdlens-wordmark-primary">MD</span>
              <span className="mdlens-wordmark-accent">Lens</span>
            </span>
          </p>
        </div>
        <p className="mt-1 text-xs text-[var(--muted)]">Preparing your theme...</p>
      </div>
    </main>
  );
}
