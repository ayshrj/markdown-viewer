import type { Metadata } from "next";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "MDLens",
  description:
    "A focused markdown reader with multi-file sessions, outline navigation, themes, math, diagrams, and syntax highlighting.",
  icons: {
    icon: [{ url: "/mdlens-icon.svg", type: "image/svg+xml" }],
    shortcut: ["/mdlens-icon.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
