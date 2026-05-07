"use client";

import { useTheme } from "next-themes";
import { useEffect, useMemo, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toCodeFenceLanguage } from "@/lib/code-language";
import { detectLanguageWithScoring } from "@/lib/detect-language-with-scoring";

type HighlightedCodeProps = {
  code: string;
  fenceStartOffset?: number;
  language?: string;
  onLanguageSelect?: (language: string) => void;
};

export function HighlightedCode({ code, fenceStartOffset, language, onLanguageSelect }: HighlightedCodeProps) {
  const { resolvedTheme } = useTheme();
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedDetectedLanguage, setSelectedDetectedLanguage] = useState("");
  const explicitLanguage = language?.trim();
  const detectedLanguages = useMemo(() => {
    if (explicitLanguage) return [];
    return detectLanguageWithScoring(code)
      .allScores.filter(candidate => candidate.score >= 35)
      .slice(0, 5);
  }, [code, explicitLanguage]);
  const topDetectedLanguage = detectedLanguages[0];
  const defaultDetectedLanguage = topDetectedLanguage ? toCodeFenceLanguage(topDetectedLanguage.language) : "";
  const highlightLanguage = explicitLanguage || "text";
  const label = explicitLanguage || "text";
  const lineCount = code.trimEnd().split("\n").length;
  const canApplyDetectedLanguage = Boolean(
    !explicitLanguage && typeof fenceStartOffset === "number" && detectedLanguages.length > 0 && onLanguageSelect
  );
  const selectedLanguageToApply = selectedDetectedLanguage || defaultDetectedLanguage;

  useEffect(() => {
    setSelectedDetectedLanguage(defaultDetectedLanguage);
  }, [defaultDetectedLanguage]);

  useEffect(() => {
    let active = true;

    async function highlight() {
      setError(null);
      setHtml("");

      try {
        const shiki = await import("shiki");
        const requestedLanguage = highlightLanguage.toLowerCase();
        const languageName =
          requestedLanguage in shiki.bundledLanguages || requestedLanguage in shiki.bundledLanguagesAlias
            ? requestedLanguage
            : "text";
        const theme = resolvedTheme === "dark" ? "github-dark-default" : "github-light-default";
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
  }, [code, highlightLanguage, resolvedTheme]);

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
      <figcaption className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
        <span className="flex items-center gap-2">
          <span>{label}</span>
          <span className="text-[var(--muted-soft)]">
            {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {canApplyDetectedLanguage ? (
            <>
              <span className="tracking-normal text-[var(--muted-soft)] normal-case">Detected</span>
              <Select onValueChange={setSelectedDetectedLanguage} value={selectedLanguageToApply}>
                <SelectTrigger
                  aria-label="Detected code language candidates"
                  size="sm"
                  title="Choose a language candidate"
                  className="min-h-8 max-w-44 rounded-md border-[var(--line-strong)] bg-[var(--panel)] px-2 text-[0.7rem] font-bold tracking-normal text-[var(--muted)] normal-case shadow-none hover:bg-[var(--panel-sunken)] hover:text-[var(--text)] focus-visible:border-[var(--accent)] focus-visible:ring-[var(--accent)]/20"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  align="end"
                  className="border border-[var(--line-strong)] bg-[var(--panel)] text-[var(--text)]"
                >
                  {detectedLanguages.map(candidate => {
                    const candidateLanguage = toCodeFenceLanguage(candidate.language);
                    return (
                      <SelectItem
                        key={candidate.language}
                        value={candidateLanguage}
                        className="text-xs focus:bg-[var(--panel-sunken)] focus:text-[var(--text)]"
                      >
                        {candidate.language} · {candidate.confidence} · {candidate.score}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-8 rounded-md border-[var(--line-strong)] bg-transparent px-2.5 text-[0.7rem] font-bold tracking-normal text-[var(--muted)] normal-case shadow-none hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
                disabled={!selectedLanguageToApply}
                onClick={() => {
                  if (!selectedLanguageToApply) return;
                  onLanguageSelect?.(selectedLanguageToApply);
                }}
                title="Write this language into the markdown source fence"
              >
                Apply
              </Button>
            </>
          ) : null}
          <CopyButton copied={copied} onClick={copyCode} />
        </span>
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
