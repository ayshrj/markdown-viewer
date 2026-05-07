"use client";

import type {
  ChangeEvent,
  DragEvent as ReactDragEvent,
  MouseEvent,
  PointerEvent,
  SyntheticEvent,
} from "react";
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  List,
  Copy,
  Download,
  FilePlus,
  FileText,
  Monitor,
  Moon,
  Pencil,
  RefreshCcw,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { useTheme } from "next-themes";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import MDLensIcon from "@/components/mdlens-icon";
import { getDocumentStats, parseMarkdownDocument } from "@/lib/markdown";
import { SAMPLE_MARKDOWN } from "@/lib/sample-markdown";
import type { ThemeMode } from "@/types/markdown";
import { useScreenSize } from "@/hooks/use-screen-size";

type ViewMode = "split" | "edit" | "read";

type SessionDocument = {
  id: string;
  source: string;
  filename?: string;
  updatedAt: number;
};

const STORAGE_KEYS = {
  source: "markdown-reader:source",
  filename: "markdown-reader:filename",
  updatedAt: "markdown-reader:updated-at",
  documents: "markdown-reader:documents",
  activeDocumentId: "markdown-reader:active-document-id",
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
const DOCUMENT_DRAG_TYPE = "application/x-mdlens-document-id";

export function MarkdownStudio() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const sourcePaneRef = useRef<HTMLElement>(null);
  const previewScrollRef = useRef<HTMLElement>(null);
  const renamePopoverRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);
  const loadFilesRef = useRef<(files: File[]) => Promise<void>>(async () => {});
  const { setTheme, theme } = useTheme();
  const [documents, setDocuments] = useState<SessionDocument[]>(() => [
    createDocument(SAMPLE_MARKDOWN, "Sample.md", "sample", 0),
  ]);
  const [activeDocumentId, setActiveDocumentId] = useState("sample");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [splitPercent, setSplitPercent] = useState(50);
  const [tocOpen, setTocOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(
    null
  );
  const [dropTargetDocumentId, setDropTargetDocumentId] = useState<
    string | null
  >(null);
  const [renamePopoverOpen, setRenamePopoverOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const activeDocument = getActiveDocument(documents, activeDocumentId);
  const source = activeDocument.source;
  const filename = activeDocument.filename;
  const updatedAt = activeDocument.updatedAt;
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

  const { breakpoint } = useScreenSize();
  const isSmallScreen = useMemo(
    () => breakpoint && ["xs", "sm", "md", "lg"].includes(breakpoint),
    [breakpoint]
  );

  // Hydration from localStorage has to happen after the first commit so the
  // server-rendered shell stays deterministic.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const storedDocuments = parseStoredDocuments(
      window.localStorage.getItem(STORAGE_KEYS.documents)
    );
    const storedActiveDocumentId = window.localStorage.getItem(
      STORAGE_KEYS.activeDocumentId
    );
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

    if (storedDocuments.length) {
      setDocuments(storedDocuments);
      setActiveDocumentId(
        storedActiveDocumentId &&
          storedDocuments.some(
            (document) => document.id === storedActiveDocumentId
          )
          ? storedActiveDocumentId
          : storedDocuments[0].id
      );
    } else if (storedSource !== null) {
      const migratedDocument = createDocument(
        storedSource,
        storedFilename || undefined,
        "local-draft",
        Number.isFinite(storedUpdatedAt) && storedUpdatedAt > 0
          ? storedUpdatedAt
          : Date.now()
      );

      setDocuments([migratedDocument]);
      setActiveDocumentId(migratedDocument.id);
    } else {
      setDocuments([createDocument(SAMPLE_MARKDOWN, "Sample.md", "sample", 0)]);
      setActiveDocumentId("sample");
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

    window.localStorage.setItem(
      STORAGE_KEYS.documents,
      JSON.stringify(documents)
    );
    window.localStorage.setItem(
      STORAGE_KEYS.activeDocumentId,
      activeDocumentId
    );
    window.localStorage.setItem(STORAGE_KEYS.source, source);
    window.localStorage.setItem(STORAGE_KEYS.updatedAt, String(updatedAt));

    if (filename) {
      window.localStorage.setItem(STORAGE_KEYS.filename, filename);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.filename);
    }
  }, [activeDocumentId, documents, filename, mounted, source, updatedAt]);

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
    previewScrollRef.current?.scrollTo({ top: 0 });
  }, [activeDocumentId]);

  useEffect(() => {
    if (!showPreview) {
      return;
    }

    function handleWindowWheel(event: WheelEvent) {
      const previewScroll = previewScrollRef.current;

      if (
        !previewScroll ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        isInsideElement(event.target, sourcePaneRef.current) ||
        isEditableWheelTarget(event.target) ||
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ) {
        return;
      }

      event.preventDefault();
      previewScroll.scrollBy({
        top: normalizeWheelDelta(event),
        behavior: "auto",
      });
    }

    window.addEventListener("wheel", handleWindowWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", handleWindowWheel);
    };
  }, [showPreview]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = window.setTimeout(() => setToast(null), 1800);

    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!renamePopoverOpen) {
      return;
    }

    function handlePointerDown(event: globalThis.PointerEvent) {
      if (
        renamePopoverRef.current &&
        event.target instanceof Node &&
        !renamePopoverRef.current.contains(event.target)
      ) {
        setRenamePopoverOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setRenamePopoverOpen(false);
      }
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [renamePopoverOpen]);

  function updateSource(nextSource: string) {
    const nextUpdatedAt = Date.now();

    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === activeDocumentId
          ? { ...document, source: nextSource, updatedAt: nextUpdatedAt }
          : document
      )
    );
  }

  function handleTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    updateSource(event.target.value);
  }

  async function loadFiles(files: File[]) {
    const acceptedFiles = files.filter(isAcceptedFile);
    const rejectedCount = files.length - acceptedFiles.length;

    if (!acceptedFiles.length) {
      setToast("Use a .md, .markdown, .mdx, or .txt file.");
      return;
    }

    const loadedDocuments = await Promise.all(
      acceptedFiles.map(async (file) =>
        createDocument(await file.text(), file.name)
      )
    );

    setDocuments((currentDocuments) => [
      ...currentDocuments,
      ...loadedDocuments,
    ]);
    setActiveDocumentId(loadedDocuments[0].id);
    setToast(
      rejectedCount > 0
        ? `Loaded ${loadedDocuments.length}, skipped ${rejectedCount}`
        : loadedDocuments.length === 1
        ? `Loaded ${loadedDocuments[0].filename}`
        : `Loaded ${loadedDocuments.length} documents`
    );
  }

  useEffect(() => {
    loadFilesRef.current = loadFiles;
  });

  useEffect(() => {
    function handleWindowDragEnter(event: DragEvent) {
      if (!hasDraggedFiles(event)) {
        return;
      }

      event.preventDefault();
      dragDepthRef.current += 1;
      setIsDraggingFiles(true);
    }

    function handleWindowDragOver(event: DragEvent) {
      if (!hasDraggedFiles(event)) {
        return;
      }

      event.preventDefault();

      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
    }

    function handleWindowDragLeave(event: DragEvent) {
      if (!hasDraggedFiles(event)) {
        return;
      }

      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);

      if (dragDepthRef.current === 0) {
        setIsDraggingFiles(false);
      }
    }

    function handleWindowDrop(event: DragEvent) {
      if (!hasDraggedFiles(event)) {
        return;
      }

      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDraggingFiles(false);

      const files = Array.from(event.dataTransfer?.files ?? []);

      if (files.length) {
        void loadFilesRef.current(files);
      }
    }

    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter);
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (files.length) {
      void loadFiles(files);
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
    const sampleDocument = createDocument(SAMPLE_MARKDOWN, "Sample.md");

    setDocuments((currentDocuments) => [...currentDocuments, sampleDocument]);
    setActiveDocumentId(sampleDocument.id);
    setToast("Loaded sample");
  }

  function clearDocument() {
    updateSource("");
    setToast("Cleared current document");
  }

  function openRenamePopover() {
    setRenameValue(activeDocument.filename?.trim() || "Untitled 1.md");
    setRenamePopoverOpen(true);
  }

  function renameActiveDocument(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();

    const nextFilename = normalizeDocumentFilename(renameValue);

    if (!nextFilename) {
      setToast("Name cannot be empty");
      return;
    }

    setDocuments((currentDocuments) =>
      currentDocuments.map((document) =>
        document.id === activeDocumentId
          ? { ...document, filename: nextFilename, updatedAt: Date.now() }
          : document
      )
    );
    setRenamePopoverOpen(false);
    setToast("Renamed document");
  }

  function createBlankDocument() {
    const document = createDocument("", getNextUntitledFilename(documents));

    setDocuments((currentDocuments) => [...currentDocuments, document]);
    setActiveDocumentId(document.id);
    setViewMode("edit");
    setToast("New document");
  }

  function removeDocument(documentId: string) {
    if (documents.length === 1) {
      const replacement = createDocument("", "Untitled 1.md");

      setDocuments([replacement]);
      setActiveDocumentId(replacement.id);
      setToast("Removed document");
      return;
    }

    const nextDocuments = documents.filter(
      (document) => document.id !== documentId
    );

    setDocuments(nextDocuments);

    if (documentId === activeDocumentId) {
      setActiveDocumentId(nextDocuments[0].id);
    }

    setToast("Removed document");
  }

  function handleDocumentDragStart(
    event: ReactDragEvent<HTMLDivElement>,
    documentId: string
  ) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DOCUMENT_DRAG_TYPE, documentId);
    setDraggedDocumentId(documentId);
    setDropTargetDocumentId(documentId);
  }

  function handleDocumentDragOver(
    event: ReactDragEvent<HTMLDivElement>,
    targetDocumentId: string
  ) {
    if (!isDocumentTabDrag(event) || !draggedDocumentId) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (targetDocumentId !== dropTargetDocumentId) {
      setDropTargetDocumentId(targetDocumentId);
    }
  }

  function handleDocumentDrop(
    event: ReactDragEvent<HTMLDivElement>,
    targetDocumentId: string
  ) {
    if (!isDocumentTabDrag(event)) {
      return;
    }

    event.preventDefault();

    const sourceDocumentId =
      event.dataTransfer.getData(DOCUMENT_DRAG_TYPE) || draggedDocumentId;

    if (!sourceDocumentId || sourceDocumentId === targetDocumentId) {
      clearDocumentDragState();
      return;
    }

    setDocuments((currentDocuments) =>
      reorderDocuments(currentDocuments, sourceDocumentId, targetDocumentId)
    );
    clearDocumentDragState();
  }

  function clearDocumentDragState() {
    setDraggedDocumentId(null);
    setDropTargetDocumentId(null);
  }

  function openLinkedDocument(href: string): boolean {
    const hash = getLinkHash(href);
    const linkedFilename = getLinkedMarkdownFilename(href);

    if (!linkedFilename && hash) {
      return scrollPreviewToHeading(hash);
    }

    if (!linkedFilename) {
      return false;
    }

    const linkedDocument = documents.find((document) =>
      documentMatchesFilename(document, linkedFilename)
    );

    if (!linkedDocument) {
      setToast(`Open ${linkedFilename} first`);
      return true;
    }

    setActiveDocumentId(linkedDocument.id);
    setRenamePopoverOpen(false);

    if (hash) {
      window.setTimeout(() => scrollPreviewToHeading(hash), 80);
    }

    setToast(`Opened ${linkedDocument.filename ?? linkedFilename}`);
    return true;
  }

  function handleTocClick(
    event: MouseEvent<HTMLAnchorElement>,
    headingId: string
  ) {
    if (scrollPreviewToHeading(headingId)) {
      event.preventDefault();
    }
  }

  function scrollPreviewToHeading(headingId: string): boolean {
    const scrollContainer = previewScrollRef.current;
    const target = scrollContainer?.querySelector<HTMLElement>(
      `#${CSS.escape(headingId)}`
    );

    if (!scrollContainer || !target) {
      return false;
    }

    const containerTop = scrollContainer.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;

    scrollContainer.scrollTo({
      top: targetTop - containerTop + scrollContainer.scrollTop - 16,
      behavior: "smooth",
    });

    return true;
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
    <main className="h-screen overflow-hidden bg-[var(--bg)] p-3 text-[var(--text)] sm:p-6">
      <section className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-[1180px] flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-sm sm:h-[calc(100vh-3rem)]">
        <header className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2.5">
          <h1 className="mr-auto inline-flex items-center gap-2 text-[0.8rem] font-bold uppercase tracking-[0.08em] text-[var(--muted)]">
            <MDLensIcon
              aria-hidden
              className="mdlens-icon size-5 rounded-[0.35rem]"
              focusable="false"
              showSubtitle={false}
              size={20}
            />
            <span>
              <span className="mdlens-wordmark-primary">MD</span>
              <span className="mdlens-wordmark-accent">Lens</span>
            </span>
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
            multiple
            onChange={handleFileChange}
          />
          <ToolbarButton
            icon={Upload}
            label="Upload"
            onClick={() => fileInputRef.current?.click()}
          />
          <ToolbarButton
            icon={FilePlus}
            label="New"
            onClick={createBlankDocument}
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

        <div className="document-strip flex items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2">
          <div
            className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto"
            aria-label="Open markdown documents"
          >
            {documents.map((document, index) => (
              <div
                key={document.id}
                draggable
                onDragEnd={clearDocumentDragState}
                onDragOver={(event) =>
                  handleDocumentDragOver(event, document.id)
                }
                onDragStart={(event) =>
                  handleDocumentDragStart(event, document.id)
                }
                onDrop={(event) => handleDocumentDrop(event, document.id)}
                className={cx(
                  "document-tab group flex max-w-[220px] shrink-0 cursor-grab items-center rounded-md border text-xs transition active:cursor-grabbing",
                  document.id === activeDocumentId
                    ? "border-[var(--line-strong)] bg-[var(--panel-muted)] text-[var(--text)]"
                    : "border-transparent text-[var(--muted)] hover:border-[var(--line)] hover:bg-[var(--panel-muted)] hover:text-[var(--text)]",
                  document.id === draggedDocumentId && "opacity-50",
                  document.id === dropTargetDocumentId &&
                    document.id !== draggedDocumentId &&
                    "border-[var(--accent)] bg-[var(--accent-soft)]"
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveDocumentId(document.id);
                    setRenamePopoverOpen(false);
                  }}
                  className="min-w-0 flex-1 truncate px-2.5 py-1.5 text-left"
                  title={getDocumentLabel(document, index)}
                  aria-current={
                    document.id === activeDocumentId ? "page" : undefined
                  }
                >
                  {getDocumentLabel(document, index)}
                </button>
                <button
                  type="button"
                  onClick={() => removeDocument(document.id)}
                  draggable={false}
                  className="rounded px-1.5 py-1.5 text-[var(--muted-soft)] opacity-80 transition hover:bg-[var(--panel-sunken)] hover:text-[var(--text)] sm:opacity-0 sm:group-hover:opacity-100"
                  aria-label={`Close ${getDocumentLabel(document, index)}`}
                  title="Close document"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div ref={renamePopoverRef} className="relative shrink-0">
            <button
              type="button"
              onClick={openRenamePopover}
              className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-[var(--line-strong)] bg-transparent px-2.5 text-xs font-bold text-[var(--muted)] transition hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
              aria-expanded={renamePopoverOpen}
              aria-haspopup="dialog"
            >
              <Pencil aria-hidden size={13} />
              Rename
            </button>
            {renamePopoverOpen ? (
              <form
                onSubmit={renameActiveDocument}
                className="absolute right-0 top-10 z-20 w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] p-3 text-xs shadow-lg"
                role="dialog"
                aria-label="Rename active markdown document"
              >
                <label className="block font-bold uppercase tracking-[0.08em] text-[var(--muted-soft)]">
                  Document name
                </label>
                <input
                  value={renameValue}
                  onChange={(event) => setRenameValue(event.target.value)}
                  className="mt-2 w-full rounded-md border border-[var(--line-strong)] bg-[var(--panel-muted)] px-2.5 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                  autoFocus
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRenamePopoverOpen(false)}
                    className="rounded-md border border-[var(--line)] px-2.5 py-1.5 font-bold text-[var(--muted)] transition hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1.5 font-bold text-[var(--text)] transition hover:bg-[var(--panel-sunken)]"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : null}
          </div>
        </div>

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
                      onClick={(event) => handleTocClick(event, heading.id)}
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
              ref={sourcePaneRef}
              className="flex min-h-0 min-w-0 flex-col"
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
                className="min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent p-5 font-mono text-[0.82rem] leading-7 text-[var(--text)] outline-none placeholder:text-[var(--muted-soft)]"
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
                ref={previewScrollRef}
                className={cx(
                  "markdown-body flex-1 overflow-y-auto p-6",
                  viewMode === "read" && "w-full sm:p-10"
                )}
              >
                {markdownDocument.content.trim() ? (
                  <MarkdownRenderer
                    content={markdownDocument.content}
                    onLinkClick={openLinkedDocument}
                  />
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
          <span>{documents.length.toLocaleString()} docs open</span>
          <span className="min-w-0 truncate">{filename ?? "Local draft"}</span>
        </footer>

        {toast ? (
          <div className="pointer-events-none fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-md border border-[var(--line-strong)] bg-[var(--panel)] px-4 py-2 text-sm font-bold text-[var(--text)] shadow-sm">
            {toast}
          </div>
        ) : null}
      </section>

      {isDraggingFiles ? (
        <div className="pointer-events-none fixed inset-0 z-40 grid place-items-center border-[6px] border-dashed border-[var(--accent)] bg-[var(--bg)]/70 p-6 backdrop-blur-[2px]">
          <div className="rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] px-5 py-4 text-center shadow-sm">
            <Upload
              aria-hidden
              className="mx-auto mb-2 text-[var(--muted)]"
              size={24}
            />
            <p className="text-sm font-bold text-[var(--text)]">
              Drop markdown files to add them
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              .md, .markdown, .mdx, and .txt files are accepted.
            </p>
          </div>
        </div>
      ) : null}
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

function createDocument(
  source: string,
  filename?: string,
  stableId?: string,
  updatedAt = Date.now()
): SessionDocument {
  return {
    id:
      stableId ?? `doc-${updatedAt}-${Math.random().toString(36).slice(2, 9)}`,
    source,
    filename,
    updatedAt,
  };
}

function getActiveDocument(
  documents: SessionDocument[],
  activeDocumentId: string
): SessionDocument {
  return (
    documents.find((document) => document.id === activeDocumentId) ??
    documents[0] ??
    createDocument("", "Untitled 1.md", "fallback")
  );
}

function getDocumentLabel(document: SessionDocument, index: number): string {
  if (document.filename?.trim()) {
    return document.filename.trim();
  }

  return `Draft ${index + 1}`;
}

function getNextUntitledFilename(documents: SessionDocument[]): string {
  const usedNumbers = new Set<number>();

  for (const document of documents) {
    const match = /^Untitled(?:\s+(\d+))?\.md$/i.exec(
      document.filename?.trim() ?? ""
    );

    if (match) {
      usedNumbers.add(match[1] ? Number(match[1]) : 1);
    }
  }

  let nextNumber = 1;

  while (usedNumbers.has(nextNumber)) {
    nextNumber += 1;
  }

  return `Untitled ${nextNumber}.md`;
}

function normalizeDocumentFilename(value: string): string {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return "";
  }

  return isAcceptedMarkdownPath(trimmedValue)
    ? trimmedValue
    : `${trimmedValue}.md`;
}

function reorderDocuments(
  documents: SessionDocument[],
  sourceDocumentId: string,
  targetDocumentId: string
): SessionDocument[] {
  const sourceIndex = documents.findIndex(
    (document) => document.id === sourceDocumentId
  );
  const targetIndex = documents.findIndex(
    (document) => document.id === targetDocumentId
  );

  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
    return documents;
  }

  const nextDocuments = [...documents];
  const [movedDocument] = nextDocuments.splice(sourceIndex, 1);

  nextDocuments.splice(targetIndex, 0, movedDocument);

  return nextDocuments;
}

function isDocumentTabDrag(event: ReactDragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes(DOCUMENT_DRAG_TYPE);
}

function documentMatchesFilename(
  document: SessionDocument,
  linkedFilename: string
): boolean {
  if (!document.filename) {
    return false;
  }

  return (
    normalizeFilename(document.filename) === normalizeFilename(linkedFilename)
  );
}

function getLinkedMarkdownFilename(href: string): string | null {
  if (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    /^[a-z][a-z\d+.-]*:/i.test(href) ||
    href.startsWith("//")
  ) {
    return null;
  }

  const withoutHash = href.split("#", 1)[0];
  const withoutQuery = withoutHash.split("?", 1)[0];
  const normalizedPath = withoutQuery.replace(/\\/g, "/");
  const filename = normalizedPath.split("/").filter(Boolean).at(-1);

  if (!filename || !isAcceptedMarkdownPath(filename)) {
    return null;
  }

  return decodePathSegment(filename);
}

function getLinkHash(href: string): string | null {
  const hash = href.split("#")[1];

  if (!hash) {
    return null;
  }

  return decodePathSegment(hash);
}

function normalizeFilename(value: string): string {
  return decodePathSegment(value.split("/").filter(Boolean).at(-1) ?? value)
    .trim()
    .toLowerCase();
}

function decodePathSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isAcceptedMarkdownPath(path: string): boolean {
  const normalizedPath = path.toLowerCase();

  return ACCEPTED_EXTENSIONS.some((extension) =>
    normalizedPath.endsWith(extension)
  );
}

function parseStoredDocuments(value: string | null): SessionDocument[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item): SessionDocument | null => {
        if (!isStoredDocument(item)) {
          return null;
        }

        return {
          id: item.id,
          source: item.source,
          filename: item.filename,
          updatedAt: item.updatedAt,
        };
      })
      .filter((document): document is SessionDocument => document !== null);
  } catch {
    return [];
  }
}

function isStoredDocument(value: unknown): value is SessionDocument {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<SessionDocument>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.source === "string" &&
    (candidate.filename === undefined ||
      typeof candidate.filename === "string") &&
    typeof candidate.updatedAt === "number" &&
    Number.isFinite(candidate.updatedAt)
  );
}

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();

  return ACCEPTED_EXTENSIONS.some((extension) => name.endsWith(extension));
}

function hasDraggedFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && THEME_VALUES.includes(value as ThemeMode);
}

function isViewMode(value: unknown): value is ViewMode {
  return value === "split" || value === "edit" || value === "read";
}

function normalizeWheelDelta(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return event.deltaY * 16;
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return event.deltaY * window.innerHeight;
  }

  return event.deltaY;
}

function isEditableWheelTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(
    target.closest("textarea, input, select, [contenteditable='true']")
  );
}

function isInsideElement(
  target: EventTarget | null,
  element: Element | null
): boolean {
  return Boolean(element && target instanceof Node && element.contains(target));
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
