"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlignLeft,
  Copy,
  Download,
  FilePlus,
  FileText,
  List,
  Maximize2,
  Minimize2,
  Monitor,
  Moon,
  MoreHorizontal,
  Pencil,
  Printer,
  RefreshCcw,
  Search,
  Sun,
  Target,
  Trash2,
  Type,
  Upload,
  WrapText,
} from "lucide-react";
import { useTheme } from "next-themes";
import type {
  ChangeEvent,
  DragEvent as ReactDragEvent,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent,
  PointerEvent,
  SyntheticEvent,
} from "react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import MDLensIcon from "@/components/mdlens-icon";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useScreenSize } from "@/hooks/use-screen-size";
import { toCodeFenceLanguage } from "@/lib/code-language";
import { getDocumentStats, parseMarkdownDocument } from "@/lib/markdown";
import { SAMPLE_MARKDOWN } from "@/lib/sample-markdown";
import { ACTIVE_DOCUMENT_TITLE_COOKIE, SITE_NAME } from "@/lib/site";
import type { ThemeMode } from "@/types/markdown";

type ViewMode = "split" | "edit" | "read";

type SessionDocument = {
  id: string;
  source: string;
  filename?: string;
  updatedAt: number;
};

type FindMatch = {
  start: number;
  end: number;
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
  maxWidth: "markdown-reader:max-width",
  wordWrap: "markdown-reader:word-wrap",
  fontSize: "markdown-reader:font-size",
  wordGoal: "markdown-reader:word-goal",
  zenMode: "markdown-reader:zen-mode",
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
const FONT_SIZE_MIN = 11;
const FONT_SIZE_MAX = 22;
const FONT_SIZE_DEFAULT = 15;
const FIND_DEBOUNCE_MS = 180;

export function MarkdownStudio() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const sourcePaneRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewScrollRef = useRef<HTMLElement>(null);
  const dragDepthRef = useRef(0);
  const loadFilesRef = useRef<(files: File[]) => Promise<void>>(async () => {});
  const savedAtRef = useRef<number>(0);
  const { setTheme, theme } = useTheme();

  const [documents, setDocuments] = useState<SessionDocument[]>(() => [
    createDocument(SAMPLE_MARKDOWN, "Sample.md", "sample", 0),
  ]);
  const [activeDocumentId, setActiveDocumentId] = useState("sample");
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [splitPercent, setSplitPercent] = useState(50);
  const [tocOpen, setTocOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null);
  const [dropTargetDocumentId, setDropTargetDocumentId] = useState<string | null>(null);
  const [renamePopoverOpen, setRenamePopoverOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [maxWidth, setMaxWidth] = useState(1180);
  const [wordWrap, setWordWrap] = useState(true);
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
  const [wordGoal, setWordGoal] = useState(0);
  const [zenMode, setZenMode] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findInput, setFindInput] = useState("");
  const [findQuery, setFindQuery] = useState("");
  const [findMatches, setFindMatches] = useState<FindMatch[]>([]);
  const [findSearching, setFindSearching] = useState(false);
  const [findCaseSensitive, setFindCaseSensitive] = useState(false);
  const [replaceQuery, setReplaceQuery] = useState("");
  const [activeFindIndex, setActiveFindIndex] = useState(0);
  const [savedStatus, setSavedStatus] = useState<"saved" | "unsaved">("saved");

  const activeDocument = getActiveDocument(documents, activeDocumentId);
  const source = activeDocument.source;
  const filename = activeDocument.filename;
  const updatedAt = activeDocument.updatedAt;
  const deferredSource = useDeferredValue(source);
  const markdownDocument = parseMarkdownDocument(deferredSource, filename, updatedAt);
  const stats = getDocumentStats(markdownDocument.content, markdownDocument.headings);
  const lineCount = source ? source.split("\n").length : 0;
  const selectedTheme = isThemeMode(theme) ? theme : "system";
  const themeIcon = selectedTheme === "light" ? Sun : selectedTheme === "dark" ? Moon : Monitor;
  const showEditor = viewMode === "split" || viewMode === "edit";
  const showPreview = viewMode === "split" || viewMode === "read";
  const previewPending = source !== deferredSource;
  const findPending = findOpen && (findSearching || findInput !== findQuery);
  const findMatchCount = findMatches.length;
  const activeFindPosition = findMatchCount ? Math.min(activeFindIndex + 1, findMatchCount) : 0;

  const { breakpoint } = useScreenSize();
  const isSmallScreen = useMemo(() => breakpoint && ["xs", "sm", "md", "lg"].includes(breakpoint), [breakpoint]);

  const sheetAction = useCallback(
    (fn: () => void) => () => {
      fn();
      setMobileSheetOpen(false);
    },
    []
  );
  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const openFilePickerFromSheet = useCallback(() => {
    fileInputRef.current?.click();
    setMobileSheetOpen(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const timeout = window.setTimeout(() => {
      setSavedStatus("saved");
      savedAtRef.current = Date.now();
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [source, mounted]);

  useEffect(() => {
    if (!zenMode) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setZenMode(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [zenMode]);

  useEffect(() => {
    if (!findOpen) {
      setFindSearching(false);
      return;
    }
    if (!findInput.trim()) {
      setFindQuery("");
      setFindMatches([]);
      setFindSearching(false);
      return;
    }
    setFindSearching(true);
    const timeout = window.setTimeout(() => {
      setFindQuery(findInput);
      setFindMatches(getFindMatches(findInput, source, findCaseSensitive));
      setFindSearching(false);
    }, FIND_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [findCaseSensitive, findInput, findOpen, source]);

  useEffect(() => {
    setActiveFindIndex(0);
  }, [activeDocumentId, findQuery]);

  useEffect(() => {
    if (!findMatchCount) {
      setActiveFindIndex(0);
      return;
    }
    setActiveFindIndex(index => Math.min(index, findMatchCount - 1));
  }, [findMatchCount]);

  useEffect(() => {
    if (!findOpen || !showEditor || !findMatchCount) return;
    const textarea = textareaRef.current;
    const match = findMatches[activeFindIndex] ?? findMatches[0];
    if (!textarea || !match) return;

    const animationFrame = window.requestAnimationFrame(() => {
      textarea.setSelectionRange(match.start, match.end);
      scrollTextareaSelectionIntoView(textarea, match.start);
      if (!isFindBarTarget(document.activeElement)) {
        textarea.focus({ preventScroll: true });
      }
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [activeFindIndex, findMatchCount, findMatches, findOpen, showEditor]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setFindOpen(o => !o);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const storedDocuments = parseStoredDocuments(window.localStorage.getItem(STORAGE_KEYS.documents));
    const storedActiveDocumentId = window.localStorage.getItem(STORAGE_KEYS.activeDocumentId);
    const storedSource = window.localStorage.getItem(STORAGE_KEYS.source);
    const storedFilename = window.localStorage.getItem(STORAGE_KEYS.filename);
    const storedUpdatedAt = Number(window.localStorage.getItem(STORAGE_KEYS.updatedAt));
    const storedViewMode = window.localStorage.getItem(STORAGE_KEYS.viewMode);
    const storedTheme = window.localStorage.getItem(STORAGE_KEYS.themeMode);
    const storedSplitPercent = Number(window.localStorage.getItem(STORAGE_KEYS.splitPercent));
    const storedTocOpen = window.localStorage.getItem(STORAGE_KEYS.tocOpen);
    const storedMaxWidth = Number(window.localStorage.getItem(STORAGE_KEYS.maxWidth));
    const storedWordWrap = window.localStorage.getItem(STORAGE_KEYS.wordWrap);
    const storedFontSize = Number(window.localStorage.getItem(STORAGE_KEYS.fontSize));
    const storedWordGoal = Number(window.localStorage.getItem(STORAGE_KEYS.wordGoal));
    const storedZenMode = window.localStorage.getItem(STORAGE_KEYS.zenMode);

    if (storedDocuments.length) {
      setDocuments(storedDocuments);
      setActiveDocumentId(
        storedActiveDocumentId && storedDocuments.some(d => d.id === storedActiveDocumentId)
          ? storedActiveDocumentId
          : storedDocuments[0].id
      );
    } else if (storedSource !== null) {
      const migratedDocument = createDocument(
        storedSource,
        storedFilename || undefined,
        "local-draft",
        Number.isFinite(storedUpdatedAt) && storedUpdatedAt > 0 ? storedUpdatedAt : Date.now()
      );
      setDocuments([migratedDocument]);
      setActiveDocumentId(migratedDocument.id);
    } else {
      setDocuments([createDocument(SAMPLE_MARKDOWN, "Sample.md", "sample", 0)]);
      setActiveDocumentId("sample");
    }

    if (isViewMode(storedViewMode)) setViewMode(storedViewMode);
    if (isThemeMode(storedTheme)) setTheme(storedTheme);
    if (Number.isFinite(storedSplitPercent)) setSplitPercent(clampSplitPercent(storedSplitPercent));
    if (storedTocOpen === "true") setTocOpen(true);
    if (Number.isFinite(storedMaxWidth) && storedMaxWidth > 0) setMaxWidth(storedMaxWidth);
    if (storedWordWrap !== null) setWordWrap(storedWordWrap !== "false");
    if (Number.isFinite(storedFontSize) && storedFontSize >= FONT_SIZE_MIN) setFontSize(storedFontSize);
    if (Number.isFinite(storedWordGoal) && storedWordGoal > 0) setWordGoal(storedWordGoal);
    if (storedZenMode === "true") setZenMode(true);

    setMounted(true);
  }, [setTheme]);

  useEffect(() => {
    if (!mounted) return;
    window.localStorage.setItem(STORAGE_KEYS.documents, JSON.stringify(documents));
    window.localStorage.setItem(STORAGE_KEYS.activeDocumentId, activeDocumentId);
    window.localStorage.setItem(STORAGE_KEYS.source, source);
    window.localStorage.setItem(STORAGE_KEYS.updatedAt, String(updatedAt));
    if (filename) {
      window.localStorage.setItem(STORAGE_KEYS.filename, filename);
    } else {
      window.localStorage.removeItem(STORAGE_KEYS.filename);
    }
  }, [activeDocumentId, documents, filename, mounted, source, updatedAt]);

  useEffect(() => {
    if (!mounted) return;
    const trimmedName = filename?.trim();
    const pageTitle = getDocumentPageTitle(trimmedName);
    syncActiveDocumentTitleCookie(trimmedName);
    document.title = pageTitle;

    const animationFrame = window.requestAnimationFrame(() => {
      document.title = pageTitle;
    });
    const timeout = window.setTimeout(() => {
      document.title = pageTitle;
    }, 100);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeout);
    };
  }, [filename, mounted]);

  useEffect(() => {
    if (mounted) window.localStorage.setItem(STORAGE_KEYS.viewMode, viewMode);
  }, [mounted, viewMode]);
  useEffect(() => {
    if (mounted) window.localStorage.setItem(STORAGE_KEYS.splitPercent, splitPercent.toFixed(2));
  }, [mounted, splitPercent]);
  useEffect(() => {
    if (mounted) window.localStorage.setItem(STORAGE_KEYS.tocOpen, String(tocOpen));
  }, [mounted, tocOpen]);
  useEffect(() => {
    if (mounted) window.localStorage.setItem(STORAGE_KEYS.maxWidth, String(maxWidth));
  }, [mounted, maxWidth]);
  useEffect(() => {
    if (mounted) window.localStorage.setItem(STORAGE_KEYS.wordWrap, String(wordWrap));
  }, [mounted, wordWrap]);
  useEffect(() => {
    if (mounted) window.localStorage.setItem(STORAGE_KEYS.fontSize, String(fontSize));
  }, [mounted, fontSize]);
  useEffect(() => {
    if (mounted) window.localStorage.setItem(STORAGE_KEYS.wordGoal, String(wordGoal));
  }, [mounted, wordGoal]);
  useEffect(() => {
    if (mounted) window.localStorage.setItem(STORAGE_KEYS.zenMode, String(zenMode));
  }, [mounted, zenMode]);

  useEffect(() => {
    previewScrollRef.current?.scrollTo({ top: 0 });
  }, [activeDocumentId]);

  useEffect(() => {
    if (!showPreview) return;
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
      )
        return;
      event.preventDefault();
      previewScroll.scrollBy({
        top: normalizeWheelDelta(event),
        behavior: "auto",
      });
    }
    window.addEventListener("wheel", handleWindowWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWindowWheel);
  }, [showPreview]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function updateSource(nextSource: string) {
    const nextUpdatedAt = Date.now();
    setSavedStatus("unsaved");
    setDocuments(currentDocuments =>
      currentDocuments.map(document =>
        document.id === activeDocumentId ? { ...document, source: nextSource, updatedAt: nextUpdatedAt } : document
      )
    );
  }

  function handleTextChange(event: ChangeEvent<HTMLTextAreaElement>) {
    updateSource(event.target.value);
  }

  function applyCodeFenceLanguage(fenceStartOffset: number, language: string) {
    const nextSource = addLanguageToFence(source, fenceStartOffset, language);

    if (nextSource === source) {
      setToast("Could not update that code fence");
      return;
    }

    updateSource(nextSource);
    setToast(`Set code language to ${toCodeFenceLanguage(language)}`);
  }

  async function loadFiles(files: File[]) {
    const acceptedFiles = files.filter(isAcceptedFile);
    const rejectedCount = files.length - acceptedFiles.length;
    if (!acceptedFiles.length) {
      setToast("Use a .md, .markdown, .mdx, or .txt file.");
      return;
    }
    const loadedDocuments = await Promise.all(
      acceptedFiles.map(async file => createDocument(await file.text(), file.name))
    );
    setDocuments(currentDocuments => [...currentDocuments, ...loadedDocuments]);
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
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current += 1;
      setIsDraggingFiles(true);
    }
    function handleWindowDragOver(event: DragEvent) {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    }
    function handleWindowDragLeave(event: DragEvent) {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDraggingFiles(false);
    }
    function handleWindowDrop(event: DragEvent) {
      if (!hasDraggedFiles(event)) return;
      event.preventDefault();
      dragDepthRef.current = 0;
      setIsDraggingFiles(false);
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (files.length) void loadFilesRef.current(files);
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
    if (files.length) void loadFiles(files);
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
    setDocuments(currentDocuments => [...currentDocuments, sampleDocument]);
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
    setDocuments(currentDocuments =>
      currentDocuments.map(document =>
        document.id === activeDocumentId ? { ...document, filename: nextFilename, updatedAt: Date.now() } : document
      )
    );
    setRenamePopoverOpen(false);
    setToast("Renamed document");
  }

  function createBlankDocument() {
    const document = createDocument("", getNextUntitledFilename(documents));
    setDocuments(currentDocuments => [...currentDocuments, document]);
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
    const nextDocuments = documents.filter(document => document.id !== documentId);
    setDocuments(nextDocuments);
    if (documentId === activeDocumentId) setActiveDocumentId(nextDocuments[0].id);
    setToast("Removed document");
  }

  function handleDocumentDragStart(event: ReactDragEvent<HTMLDivElement>, documentId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(DOCUMENT_DRAG_TYPE, documentId);
    setDraggedDocumentId(documentId);
    setDropTargetDocumentId(documentId);
  }

  function handleDocumentDragOver(event: ReactDragEvent<HTMLDivElement>, targetDocumentId: string) {
    if (!isDocumentTabDrag(event) || !draggedDocumentId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (targetDocumentId !== dropTargetDocumentId) setDropTargetDocumentId(targetDocumentId);
  }

  function handleDocumentDrop(event: ReactDragEvent<HTMLDivElement>, targetDocumentId: string) {
    if (!isDocumentTabDrag(event)) return;
    event.preventDefault();
    const sourceDocumentId = event.dataTransfer.getData(DOCUMENT_DRAG_TYPE) || draggedDocumentId;
    if (!sourceDocumentId || sourceDocumentId === targetDocumentId) {
      clearDocumentDragState();
      return;
    }
    setDocuments(currentDocuments => reorderDocuments(currentDocuments, sourceDocumentId, targetDocumentId));
    clearDocumentDragState();
  }

  function clearDocumentDragState() {
    setDraggedDocumentId(null);
    setDropTargetDocumentId(null);
  }

  function openLinkedDocument(href: string): boolean {
    const hash = getLinkHash(href);
    const linkedFilename = getLinkedMarkdownFilename(href);
    if (!linkedFilename && hash) return scrollPreviewToHeading(hash);
    if (!linkedFilename) return false;
    const linkedDocument = documents.find(document => documentMatchesFilename(document, linkedFilename));
    if (!linkedDocument) {
      setToast(`Open ${linkedFilename} first`);
      return true;
    }
    setActiveDocumentId(linkedDocument.id);
    setRenamePopoverOpen(false);
    if (hash) window.setTimeout(() => scrollPreviewToHeading(hash), 80);
    setToast(`Opened ${linkedDocument.filename ?? linkedFilename}`);
    return true;
  }

  function handleTocClick(event: MouseEvent<HTMLAnchorElement>, headingId: string) {
    if (scrollPreviewToHeading(headingId)) event.preventDefault();
  }

  function scrollPreviewToHeading(headingId: string): boolean {
    const scrollContainer = previewScrollRef.current;
    const target = scrollContainer?.querySelector<HTMLElement>(`#${CSS.escape(headingId)}`);
    if (!scrollContainer || !target) return false;
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

  function printDocument() {
    window.print();
  }

  function cycleTheme() {
    const currentIndex = THEME_VALUES.indexOf(selectedTheme);
    const nextTheme = THEME_VALUES[(currentIndex + 1) % THEME_VALUES.length];
    setTheme(nextTheme);
  }

  function closeFind() {
    setFindOpen(false);
    setFindInput("");
    setFindQuery("");
    setFindMatches([]);
    setFindSearching(false);
    setActiveFindIndex(0);
  }

  function moveFindSelection(direction: 1 | -1) {
    if (findPending || !findMatchCount) return;
    setActiveFindIndex(index => (index + direction + findMatchCount) % findMatchCount);
  }

  function handleFindKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      closeFind();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      moveFindSelection(event.shiftKey ? -1 : 1);
    }
  }

  function applyReplace() {
    if (findPending || !findQuery.trim()) return;
    try {
      const flags = findCaseSensitive ? "g" : "gi";
      const regex = new RegExp(escapeRegex(findQuery), flags);
      const nextSource = source.replace(regex, replaceQuery);
      updateSource(nextSource);
      setFindQuery("");
      setFindMatches([]);
      setFindSearching(true);
      setActiveFindIndex(0);
      setToast("Replaced all matches");
    } catch {
      setToast("Replace failed");
    }
  }

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    if (viewMode !== "split" || !splitContainerRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
    updateSplitFromPointer(event.clientX);
  }

  function handleResize(event: PointerEvent<HTMLButtonElement>) {
    if (!isResizing) return;
    updateSplitFromPointer(event.clientX);
  }

  function stopResize(event: PointerEvent<HTMLButtonElement>) {
    if (!isResizing) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsResizing(false);
  }

  function updateSplitFromPointer(clientX: number) {
    const container = splitContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const nextPercent = ((clientX - rect.left) / rect.width) * 100;
    setSplitPercent(clampSplitPercent(nextPercent));
  }

  const wordGoalPercent = wordGoal > 0 ? Math.min((stats.words / wordGoal) * 100, 100) : 0;
  const wordGoalDone = wordGoal > 0 && stats.words >= wordGoal;

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          .print-content { display: block !important; }
          .markdown-body { padding: 2rem !important; }
        }
        .print-content { display: none; }
      `}</style>

      <div className="print-content">
        <div className="markdown-body" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
          <MarkdownRenderer content={source} />
        </div>
      </div>

      <main
        className={cx("h-screen overflow-hidden bg-[var(--bg)] p-3 text-[var(--text)] sm:p-6", zenMode && "zen-mode")}
      >
        <section
          className="mx-auto flex h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)] shadow-sm sm:h-[calc(100vh-3rem)]"
          style={{ maxWidth: maxWidth >= 99999 ? "100%" : `${maxWidth}px` }}
        >
          {!zenMode && (
            <header className="flex items-center gap-1 border-b border-[var(--line)] bg-[var(--panel-muted)] px-3 py-2">
              <h1 className="mr-1 inline-flex items-center gap-2 text-[0.8rem] font-bold tracking-[0.08em] text-[var(--muted)] uppercase">
                <MDLensIcon
                  aria-hidden
                  className="mdlens-icon size-5 rounded-[0.35rem]"
                  focusable="false"
                  showSubtitle={false}
                  size={20}
                />
                <span className="xs:inline hidden">
                  <span className="mdlens-wordmark-primary">MD</span>
                  <span className="mdlens-wordmark-accent">Lens</span>
                </span>
              </h1>

              <div className="mx-2 h-5 w-px bg-[var(--line)]" />

              <Tabs value={viewMode} onValueChange={value => setViewMode(value as ViewMode)}>
                <TabsList className="h-auto rounded-lg bg-[var(--panel-sunken)] p-0.5 text-[var(--muted)]">
                  {VIEW_MODES.map(mode => (
                    <TabsTrigger
                      key={mode.value}
                      value={mode.value}
                      className="rounded-md border border-transparent px-2.5 py-1 text-xs font-bold data-active:border-[var(--line-strong)] data-active:bg-[var(--panel)] data-active:text-[var(--text)] data-active:shadow-none sm:px-3"
                    >
                      {mode.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="mx-2 hidden h-5 w-px bg-[var(--line)] sm:block" />

              <div className="hidden items-center gap-0.5 sm:flex">
                <input
                  ref={fileInputRef}
                  className="sr-only"
                  type="file"
                  accept={ACCEPTED_UPLOADS}
                  multiple
                  onChange={handleFileChange}
                />
                <IconButton icon={Upload} label="Upload file" onClick={openFilePicker} />
                <IconButton icon={FilePlus} label="New document" onClick={createBlankDocument} />
                <IconButton icon={Download} label="Download .md" onClick={downloadMarkdown} />
                <IconButton icon={Copy} label="Copy markdown" onClick={copyMarkdown} />
                <IconButton icon={Printer} label="Print" onClick={printDocument} />
              </div>

              <div className="mx-2 hidden h-5 w-px bg-[var(--line)] sm:block" />

              <div className="hidden items-center gap-0.5 sm:flex">
                <IconButton
                  icon={Search}
                  label="Find & replace (⌘F)"
                  onClick={() => setFindOpen(o => !o)}
                  active={findOpen}
                />
                <IconButton
                  icon={WrapText}
                  label={wordWrap ? "Word wrap on" : "Word wrap off"}
                  onClick={() => setWordWrap(w => !w)}
                  active={wordWrap}
                />
                <FontSizePopover fontSize={fontSize} onChange={setFontSize} />
                <WidthPopover maxWidth={maxWidth} onChange={setMaxWidth} />
                <WordGoalPopover wordGoal={wordGoal} onChange={setWordGoal} />
              </div>

              <div className="flex-1" />

              <div className="hidden items-center gap-0.5 sm:flex">
                <IconButton icon={RefreshCcw} label="Load sample" onClick={loadSample} />
                <IconButton icon={Trash2} label="Clear document" onClick={clearDocument} variant="danger" />
                <div className="mx-2 h-5 w-px bg-[var(--line)]" />
                <IconButton
                  icon={zenMode ? Minimize2 : Maximize2}
                  label="Zen mode"
                  onClick={() => setZenMode(z => !z)}
                  active={zenMode}
                />
                <IconButton icon={themeIcon} label={`Theme: ${capitalize(selectedTheme)}`} onClick={cycleTheme} />
              </div>

              <div className="flex items-center gap-0.5 sm:hidden">
                <input
                  ref={fileInputRef}
                  className="sr-only"
                  type="file"
                  accept={ACCEPTED_UPLOADS}
                  multiple
                  onChange={handleFileChange}
                />

                <IconButton
                  icon={Search}
                  label="Find & replace"
                  onClick={() => setFindOpen(o => !o)}
                  active={findOpen}
                />
                <IconButton icon={themeIcon} label={`Theme: ${capitalize(selectedTheme)}`} onClick={cycleTheme} />

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileSheetOpen(true)}
                  aria-label="More actions"
                  className="h-8 w-8 rounded-md bg-transparent text-[var(--muted)] shadow-none transition hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
                >
                  <MoreHorizontal aria-hidden size={15} />
                </Button>
              </div>

              <MobileToolbarSheet open={mobileSheetOpen} onClose={() => setMobileSheetOpen(false)}>
                <div className="flex items-center gap-1 border-b border-[var(--line)] px-4 pt-1 pb-3">
                  <span className="mr-auto text-xs font-bold tracking-widest text-[var(--muted-soft)] uppercase">
                    Editor
                  </span>
                  <IconButton
                    icon={WrapText}
                    label={wordWrap ? "Word wrap on" : "Word wrap off"}
                    onClick={() => setWordWrap(w => !w)}
                    active={wordWrap}
                  />
                  <FontSizePopover fontSize={fontSize} onChange={setFontSize} />
                  <WidthPopover maxWidth={maxWidth} onChange={setMaxWidth} />
                  <WordGoalPopover wordGoal={wordGoal} onChange={setWordGoal} />
                  <IconButton
                    icon={zenMode ? Minimize2 : Maximize2}
                    label="Zen mode"
                    onClick={sheetAction(() => setZenMode(z => !z))}
                    active={zenMode}
                  />
                </div>

                <div className="py-1">
                  <MobileSheetRow icon={Upload} label="Upload file" onClick={openFilePickerFromSheet} />
                  <MobileSheetRow icon={FilePlus} label="New document" onClick={sheetAction(createBlankDocument)} />
                  <MobileSheetRow icon={Download} label="Download .md" onClick={sheetAction(downloadMarkdown)} />
                  <MobileSheetRow icon={Copy} label="Copy markdown" onClick={sheetAction(copyMarkdown)} />
                  <MobileSheetRow icon={Printer} label="Print" onClick={sheetAction(printDocument)} />
                  <MobileSheetRow icon={RefreshCcw} label="Load sample" onClick={sheetAction(loadSample)} />
                </div>

                <div className="border-t border-[var(--line)] py-1">
                  <MobileSheetRow
                    icon={Trash2}
                    label="Clear document"
                    onClick={sheetAction(clearDocument)}
                    variant="danger"
                  />
                </div>

                <div className="h-6" />
              </MobileToolbarSheet>
            </header>
          )}

          {zenMode && (
            <div className="flex items-center justify-end gap-1 border-b border-[var(--line)] bg-[var(--panel-muted)] px-4 py-1.5">
              <IconButton icon={themeIcon} label={`Theme: ${capitalize(selectedTheme)}`} onClick={cycleTheme} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setZenMode(false)}
                className="h-auto gap-1.5 bg-transparent px-2 py-1 text-xs font-bold text-[var(--muted)] shadow-none transition hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
              >
                <Minimize2 aria-hidden size={12} />
                Exit Zen
              </Button>
            </div>
          )}

          <div className="document-strip flex items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-2">
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto" aria-label="Open markdown documents">
              {documents.map((document, index) => (
                <div
                  key={document.id}
                  draggable
                  onDragEnd={clearDocumentDragState}
                  onDragOver={event => handleDocumentDragOver(event, document.id)}
                  onDragStart={event => handleDocumentDragStart(event, document.id)}
                  onDrop={event => handleDocumentDrop(event, document.id)}
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
                    aria-current={document.id === activeDocumentId ? "page" : undefined}
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
            <Popover
              open={renamePopoverOpen}
              onOpenChange={open => {
                if (open) {
                  openRenamePopover();
                  return;
                }
                setRenamePopoverOpen(false);
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-8 shrink-0 rounded-md border-[var(--line-strong)] bg-transparent px-2.5 text-xs font-bold text-[var(--muted)] shadow-none hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
                >
                  <Pencil aria-hidden size={13} />
                  Rename
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] p-3 text-xs text-[var(--text)] shadow-lg"
              >
                <form onSubmit={renameActiveDocument} role="dialog" aria-label="Rename active markdown document">
                  <label className="block font-bold tracking-[0.08em] text-[var(--muted-soft)] uppercase">
                    Document name
                  </label>
                  <input
                    value={renameValue}
                    onChange={event => setRenameValue(event.target.value)}
                    className="mt-2 w-full rounded-md border border-[var(--line-strong)] bg-[var(--panel-muted)] px-2.5 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
                    autoFocus
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRenamePopoverOpen(false)}
                      className="rounded-md border-[var(--line)] bg-transparent px-2.5 py-1.5 font-bold text-[var(--muted)] shadow-none hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="rounded-md border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-1.5 font-bold text-[var(--text)] shadow-none hover:bg-[var(--panel-sunken)]"
                    >
                      Save
                    </Button>
                  </div>
                </form>
              </PopoverContent>
            </Popover>
          </div>

          {findOpen && (
            <div
              data-find-bar="true"
              className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2"
            >
              <Search aria-hidden size={13} className="shrink-0 text-[var(--muted-soft)]" />
              <input
                autoFocus
                value={findInput}
                onChange={e => setFindInput(e.target.value)}
                onKeyDown={handleFindKeyDown}
                placeholder="Find…"
                aria-label="Find text"
                className="h-7 min-w-[120px] flex-1 rounded-md border border-[var(--line-strong)] bg-[var(--panel)] px-2.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
              <input
                value={replaceQuery}
                onChange={e => setReplaceQuery(e.target.value)}
                onKeyDown={handleFindKeyDown}
                placeholder="Replace with…"
                aria-label="Replace with"
                className="h-7 min-w-[120px] flex-1 rounded-md border border-[var(--line-strong)] bg-[var(--panel)] px-2.5 text-xs text-[var(--text)] outline-none focus:border-[var(--accent)]"
              />
              <span className="shrink-0 text-xs text-[var(--muted-soft)]">
                {findInput
                  ? findPending
                    ? "Searching..."
                    : findMatchCount
                      ? `${activeFindPosition} / ${findMatchCount}`
                      : "No matches"
                  : ""}
              </span>
              {findPending ? (
                <span
                  aria-hidden
                  className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-[var(--line-strong)] border-t-[var(--accent)]"
                />
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={findCaseSensitive}
                title={findCaseSensitive ? "Case-sensitive find" : "Case-insensitive find"}
                onClick={() => setFindCaseSensitive(value => !value)}
                className={cx(
                  "h-7 shrink-0 rounded-md px-2.5 text-xs font-bold shadow-none transition",
                  findCaseSensitive
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] hover:bg-[var(--panel-sunken)]"
                    : "border-[var(--line)] bg-transparent text-[var(--muted)] hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
                )}
              >
                Aa
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => moveFindSelection(-1)}
                disabled={findPending || !findMatchCount}
                className="h-7 shrink-0 rounded-md border-[var(--line)] bg-transparent px-2.5 text-xs font-bold text-[var(--muted)] shadow-none transition hover:bg-[var(--panel-sunken)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => moveFindSelection(1)}
                disabled={findPending || !findMatchCount}
                className="h-7 shrink-0 rounded-md border-[var(--line)] bg-transparent px-2.5 text-xs font-bold text-[var(--muted)] shadow-none transition hover:bg-[var(--panel-sunken)] hover:text-[var(--text)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyReplace}
                disabled={findPending || !findQuery.trim() || findMatchCount === 0}
                className="h-7 shrink-0 rounded-md border-[var(--accent)] bg-[var(--accent-soft)] px-3 text-xs font-bold text-[var(--text)] shadow-none transition hover:bg-[var(--panel-sunken)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Replace all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeFind}
                className="h-7 shrink-0 rounded-md border-[var(--line)] bg-transparent px-2.5 text-xs font-bold text-[var(--muted)] shadow-none transition hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
              >
                Close
              </Button>
            </div>
          )}

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
                    markdownDocument.headings.map(heading => (
                      <a
                        key={`${heading.id}-${heading.depth}-${heading.text}`}
                        href={`#${heading.id}`}
                        onClick={event => handleTocClick(event, heading.id)}
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
                    ? { flex: "0 0 auto", width: `${splitPercent}%` }
                    : { flex: "1 1 auto", width: "100%" }
                }
              >
                <div className="border-b border-[var(--line)] bg-[var(--panel-muted)] px-4 py-1.5 text-[0.68rem] font-bold tracking-[0.08em] text-[var(--muted-soft)] uppercase">
                  Source
                </div>
                <textarea
                  ref={textareaRef}
                  value={source}
                  onChange={handleTextChange}
                  spellCheck={false}
                  aria-label="Markdown source"
                  placeholder="Start writing Markdown here..."
                  style={{
                    fontSize: `${fontSize}px`,
                    whiteSpace: wordWrap ? "pre-wrap" : "pre",
                    overflowX: wordWrap ? "hidden" : "auto",
                  }}
                  className="min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent p-5 font-mono leading-7 text-[var(--text)] outline-none placeholder:text-[var(--muted-soft)]"
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
                className={cx("split-divider hidden lg:flex", isResizing && "is-dragging")}
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
                    onClick={() => setTocOpen(open => !open)}
                    className="toc-toggle"
                    title="Toggle table of contents"
                    aria-label="Toggle table of contents"
                    aria-expanded={tocOpen}
                  >
                    <List aria-hidden size={14} />
                  </button>
                ) : null}
                <div className="border-b border-[var(--line)] bg-[var(--panel-muted)] px-4 py-1.5 text-[0.68rem] font-bold tracking-[0.08em] text-[var(--muted-soft)] uppercase">
                  {previewPending ? "Previewing..." : "Preview"}
                </div>
                <article
                  ref={previewScrollRef}
                  style={{ fontSize: `${fontSize}px` }}
                  className={cx("markdown-body flex-1 overflow-y-auto p-6", viewMode === "read" && "w-full sm:p-10")}
                >
                  {markdownDocument.content.trim() ? (
                    <MarkdownRenderer
                      content={source}
                      onCodeLanguageSelect={applyCodeFenceLanguage}
                      onLinkClick={openLinkedDocument}
                    />
                  ) : (
                    <div className="grid min-h-[320px] place-items-center text-center text-sm text-[var(--muted)]">
                      <div>
                        <FileText aria-hidden className="mx-auto mb-3 text-[var(--muted-soft)]" size={34} />
                        <p className="font-bold text-[var(--text)]">Nothing to preview yet</p>
                        <p className="mt-1">Write or upload markdown to begin.</p>
                      </div>
                    </div>
                  )}
                </article>
              </section>
            ) : null}
          </div>

          <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--line)] bg-[var(--panel-muted)] px-4 py-1.5 text-[0.7rem] text-[var(--muted-soft)]">
            <span>{stats.words.toLocaleString()} words</span>
            <span>{stats.characters.toLocaleString()} chars</span>
            <span>{lineCount.toLocaleString()} lines</span>
            <span>~{stats.readingMinutes} min read</span>
            <span>{documents.length.toLocaleString()} docs open</span>
            <span className="min-w-0 truncate">{filename ?? "Local draft"}</span>

            <span
              className={cx(
                "ml-auto flex items-center gap-1 transition-opacity duration-300",
                savedStatus === "saved" ? "opacity-60" : "opacity-100"
              )}
            >
              <span
                className={cx(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  savedStatus === "saved" ? "bg-green-500" : "bg-amber-400"
                )}
              />
              {savedStatus === "saved" ? "Saved" : "Unsaved"}
            </span>

            {wordGoal > 0 && (
              <span className={cx("flex items-center gap-1.5", wordGoalDone && "text-green-600")}>
                <span
                  className="relative inline-block h-1.5 w-16 overflow-hidden rounded-full bg-[var(--line)]"
                  title={`${stats.words} / ${wordGoal} words`}
                >
                  <span
                    className={cx(
                      "absolute inset-y-0 left-0 rounded-full transition-all",
                      wordGoalDone ? "bg-green-500" : "bg-[var(--accent)]"
                    )}
                    style={{ width: `${wordGoalPercent}%` }}
                  />
                </span>
                {wordGoalDone ? "Goal reached!" : `${stats.words} / ${wordGoal}`}
              </span>
            )}
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
              <Upload aria-hidden className="mx-auto mb-2 text-[var(--muted)]" size={24} />
              <p className="text-sm font-bold text-[var(--text)]">Drop markdown files to add them</p>
              <p className="mt-1 text-xs text-[var(--muted)]">.md, .markdown, .mdx, and .txt files are accepted.</p>
            </div>
          </div>
        ) : null}
      </main>
    </>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  active,
  variant,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  variant?: "default" | "danger";
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cx(
        "relative h-8 w-8 rounded-md bg-transparent shadow-none transition",
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent)]"
          : variant === "danger"
            ? "text-[var(--muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            : "text-[var(--muted)] hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
      )}
    >
      <Icon aria-hidden size={15} />
    </Button>
  );
}

function MobileToolbarSheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label="More actions"
        className="pb-safe fixed right-0 bottom-0 left-0 z-40 rounded-t-2xl border-t border-[var(--line-strong)] bg-[var(--panel)]"
      >
        <div className="mx-auto mt-2.5 mb-3 h-1 w-10 rounded-full bg-[var(--line-strong)]" />
        {children}
      </div>
    </>
  );
}

function MobileSheetRow({
  icon: Icon,
  label,
  onClick,
  active,
  variant,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  active?: boolean;
  variant?: "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 px-5 py-3 text-sm font-medium transition active:bg-[var(--panel-sunken)]",
        active ? "text-[var(--accent)]" : variant === "danger" ? "text-red-600 dark:text-red-400" : "text-[var(--text)]"
      )}
    >
      <Icon aria-hidden size={18} className="shrink-0 text-[var(--muted)]" />
      {label}
      {active && <span className="ml-auto text-xs font-bold text-[var(--accent)]">On</span>}
    </button>
  );
}

function FontSizePopover({ fontSize, onChange }: { fontSize: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-8 gap-1.5 rounded-md border-[var(--line-strong)] bg-transparent px-2.5 text-xs font-bold whitespace-nowrap text-[var(--muted)] shadow-none hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
        >
          <Type aria-hidden size={13} />
          {fontSize}px
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-52 rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] p-3 text-xs text-[var(--text)] shadow-lg"
        role="dialog"
        aria-label="Font size"
      >
        <p className="mb-2 font-bold tracking-[0.08em] text-[var(--muted-soft)] uppercase">Font size</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onChange(Math.max(FONT_SIZE_MIN, fontSize - 1))}
            className="h-7 w-7 rounded-md border-[var(--line)] bg-transparent text-sm font-bold text-[var(--muted)] shadow-none hover:bg-[var(--panel-sunken)]"
            aria-label="Decrease font size"
          >
            −
          </Button>
          <Slider
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            step={1}
            value={[fontSize]}
            onValueChange={([nextFontSize]) => {
              if (typeof nextFontSize === "number") onChange(nextFontSize);
            }}
            className="flex-1 [&_[data-slot=slider-range]]:bg-[var(--accent)] [&_[data-slot=slider-thumb]]:border-[var(--accent)] [&_[data-slot=slider-thumb]]:bg-[var(--panel)] [&_[data-slot=slider-track]]:bg-[var(--panel-sunken)]"
            aria-label="Font size slider"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onChange(Math.min(FONT_SIZE_MAX, fontSize + 1))}
            className="h-7 w-7 rounded-md border-[var(--line)] bg-transparent text-sm font-bold text-[var(--muted)] shadow-none hover:bg-[var(--panel-sunken)]"
            aria-label="Increase font size"
          >
            +
          </Button>
        </div>
        <div className="mt-2 flex justify-between text-[0.68rem] text-[var(--muted-soft)]">
          <span>{FONT_SIZE_MIN}px</span>
          <span className="font-bold text-[var(--text)]">{fontSize}px</span>
          <span>{FONT_SIZE_MAX}px</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(FONT_SIZE_DEFAULT)}
          className="mt-2 w-full rounded-md border-[var(--line)] bg-transparent py-1 text-[var(--muted)] shadow-none transition hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
        >
          Reset to default ({FONT_SIZE_DEFAULT}px)
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function WidthPopover({ maxWidth, onChange }: { maxWidth: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState(String(maxWidth));

  const PRESETS = [
    { label: "640", value: 640 },
    { label: "800", value: 800 },
    { label: "1180", value: 1180 },
    { label: "Full", value: 99999 },
  ];

  function applyCustom(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    const num = parseInt(customValue.trim());
    if (Number.isFinite(num) && num > 0) {
      onChange(num);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-8 gap-1.5 rounded-md border-[var(--line-strong)] bg-transparent px-2.5 text-xs font-bold whitespace-nowrap text-[var(--muted)] shadow-none hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
        >
          <AlignLeft aria-hidden size={13} />
          Width
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(14rem,calc(100vw-2rem))] rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] p-3 text-xs text-[var(--text)] shadow-lg"
        role="dialog"
        aria-label="Set content max width"
      >
        <p className="mb-2 font-bold tracking-[0.08em] text-[var(--muted-soft)] uppercase">Max content width</p>
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          {PRESETS.map(preset => (
            <Button
              key={preset.value}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onChange(preset.value);
                setCustomValue(preset.value >= 99999 ? "full" : String(preset.value));
                setOpen(false);
              }}
              className={cx(
                "rounded-md border px-2 py-1.5 text-center font-bold shadow-none transition",
                maxWidth === preset.value
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                  : "border-[var(--line)] bg-transparent text-[var(--muted)] hover:border-[var(--line-strong)] hover:bg-transparent hover:text-[var(--text)]"
              )}
            >
              {preset.label}
              {preset.value === 1180 && <span className="ml-1 font-normal opacity-50">default</span>}
            </Button>
          ))}
        </div>
        <form onSubmit={applyCustom} className="flex gap-1.5">
          <input
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            placeholder="e.g. 960"
            className="min-w-0 flex-1 rounded-md border border-[var(--line-strong)] bg-[var(--panel-muted)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="rounded-md border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 font-bold text-[var(--text)] shadow-none transition hover:bg-[var(--panel-sunken)]"
          >
            Set
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}

function WordGoalPopover({ wordGoal, onChange }: { wordGoal: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(wordGoal > 0 ? String(wordGoal) : "");

  function handleSubmit(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    const num = parseInt(inputValue.trim());
    if (!inputValue.trim() || num <= 0) {
      onChange(0);
      setOpen(false);
      return;
    }
    if (Number.isFinite(num) && num > 0) {
      onChange(num);
      setOpen(false);
    }
  }

  const QUICK_GOALS = [100, 250, 500, 1000];

  return (
    <Popover
      open={open}
      onOpenChange={nextOpen => {
        if (nextOpen) setInputValue(wordGoal > 0 ? String(wordGoal) : "");
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cx(
            "min-h-8 gap-1.5 rounded-md border px-2.5 text-xs font-bold whitespace-nowrap shadow-none transition",
            wordGoal > 0
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)] hover:bg-[var(--panel-sunken)]"
              : "border-[var(--line-strong)] bg-transparent text-[var(--muted)] hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
          )}
        >
          <Target aria-hidden size={13} />
          Goal
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-[min(14rem,calc(100vw-2rem))] rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] p-3 text-xs text-[var(--text)] shadow-lg"
        role="dialog"
        aria-label="Set word goal"
      >
        <p className="mb-2 font-bold tracking-[0.08em] text-[var(--muted-soft)] uppercase">Word goal</p>
        <div className="mb-2 grid grid-cols-4 gap-1">
          {QUICK_GOALS.map(g => (
            <Button
              key={g}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onChange(g);
                setInputValue(String(g));
                setOpen(false);
              }}
              className={cx(
                "rounded-md border py-1 text-center font-bold shadow-none transition",
                wordGoal === g
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text)]"
                  : "border-[var(--line)] bg-transparent text-[var(--muted)] hover:border-[var(--line-strong)] hover:bg-transparent hover:text-[var(--text)]"
              )}
            >
              {g}
            </Button>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-1.5">
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Custom…"
            type="number"
            min={1}
            className="min-w-0 flex-1 rounded-md border border-[var(--line-strong)] bg-[var(--panel-muted)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="rounded-md border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 font-bold text-[var(--text)] shadow-none transition hover:bg-[var(--panel-sunken)]"
          >
            Set
          </Button>
        </form>
        {wordGoal > 0 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onChange(0);
              setInputValue("");
              setOpen(false);
            }}
            className="mt-2 w-full rounded-md border-[var(--line)] bg-transparent py-1 text-[var(--muted)] shadow-none transition hover:bg-[var(--panel-sunken)] hover:text-[var(--danger)]"
          >
            Clear goal
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function createDocument(source: string, filename?: string, stableId?: string, updatedAt = Date.now()): SessionDocument {
  return {
    id: stableId ?? `doc-${updatedAt}-${Math.random().toString(36).slice(2, 9)}`,
    source,
    filename,
    updatedAt,
  };
}

function getActiveDocument(documents: SessionDocument[], activeDocumentId: string): SessionDocument {
  return (
    documents.find(document => document.id === activeDocumentId) ??
    documents[0] ??
    createDocument("", "Untitled 1.md", "fallback")
  );
}

function getDocumentLabel(document: SessionDocument, index: number): string {
  if (document.filename?.trim()) return document.filename.trim();
  return `Draft ${index + 1}`;
}

function getNextUntitledFilename(documents: SessionDocument[]): string {
  const usedNumbers = new Set<number>();
  for (const document of documents) {
    const match = /^Untitled(?:\s+(\d+))?\.md$/i.exec(document.filename?.trim() ?? "");
    if (match) usedNumbers.add(match[1] ? Number(match[1]) : 1);
  }
  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) nextNumber += 1;
  return `Untitled ${nextNumber}.md`;
}

function normalizeDocumentFilename(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";
  return isAcceptedMarkdownPath(trimmedValue) ? trimmedValue : `${trimmedValue}.md`;
}

function addLanguageToFence(source: string, fenceStartOffset: number, language: string): string {
  const fenceLanguage = toCodeFenceLanguage(language);
  if (!fenceLanguage || fenceStartOffset < 0 || fenceStartOffset >= source.length) return source;

  const openingLineEnd = source.indexOf("\n", fenceStartOffset);
  const lineEnd = openingLineEnd === -1 ? source.length : openingLineEnd;
  const openingLine = source.slice(fenceStartOffset, lineEnd);
  const match = /^([ \t]*)(`{3,}|~{3,})[ \t]*(.*)$/.exec(openingLine);

  if (!match || match[3].trim()) return source;

  const nextOpeningLine = `${match[1]}${match[2]} ${fenceLanguage}`;
  return `${source.slice(0, fenceStartOffset)}${nextOpeningLine}${source.slice(lineEnd)}`;
}

function getDocumentPageTitle(filename: string | undefined): string {
  return filename ? `${filename} - ${SITE_NAME}` : SITE_NAME;
}

function syncActiveDocumentTitleCookie(filename: string | undefined) {
  const baseCookie = `${ACTIVE_DOCUMENT_TITLE_COOKIE}=`;
  if (!filename) {
    document.cookie = `${baseCookie}; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }

  document.cookie = `${baseCookie}${encodeURIComponent(
    filename.slice(0, 140)
  )}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

function getFindMatches(query: string, source: string, caseSensitive: boolean): FindMatch[] {
  if (!query.trim()) return [];
  try {
    const regex = new RegExp(escapeRegex(query), caseSensitive ? "g" : "gi");
    const matches: FindMatch[] = [];
    for (const match of source.matchAll(regex)) {
      if (typeof match.index !== "number") continue;
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
      });
    }
    return matches;
  } catch {
    return [];
  }
}

function scrollTextareaSelectionIntoView(textarea: HTMLTextAreaElement, selectionStart: number) {
  const lineIndex = textarea.value.slice(0, selectionStart).split("\n").length - 1;
  const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight) || 24;
  textarea.scrollTop = Math.max(0, (lineIndex - 3) * lineHeight);
}

function reorderDocuments(
  documents: SessionDocument[],
  sourceDocumentId: string,
  targetDocumentId: string
): SessionDocument[] {
  const sourceIndex = documents.findIndex(d => d.id === sourceDocumentId);
  const targetIndex = documents.findIndex(d => d.id === targetDocumentId);
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return documents;
  const nextDocuments = [...documents];
  const [movedDocument] = nextDocuments.splice(sourceIndex, 1);
  nextDocuments.splice(targetIndex, 0, movedDocument);
  return nextDocuments;
}

function isDocumentTabDrag(event: ReactDragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes(DOCUMENT_DRAG_TYPE);
}

function documentMatchesFilename(document: SessionDocument, linkedFilename: string): boolean {
  if (!document.filename) return false;
  return normalizeFilename(document.filename) === normalizeFilename(linkedFilename);
}

function getLinkedMarkdownFilename(href: string): string | null {
  if (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    /^[a-z][a-z\d+.-]*:/i.test(href) ||
    href.startsWith("//")
  )
    return null;
  const withoutHash = href.split("#", 1)[0];
  const withoutQuery = withoutHash.split("?", 1)[0];
  const normalizedPath = withoutQuery.replace(/\\/g, "/");
  const filename = normalizedPath.split("/").filter(Boolean).at(-1);
  if (!filename || !isAcceptedMarkdownPath(filename)) return null;
  return decodePathSegment(filename);
}

function getLinkHash(href: string): string | null {
  const hash = href.split("#")[1];
  if (!hash) return null;
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
  return ACCEPTED_EXTENSIONS.some(extension => normalizedPath.endsWith(extension));
}

function parseStoredDocuments(value: string | null): SessionDocument[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item): SessionDocument | null => {
        if (!isStoredDocument(item)) return null;
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
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SessionDocument>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.source === "string" &&
    (candidate.filename === undefined || typeof candidate.filename === "string") &&
    typeof candidate.updatedAt === "number" &&
    Number.isFinite(candidate.updatedAt)
  );
}

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some(extension => name.endsWith(extension));
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
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

function isEditableWheelTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("textarea, input, select, [contenteditable='true']"));
}

function isFindBarTarget(target: Element | null): boolean {
  return Boolean(target?.closest("[data-find-bar='true']"));
}

function isInsideElement(target: EventTarget | null, element: Element | null): boolean {
  return Boolean(element && target instanceof Node && element.contains(target));
}

function clampSplitPercent(value: number) {
  return Math.min(Math.max(value, MIN_SPLIT_PERCENT), MAX_SPLIT_PERCENT);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
