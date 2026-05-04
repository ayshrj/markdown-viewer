"use client";

import type { ChangeEvent, PointerEvent } from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  List,
  Copy,
  Download,
  FileText,
  Monitor,
  Moon,
  RefreshCcw,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { useTheme } from "next-themes";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { getDocumentStats, parseMarkdownDocument } from "@/lib/markdown";
import { SAMPLE_MARKDOWN } from "@/lib/sample-markdown";
import type { ThemeMode } from "@/types/markdown";
import { useScreenSize } from "@/hooks/use-screen-size";

type ViewMode = "split" | "edit" | "read";

const STORAGE_KEYS = {
  source: "markdown-reader:source",
  filename: "markdown-reader:filename",
  updatedAt: "markdown-reader:updated-at",
  viewMode: "markdown-reader:view-mode",
  themeMode: "markdown-reader:theme-mode",
  splitPercent: "markdown-reader:split-percent",
  tocOpen: "markdown-reader:toc-open",
};

const ACCEPTED_EXTENSIONS = [".md", ".markdown", ".mdx", ".txt"];
const ACCEPTED_UPLOADS = ACCEPTED_EXTENSIONS.join(",");
const VIEW_MODES: Array<{ value: ViewMode; label: string }> = [
  { value: "split", label: "Split" },
  { value: "edit", label: "Edit" },
  { value: "read", label: "Read" },
];
const THEME_VALUES: ThemeMode[] = ["system", "light", "dark"];
const MIN_SPLIT_PERCENT = 15;
const MAX_SPLIT_PERCENT = 85;

export function MarkdownStudio() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const { setTheme, theme } = useTheme();
  const [source, setSource] = useState(SAMPLE_MARKDOWN);
  const [filename, setFilename] = useState<string | undefined>();
  const [updatedAt, setUpdatedAt] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [splitPercent, setSplitPercent] = useState(50);
  const [tocOpen, setTocOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const deferredSource = useDeferredValue(source);
  const markdownDocument = parseMarkdownDocument(
    deferredSource,
    filename,
    updatedAt
  );
  const stats = getDocumentStats(
    markdownDocument.content,
    markdownDocument.headings
  );
  const lineCount = source ? source.split("\n").length : 0;
  const selectedTheme = isThemeMode(theme) ? theme : "system";
  const themeIcon =
    selectedTheme === "light" ? Sun : selectedTheme === "dark" ? Moon : Monitor;
  const showEditor = viewMode === "split" || viewMode === "edit";
  const showPreview = viewMode === "split" || viewMode === "read";
  const previewPending = source !== deferredSource;

  const { breakpoint, screenHeight } = useScreenSize();
  const isSmallScreen = useMemo(
    () => breakpoint && ["xs", "sm", "md", "lg"].includes(breakpoint),
    [breakpoint]
  );

  // Hydration from localStorage has to happen after the first commit so the
  // server-rendered shell stays deterministic.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const storedSource = window.localStorage.getItem(STORAGE_KEYS.source);
    const storedFilename = window.localStorage.getItem(STORAGE_KEYS.filename);
    const storedUpdatedAt = Number(
      window.localStorage.getItem(STORAGE_KEYS.updatedAt)
    );
    const storedViewMode = window.localStorage.getItem(STORAGE_KEYS.viewMode);
    const storedTheme = window.localStorage.getItem(STORAGE_KEYS.themeMode);
    const storedSplitPercent = Number(
      window.localStorage.getItem(STORAGE_KEYS.splitPercent)
    );
    const storedTocOpen = window.localStorage.getItem(STORAGE_KEYS.tocOpen);

    if (storedSource !== null) {
      setSource(storedSource);
    }

    if (storedFilename) {
      setFilename(storedFilename);
    }

    if (Number.isFinite(storedUpdatedAt) && storedUpdatedAt > 0) {
      setUpdatedAt(storedUpdatedAt);
    } else {
      setUpdatedAt(Date.now());
    }

    if (isViewMode(storedViewMode)) {
      setViewMode(storedViewMode);
    }

    if (isThemeMode(storedTheme)) {
      setTheme(storedTheme);
    }

    if (Number.isFinite(storedSplitPercent)) {
      setSplitPercent(clampSplitPercent(storedSplitPercent));
    }

    if (storedTocOpen === "true") {
      setTocOpen(true);
    }

    setMounted(true);
  }, [setTheme]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!mounted) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEYS.source, source);
    window.localStorage.setItem(STORAGE_KEYS.updatedAt, String(updatedAt));

    if (filename) {
      window.localStorage.setItem(STORAGE_KEYS.filename, filename);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.filename);
    }
  }, [filename, mounted, source, updatedAt]);

  useEffect(() => {
    if (mounted) {
      window.localStorage.setItem(STORAGE_KEYS.viewMode, viewMode);
    }
  }, [mounted, viewMode]);

  useEffect(() => {
    if (mounted) {
      window.localStorage.setItem(
        STORAGE_KEYS.splitPercent,
        splitPercent.toFixed(2)
      );
    }
  }, [mounted, splitPercent]);

  useEffect(() => {
    if (mounted) {
      window.localStorage.setItem(STORAGE_KEYS.tocOpen, String(tocOpen));
    }
  }, [mounted, tocOpen]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 1800);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  function updateSource(nextSource: string) {
    setSource(nextSource);
    setUpdatedAt(Date.now());
  }

  function handleTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    updateSource(event.target.value);
  }

  async function loadFile(file: File) {
    if (!isAcceptedFile(file)) {
      setToast("Use a .md, .markdown, .mdx, or .txt file.");
      return;
    }

    const text = await file.text();

    setFilename(file.name);
    updateSource(text);
    setToast(`Loaded ${file.name}`);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      void loadFile(file);
    }

    event.target.value = "";
  }

  async function copyMarkdown() {
    if (!navigator.clipboard) {
      setToast("Clipboard is not available.");
      return;
    }

    try {
      await navigator.clipboard.writeText(source);
      setToast("Copied to clipboard");
    } catch {
      setToast("Copy failed");
    }
  }

  function loadSample() {
    setFilename(undefined);
    updateSource(SAMPLE_MARKDOWN);
    setToast("Loaded sample");
  }

  function clearDocument() {
    setFilename(undefined);
    updateSource("");
    setToast("Cleared");
  }

  function downloadMarkdown() {
    const blob = new Blob([source], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename?.trim() || "document.md";
    link.click();
    URL.revokeObjectURL(url);
    setToast("Downloaded markdown");
  }

  function cycleTheme() {
    const currentIndex = THEME_VALUES.indexOf(selectedTheme);
    const nextTheme = THEME_VALUES[(currentIndex + 1) % THEME_VALUES.length];

    setTheme(nextTheme);
  }

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    if (viewMode !== "split" || !splitContainerRef.current) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
    updateSplitFromPointer(event.clientX);
  }

  function handleResize(event: PointerEvent<HTMLButtonElement>) {
    if (!isResizing) {
      return;
    }

    updateSplitFromPointer(event.clientX);
  }

  function stopResize(event: PointerEvent<HTMLButtonElement>) {
    if (!isResizing) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsResizing(false);
  }

  function updateSplitFromPointer(clientX: number) {
    const container = splitContainerRef.current;

    if (!container) {
      return;
    }

    const rect = container.getBoundingClientRect();
    const nextPercent = ((clientX - rect.left) / rect.width) * 100;

    setSplitPercent(clampSplitPercent(nextPercent));
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] p-3 text-[var(--text)] sm:p-6">
      <section className="mx-auto flex min-h-[calc(100vh-1.5rem)] max-w-[1180px] flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-sm sm:min-h-[calc(100vh-3rem)]">
        <header className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2.5">
          <h1 className="mr-auto text-[0.8rem] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
            Markdown
          </h1>

          <div className="flex rounded-lg bg-[var(--panel-sunken)] p-0.5">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => setViewMode(mode.value)}
                className={cx(
                  "rounded-md px-3 py-1 text-xs font-bold transition",
                  viewMode === mode.value
                    ? "border border-[var(--line-strong)] bg-[var(--panel)] text-[var(--text)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                )}
                aria-pressed={viewMode === mode.value}
              >
                {mode.label}
              </button>
            ))}
          </div>

          <div className="mx-0.5 hidden h-5 w-px bg-[var(--line)] sm:block" />

          <input
            ref={fileInputRef}
            className="sr-only"
            type="file"
            accept={ACCEPTED_UPLOADS}
            onChange={handleFileChange}
          />
          <ToolbarButton
            icon={Upload}
            label="Upload"
            onClick={() => fileInputRef.current?.click()}
          />
          <ToolbarButton
            icon={Download}
            label=".md"
            onClick={downloadMarkdown}
          />
          <ToolbarButton icon={Copy} label="Copy" onClick={copyMarkdown} />
          <ToolbarButton
            icon={RefreshCcw}
            label="Sample"
            onClick={loadSample}
          />
          <ToolbarButton icon={Trash2} label="Clear" onClick={clearDocument} />
          <ToolbarButton
            icon={themeIcon}
            label={capitalize(selectedTheme)}
            onClick={cycleTheme}
          />
        </header>

        <div
          ref={splitContainerRef}
          className={cx(
            "flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row",
            viewMode === "read" && "read-layout",
            isResizing && "select-none"
          )}
        >
          {viewMode === "read" ? (
            <aside className={cx("toc-sidebar", tocOpen && "is-open")}>
              <div className="toc-header">Contents</div>
              <nav className="toc-list" aria-label="Table of contents">
                {markdownDocument.headings.length ? (
                  markdownDocument.headings.map((heading) => (
                    <a
                      key={`${heading.id}-${heading.depth}-${heading.text}`}
                      href={`#${heading.id}`}
                      className={cx("toc-item", `toc-depth-${heading.depth}`)}
                    >
                      {heading.text}
                    </a>
                  ))
                ) : (
                  <p className="toc-empty">No headings found</p>
                )}
              </nav>
            </aside>
          ) : null}

          {showEditor ? (
            <section
              className="flex min-h-[420px] min-w-0 flex-col"
              style={
                viewMode === "split" && !isSmallScreen
                  ? {
                      flex: "0 0 auto",
                      width: `${splitPercent}%`,
                    }
                  : { flex: "1 1 auto", width: "100%" }
              }
            >
              <div className="border-b border-[var(--line)] bg-[var(--panel-muted)] px-4 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--muted-soft)]">
                Source
              </div>
              <textarea
                value={source}
                onChange={handleTextChange}
                spellCheck={false}
                aria-label="Markdown source"
                placeholder="Start writing Markdown here..."
                className="min-h-[420px] flex-1 resize-none border-0 bg-transparent p-5 font-mono text-[0.82rem] leading-7 text-[var(--text)] outline-none placeholder:text-[var(--muted-soft)]"
              />
            </section>
          ) : null}

          {viewMode === "split" ? (
            <button
              type="button"
              aria-label="Resize editor and preview panes"
              title="Drag to resize"
              onPointerDown={startResize}
              onPointerMove={handleResize}
              onPointerUp={stopResize}
              onPointerCancel={stopResize}
              className={cx(
                "split-divider hidden lg:flex",
                isResizing && "is-dragging"
              )}
            >
              <span aria-hidden className="split-divider-dots">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </span>
            </button>
          ) : null}

          {showPreview ? (
            <section
              className={cx(
                "flex min-h-[420px] min-w-0 flex-1 flex-col border-t border-[var(--line)] lg:border-t-0",
                viewMode === "read" && "read-scroll-wrap relative"
              )}
            >
              {viewMode === "read" ? (
                <button
                  type="button"
                  onClick={() => setTocOpen((open) => !open)}
                  className="toc-toggle"
                  title="Toggle table of contents"
                  aria-label="Toggle table of contents"
                  aria-expanded={tocOpen}
                >
                  <List aria-hidden size={14} />
                </button>
              ) : null}
              <div className="border-b border-[var(--line)] bg-[var(--panel-muted)] px-4 py-1.5 text-[0.68rem] font-bold uppercase tracking-[0.08em] text-[var(--muted-soft)]">
                {previewPending ? "Previewing..." : "Preview"}
              </div>
              <article
                className={cx(
                  "markdown-body flex-1 overflow-y-auto p-6",
                  viewMode === "read" && "mx-auto w-full max-w-[780px] sm:p-10"
                )}
              >
                {markdownDocument.content.trim() ? (
                  <MarkdownRenderer content={markdownDocument.content} />
                ) : (
                  <div className="grid min-h-[320px] place-items-center text-center text-sm text-[var(--muted)]">
                    <div>
                      <FileText
                        aria-hidden
                        className="mx-auto mb-3 text-[var(--muted-soft)]"
                        size={34}
                      />
                      <p className="font-bold text-[var(--text)]">
                        Nothing to preview yet
                      </p>
                      <p className="mt-1">Write or upload markdown to begin.</p>
                    </div>
                  </div>
                )}
              </article>
            </section>
          ) : null}
        </div>

        <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--line)] bg-[var(--panel-muted)] px-4 py-1.5 text-[0.7rem] text-[var(--muted-soft)]">
          <span>{stats.words.toLocaleString()} words</span>
          <span>{stats.characters.toLocaleString()} chars</span>
          <span>{lineCount.toLocaleString()} lines</span>
          <span>~{stats.readingMinutes} min read</span>
          <span className="min-w-0 truncate">{filename ?? "Local draft"}</span>
        </footer>

        {toast ? (
          <div className="pointer-events-none fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-md border border-[var(--line-strong)] bg-[var(--panel)] px-4 py-2 text-sm font-bold text-[var(--text)] shadow-sm">
            {toast}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function ToolbarButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-8 items-center gap-1.5 whitespace-nowrap rounded-md border border-[var(--line-strong)] bg-transparent px-2.5 text-xs font-bold text-[var(--muted)] transition hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
    >
      <Icon aria-hidden size={13} />
      {label}
    </button>
  );
}

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();

  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && THEME_VALUES.includes(value as ThemeMode);
}

function isViewMode(value: unknown): value is ViewMode {
  return value === "split" || value === "edit" || value === "read";
}

function clampSplitPercent(value: number) {
  return Math.min(Math.max(value, MIN_SPLIT_PERCENT), MAX_SPLIT_PERCENT);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
