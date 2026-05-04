"use client";

import { Check, Copy } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

type HighlightedCodeProps = {
  code: string;
  language?: string;
};

export function HighlightedCode({ code, language }: HighlightedCodeProps) {
  const { resolvedTheme } = useTheme();
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const label = language?.trim() || "text";

  useEffect(() => {
    let active = true;

    async function highlight() {
      setError(null);
      setHtml("");

      try {
        const shiki = await import("shiki");
        const requestedLanguage = label.toLowerCase();
        const languageName =
          requestedLanguage in shiki.bundledLanguages ||
          requestedLanguage in shiki.bundledLanguagesAlias
            ? requestedLanguage
            : "text";
        const theme =
          resolvedTheme === "dark" ? "github-dark-default" : "github-light-default";
        const nextHtml = await shiki.codeToHtml(code, {
          lang: languageName,
          theme,
        });

        if (active) {
          setHtml(nextHtml);
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Highlighting failed");
        }
      }
    }

    highlight();

    return () => {
      active = false;
    };
  }, [code, label, resolvedTheme]);

  async function copyCode() {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <figure className="code-block overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--code-bg)] text-[var(--code-text)]">
      <figcaption className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs uppercase tracking-[0.14em] text-[var(--muted)]">
        <span>{label}</span>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex min-h-8 items-center gap-2 rounded-md border border-[var(--line-strong)] px-2.5 text-[0.7rem] font-bold transition hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
        >
          {copied ? <Check aria-hidden size={14} /> : <Copy aria-hidden size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <pre className="overflow-x-auto p-4 text-sm leading-7">
          <code>{error ? code : "Highlighting..."}</code>
        </pre>
      )}
      {error ? (
        <p className="border-t border-[var(--line)] px-4 py-2 text-xs text-[var(--muted)]">
          Unsupported highlighter path, showing plain text.
        </p>
      ) : null}
    </figure>
  );
}
