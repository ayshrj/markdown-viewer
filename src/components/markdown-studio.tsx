"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlignLeft,
  Copy,
  Download,
  FilePlus,
  FileText,
  Gauge,
  List,
  Maximize2,
  Minimize2,
  Monitor,
  Moon,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Printer,
  RefreshCcw,
  Search,
  Sun,
  Target,
  Trash2,
  Type,
  Upload,
  Volume2,
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
import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import MDLensIcon from "@/components/mdlens-icon";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBrowserTts } from "@/hooks/use-browser-tts";
import { useScreenSize } from "@/hooks/use-screen-size";
import { toCodeFenceLanguage } from "@/lib/code-language";
import { getDocumentStats, parseMarkdownDocument } from "@/lib/markdown";
import {
  ACCEPTED_UPLOADS,
  addLanguageToFence,
  clampSplitPercent,
  createDocument,
  DOCUMENT_DRAG_TYPE,
  documentMatchesFilename,
  escapeRegex,
  type FindMatch,
  getActiveDocument,
  getDocumentLabel,
  getDocumentPageTitle,
  getFindMatches,
  getLinkedMarkdownFilename,
  getLinkHash,
  getNextUntitledFilename,
  hasDraggedFiles,
  isAcceptedFile,
  isDocumentTabDrag,
  isEditableWheelTarget,
  isFindBarTarget,
  isInsideElement,
  isThemeMode,
  isViewMode,
  normalizeDocumentFilename,
  normalizeWheelDelta,
  parseStoredDocuments,
  reorderDocuments,
  scrollTextareaSelectionIntoView,
  type SessionDocument,
  syncActiveDocumentTitleCookie,
  THEME_VALUES,
  VIEW_MODES,
  type ViewMode,
} from "@/lib/markdown-studio-documents";
import {
  cancelBrowserSpeech,
  collectSpeechTextSegments,
  findSegmentForOffset,
  getFallbackSpeechTextFromSource,
  getPreviewReadPopoverKey,
  getSelectionPopoverPosition,
  getSentenceStartPoint,
  getSpeechSelectionFromRange,
  getSpeechSelectionFromSelectedText,
  isSelectionInsideElement,
  resolveWordBoundary,
  type SpeechSentenceSegment,
  splitTextIntoSentences,
} from "@/lib/markdown-tts";
import { SAMPLE_MARKDOWN } from "@/lib/sample-markdown";
import { cn } from "@/lib/utils";

type TtsPlaybackState = "idle" | "playing" | "paused";
type TtsHighlightMode = "sentence" | "word";
type TtsReadMode = "document" | "selection";

type PreviewReadPopoverState = {
  text: string;
  start: number | null;
  end: number | null;
  left: number;
  top: number;
};

type PreviewContentProps = {
  hasContent: boolean;
  source: string;
  onCodeLanguageSelect: (fenceStartOffset: number, language: string) => void;
  onLinkClick: (href: string) => boolean;
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
  ttsRate: "markdown-reader:tts-rate",
};

const FONT_SIZE_MIN = 11;
const FONT_SIZE_MAX = 22;
const FONT_SIZE_DEFAULT = 15;
const TTS_RATE_MIN = 0.7;
const TTS_RATE_MAX = 1.8;
const TTS_RATE_DEFAULT = 1;
const TTS_RATE_STEP = 0.1;
const FIND_DEBOUNCE_MS = 180;
const TTS_HIGHLIGHT_NAME = "mdlens-tts-current";

const PreviewContent = memo(function PreviewContent({
  hasContent,
  source,
  onCodeLanguageSelect,
  onLinkClick,
}: PreviewContentProps) {
  if (!hasContent) {
    return (
      <div className="text-muted grid min-h-80 place-items-center text-center text-sm">
        <div>
          <FileText aria-hidden className="mx-auto mb-3 text-(--muted-soft)" size={34} />
          <p className="text-foreground font-bold">Nothing to preview yet</p>
          <p className="mt-1">Write or upload markdown to begin.</p>
        </div>
      </div>
    );
  }

  return <MarkdownRenderer content={source} onCodeLanguageSelect={onCodeLanguageSelect} onLinkClick={onLinkClick} />;
});

export function MarkdownStudio() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const sourcePaneRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewScrollRef = useRef<HTMLElement>(null);
  const dragDepthRef = useRef(0);
  const loadFilesRef = useRef<(files: File[]) => Promise<void>>(async () => {});
  const applyCodeFenceLanguageRef = useRef<(fenceStartOffset: number, language: string) => void>(() => {});
  const openLinkedDocumentRef = useRef<(href: string) => boolean>(() => false);
  const savedAtRef = useRef<number>(0);
  const previewSelectionTimeoutRef = useRef<number | null>(null);
  const previewReadPopoverKeyRef = useRef<string | null>(null);
  const activeSpeechRequestIdRef = useRef(0);
  const sourceRef = useRef("");
  const lastHighlightedWordRef = useRef<string | null>(null);
  const lastHighlightedRangeRef = useRef<string | null>(null);
  const lastScrollTargetTopRef = useRef<number | null>(null);
  const ttsPlaybackStateRef = useRef<TtsPlaybackState>("idle");
  const ttsHighlightModeRef = useRef<TtsHighlightMode>("sentence");
  const ttsReadModeRef = useRef<TtsReadMode>("document");
  const ttsRateRef = useRef(TTS_RATE_DEFAULT);
  const ttsSentencesRef = useRef<SpeechSentenceSegment[]>([]);
  const ttsCurrentSentenceIndexRef = useRef(0);
  const ttsCurrentSentenceCharOffsetRef = useRef(0);
  const speakSentenceAtIndexRef = useRef<
    ((sentenceIndex: number, requestId: number, startCharOffset?: number) => void) | null
  >(null);
  const speakNextDocumentRef = useRef<(() => void) | null>(null);

  const didMountRef = useRef(false);

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
  const [ttsPlaybackState, setTtsPlaybackState] = useState<TtsPlaybackState>("idle");
  const [ttsHighlightMode, setTtsHighlightMode] = useState<TtsHighlightMode>("sentence");
  const [ttsRate, setTtsRate] = useState(TTS_RATE_DEFAULT);
  const [previewReadPopover, setPreviewReadPopover] = useState<PreviewReadPopoverState | null>(null);

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
  const isTtsActive = ttsPlaybackState !== "idle";
  const ttsPrimaryLabel = isTtsActive ? "Stop reading" : "Listen";
  const ttsPauseIcon = ttsPlaybackState === "paused" ? Play : Pause;
  const ttsPauseLabel = ttsPlaybackState === "paused" ? "Resume" : "Pause";
  const ttsHighlightIcon = ttsHighlightMode === "sentence" ? List : Type;
  const ttsHighlightLabel =
    ttsHighlightMode === "sentence" ? "TTS highlight mode: Sentence" : "TTS highlight mode: Word";
  const canReadPreviewSelection =
    previewReadPopover !== null && previewReadPopover.start !== null && previewReadPopover.end !== null;

  const { breakpoint } = useScreenSize();
  const isSmallScreen = useMemo(() => breakpoint && ["xs", "sm", "md", "lg"].includes(breakpoint), [breakpoint]);

  const {
    isSupported: hasBrowserTts,
    hasVoices: hasBrowserTtsVoices,
    isChecking: isCheckingBrowserTts,
  } = useBrowserTts();

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
    sourceRef.current = source;
  }, [source]);

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
    const storedTtsRate = Number(window.localStorage.getItem(STORAGE_KEYS.ttsRate));

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
    if (Number.isFinite(storedTtsRate)) setTtsRate(clampTtsRate(storedTtsRate));

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
    if (mounted) window.localStorage.setItem(STORAGE_KEYS.ttsRate, ttsRate.toFixed(1));
  }, [mounted, ttsRate]);

  useEffect(() => {
    previewScrollRef.current?.scrollTo({ top: 0 });
  }, [activeDocumentId]);

  useEffect(() => {
    setPreviewReadPopover(null);
  }, [activeDocumentId, source, viewMode]);

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

  applyCodeFenceLanguageRef.current = applyCodeFenceLanguage;

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

  useEffect(() => {
    ttsPlaybackStateRef.current = ttsPlaybackState;
  }, [ttsPlaybackState]);

  useEffect(() => {
    ttsHighlightModeRef.current = ttsHighlightMode;
  }, [ttsHighlightMode]);

  useEffect(() => {
    ttsRateRef.current = ttsRate;
  }, [ttsRate]);

  const clearWordHighlight = useCallback(() => {
    if (typeof window === "undefined") return;

    lastHighlightedWordRef.current = null;
    lastHighlightedRangeRef.current = null;

    const cssHighlights = (
      window as Window & {
        CSS?: {
          highlights?: {
            delete(name: string): void;
          };
        };
      }
    ).CSS?.highlights;

    cssHighlights?.delete(TTS_HIGHLIGHT_NAME);
  }, []);

  const highlightRange = useCallback((range: Range) => {
    if (typeof window === "undefined") return false;

    const HighlightConstructor = (
      window as Window & {
        Highlight?: new (...ranges: Range[]) => unknown;
      }
    ).Highlight;

    const cssHighlights = (
      window as Window & {
        CSS?: {
          highlights?: {
            set(name: string, highlight: unknown): void;
          };
        };
      }
    ).CSS?.highlights;

    if (!HighlightConstructor || !cssHighlights) return false;

    cssHighlights.set(TTS_HIGHLIGHT_NAME, new HighlightConstructor(range));
    return true;
  }, []);

  const scrollRangeIntoView = useCallback((range: Range) => {
    const scrollContainer = previewScrollRef.current;
    if (!scrollContainer) return;

    const rangeRect = range.getBoundingClientRect();
    const containerRect = scrollContainer.getBoundingClientRect();

    const isVisible = rangeRect.top >= containerRect.top + 80 && rangeRect.bottom <= containerRect.bottom - 80;

    if (isVisible) {
      lastScrollTargetTopRef.current = null;
      return;
    }

    const startElement =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : (range.startContainer as HTMLElement);

    if (!startElement) return;

    const targetTop = startElement.getBoundingClientRect().top;

    if (lastScrollTargetTopRef.current !== null && Math.abs(lastScrollTargetTopRef.current - targetTop) < 8) {
      return;
    }

    lastScrollTargetTopRef.current = targetTop;
    startElement.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  const highlightSpeechTextRange = useCallback(
    (start: number, end: number): boolean => {
      const preview = previewScrollRef.current;
      if (!preview || start >= end) {
        clearWordHighlight();
        return false;
      }

      const rangeKey = `${start}:${end}`;
      if (rangeKey === lastHighlightedRangeRef.current) return true;

      const { segments } = collectSpeechTextSegments(preview);
      const startSegment = findSegmentForOffset(segments, start);
      const endSegment = findSegmentForOffset(segments, Math.max(end - 1, start));

      if (!startSegment || !endSegment) {
        clearWordHighlight();
        return false;
      }

      const range = document.createRange();
      range.setStart(startSegment.node, start - startSegment.start);
      range.setEnd(endSegment.node, end - endSegment.start);

      if (!highlightRange(range)) return false;

      scrollRangeIntoView(range);
      lastHighlightedRangeRef.current = rangeKey;
      return true;
    },
    [clearWordHighlight, highlightRange, scrollRangeIntoView]
  );

  const updateSpokenWord = useCallback(
    (charIndex: number) => {
      const preview = previewScrollRef.current;
      if (!preview) return;

      const { text } = collectSpeechTextSegments(preview);
      const boundary = resolveWordBoundary(text, charIndex);

      if (!boundary) {
        clearWordHighlight();
        return;
      }

      const currentWord = text.slice(boundary.start, boundary.end);

      if (currentWord && currentWord === lastHighlightedWordRef.current) {
        return;
      }

      if (highlightSpeechTextRange(boundary.start, boundary.end)) {
        lastHighlightedWordRef.current = currentWord;
      }
    },
    [clearWordHighlight, highlightSpeechTextRange]
  );

  useEffect(() => {
    if (ttsPlaybackState === "idle") return;

    const sentence = ttsSentencesRef.current[ttsCurrentSentenceIndexRef.current];
    if (!sentence) return;

    const sentenceOffset = Math.min(Math.max(ttsCurrentSentenceCharOffsetRef.current, 0), sentence.text.length);

    if (ttsHighlightMode === "sentence") {
      lastHighlightedWordRef.current = null;
      highlightSpeechTextRange(sentence.start + sentenceOffset, sentence.end);
      return;
    }

    updateSpokenWord(sentence.start + sentenceOffset);
  }, [highlightSpeechTextRange, ttsHighlightMode, ttsPlaybackState, updateSpokenWord]);

  const stopTts = useCallback(() => {
    activeSpeechRequestIdRef.current += 1;
    ttsSentencesRef.current = [];
    ttsCurrentSentenceIndexRef.current = 0;
    ttsCurrentSentenceCharOffsetRef.current = 0;
    ttsReadModeRef.current = "document";
    ttsPlaybackStateRef.current = "idle";
    setTtsPlaybackState("idle");
    clearWordHighlight();
    lastScrollTargetTopRef.current = null;
    cancelBrowserSpeech();
  }, [clearWordHighlight]);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    stopTts();
  }, [activeDocumentId, stopTts]);

  const speakNextDocument = useCallback(() => {
    const currentIndex = documents.findIndex(document => document.id === activeDocumentId);
    const nextDocument = currentIndex >= 0 ? documents[currentIndex + 1] : null;

    if (!nextDocument) {
      ttsPlaybackStateRef.current = "idle";
      setTtsPlaybackState("idle");
      clearWordHighlight();
      lastScrollTargetTopRef.current = null;
      ttsCurrentSentenceCharOffsetRef.current = 0;
      setToast("Finished reading all documents");
      return;
    }

    activeSpeechRequestIdRef.current += 1;
    clearWordHighlight();
    lastScrollTargetTopRef.current = null;
    ttsCurrentSentenceIndexRef.current = 0;
    ttsCurrentSentenceCharOffsetRef.current = 0;

    setActiveDocumentId(nextDocument.id);

    window.setTimeout(() => {
      const preview = previewScrollRef.current;
      const text = preview
        ? collectSpeechTextSegments(preview).text
        : getFallbackSpeechTextFromSource(nextDocument.source);
      const sentences = splitTextIntoSentences(text);

      if (!sentences.length) {
        speakNextDocumentRef.current?.();
        return;
      }
      const requestId = activeSpeechRequestIdRef.current;

      ttsSentencesRef.current = sentences;
      ttsPlaybackStateRef.current = "playing";
      setTtsPlaybackState("playing");

      speakSentenceAtIndexRef.current?.(0, requestId, 0);
    }, 160);
  }, [activeDocumentId, clearWordHighlight, documents]);

  useEffect(() => {
    speakNextDocumentRef.current = speakNextDocument;
  }, [speakNextDocument]);

  const speakSentenceAtIndex = useCallback(
    (sentenceIndex: number, requestId: number, startCharOffset = 0) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
        setTtsPlaybackState("idle");
        setToast("Text-to-speech is not supported in this browser");
        return;
      }

      const sentence = ttsSentencesRef.current[sentenceIndex];

      if (!sentence) {
        ttsPlaybackStateRef.current = "idle";
        setTtsPlaybackState("idle");
        ttsReadModeRef.current = "document";
        clearWordHighlight();
        lastScrollTargetTopRef.current = null;
        return;
      }

      cancelBrowserSpeech();

      const safeStartOffset = Math.min(Math.max(startCharOffset, 0), sentence.text.length);
      const remainingRawText = sentence.text.slice(safeStartOffset);
      const leadingTrim = remainingRawText.length - remainingRawText.trimStart().length;
      const remainingText = remainingRawText.trimStart();

      if (!remainingText) {
        const nextSentenceIndex = sentenceIndex + 1;

        if (nextSentenceIndex >= ttsSentencesRef.current.length) {
          ttsPlaybackStateRef.current = "idle";
          setTtsPlaybackState("idle");
          ttsReadModeRef.current = "document";
          clearWordHighlight();
          lastScrollTargetTopRef.current = null;
          return;
        }

        ttsCurrentSentenceCharOffsetRef.current = 0;
        speakSentenceAtIndexRef.current?.(nextSentenceIndex, requestId, 0);
        return;
      }

      const actualStartOffset = safeStartOffset + leadingTrim;

      ttsCurrentSentenceIndexRef.current = sentenceIndex;
      ttsCurrentSentenceCharOffsetRef.current = actualStartOffset;
      ttsPlaybackStateRef.current = "playing";
      setTtsPlaybackState("playing");

      if (ttsHighlightModeRef.current === "sentence") {
        lastHighlightedWordRef.current = null;
        highlightSpeechTextRange(sentence.start + actualStartOffset, sentence.end);
      }

      const utterance = new SpeechSynthesisUtterance(remainingText);

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => voice.lang.toLowerCase().startsWith("en")) ?? voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = ttsRateRef.current;
      utterance.pitch = 1;

      utterance.onboundary = event => {
        if (requestId !== activeSpeechRequestIdRef.current || ttsPlaybackStateRef.current === "paused") {
          return;
        }

        if (typeof event.charIndex === "number") {
          const absoluteSentenceOffset = actualStartOffset + event.charIndex;
          ttsCurrentSentenceCharOffsetRef.current = absoluteSentenceOffset;
          if (ttsHighlightModeRef.current === "word") {
            updateSpokenWord(sentence.start + absoluteSentenceOffset);
          }
        }
      };

      utterance.onend = () => {
        if (requestId !== activeSpeechRequestIdRef.current) return;
        if (ttsPlaybackStateRef.current === "paused") return;

        const nextSentenceIndex = sentenceIndex + 1;

        if (nextSentenceIndex >= ttsSentencesRef.current.length) {
          if (ttsReadModeRef.current === "selection") {
            ttsReadModeRef.current = "document";
            ttsPlaybackStateRef.current = "idle";
            setTtsPlaybackState("idle");
            clearWordHighlight();
            lastScrollTargetTopRef.current = null;
            return;
          }

          speakNextDocument();
          return;
        }

        ttsCurrentSentenceCharOffsetRef.current = 0;

        window.setTimeout(() => {
          if (requestId !== activeSpeechRequestIdRef.current) return;
          if (ttsPlaybackStateRef.current !== "playing") return;

          speakSentenceAtIndexRef.current?.(nextSentenceIndex, requestId, 0);
        }, 80);
      };

      utterance.onerror = event => {
        if (requestId !== activeSpeechRequestIdRef.current) return;

        if (event.error === "interrupted" || event.error === "canceled") {
          return;
        }

        ttsPlaybackStateRef.current = "idle";
        setTtsPlaybackState("idle");
        clearWordHighlight();
        setToast("Text-to-speech failed");
      };

      window.speechSynthesis.speak(utterance);
    },
    [clearWordHighlight, highlightSpeechTextRange, speakNextDocument, updateSpokenWord]
  );

  useEffect(() => {
    speakSentenceAtIndexRef.current = speakSentenceAtIndex;
  }, [speakSentenceAtIndex]);

  const speakDocument = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setTtsPlaybackState("idle");
      setToast("Text-to-speech is not supported in this browser");
      return;
    }

    const preview = previewScrollRef.current;
    const text = preview ? collectSpeechTextSegments(preview).text : getFallbackSpeechTextFromSource(sourceRef.current);
    const sentences = splitTextIntoSentences(text);

    if (sentences.length === 0) {
      setTtsPlaybackState("idle");
      clearWordHighlight();
      setToast("Nothing to read");
      return;
    }

    activeSpeechRequestIdRef.current += 1;
    const requestId = activeSpeechRequestIdRef.current;

    cancelBrowserSpeech();
    clearWordHighlight();
    lastScrollTargetTopRef.current = null;

    ttsSentencesRef.current = sentences;
    ttsCurrentSentenceIndexRef.current = 0;
    ttsCurrentSentenceCharOffsetRef.current = 0;
    ttsReadModeRef.current = "document";

    speakSentenceAtIndex(0, requestId, 0);
  }, [clearWordHighlight, speakSentenceAtIndex]);

  const startOrResumeTts = useCallback(() => {
    if (!hasBrowserTts) {
      setToast("Text-to-speech is not supported in this browser");
      return;
    }

    if (isCheckingBrowserTts) {
      setToast("Text-to-speech voices are loading. Try again.");
      return;
    }

    if (!hasBrowserTtsVoices) {
      setToast("No text-to-speech voices found in this browser");
      return;
    }

    if (ttsPlaybackStateRef.current === "paused") {
      activeSpeechRequestIdRef.current += 1;
      const requestId = activeSpeechRequestIdRef.current;

      const resumeSentenceIndex = ttsCurrentSentenceIndexRef.current;
      const resumeCharOffset = Math.max(0, ttsCurrentSentenceCharOffsetRef.current - 8);

      clearWordHighlight();
      lastScrollTargetTopRef.current = null;

      speakSentenceAtIndex(resumeSentenceIndex, requestId, resumeCharOffset);
      return;
    }

    if (!showPreview) {
      setViewMode("read");

      window.setTimeout(() => {
        speakDocument();
      }, 120);

      return;
    }

    speakDocument();
  }, [
    clearWordHighlight,
    hasBrowserTts,
    hasBrowserTtsVoices,
    isCheckingBrowserTts,
    showPreview,
    speakDocument,
    speakSentenceAtIndex,
  ]);

  const pauseTts = useCallback(() => {
    if (ttsPlaybackStateRef.current !== "playing") return;

    activeSpeechRequestIdRef.current += 1;
    ttsPlaybackStateRef.current = "paused";
    setTtsPlaybackState("paused");
    cancelBrowserSpeech();
  }, []);

  const toggleTts = useCallback(() => {
    if (ttsPlaybackStateRef.current !== "idle") {
      stopTts();
      return;
    }

    startOrResumeTts();
  }, [startOrResumeTts, stopTts]);

  const toggleTtsPause = useCallback(() => {
    if (ttsPlaybackStateRef.current === "paused") {
      startOrResumeTts();
      return;
    }

    pauseTts();
  }, [pauseTts, startOrResumeTts]);

  const restartTts = useCallback(() => {
    activeSpeechRequestIdRef.current += 1;
    ttsSentencesRef.current = [];
    ttsCurrentSentenceIndexRef.current = 0;
    ttsCurrentSentenceCharOffsetRef.current = 0;
    ttsReadModeRef.current = "document";
    ttsPlaybackStateRef.current = "idle";
    setTtsPlaybackState("idle");
    cancelBrowserSpeech();
    clearWordHighlight();
    lastScrollTargetTopRef.current = null;

    window.setTimeout(() => {
      startOrResumeTts();
    }, 0);
  }, [clearWordHighlight, startOrResumeTts]);

  const toggleTtsHighlightMode = useCallback(() => {
    setTtsHighlightMode(mode => (mode === "sentence" ? "word" : "sentence"));
    clearWordHighlight();
    lastScrollTargetTopRef.current = null;
  }, [clearWordHighlight]);

  function canStartBrowserTts(): boolean {
    if (!hasBrowserTts) {
      setToast("Text-to-speech is not supported in this browser");
      return false;
    }

    if (isCheckingBrowserTts) {
      setToast("Text-to-speech voices are loading. Try again.");
      return false;
    }

    if (!hasBrowserTtsVoices) {
      setToast("No text-to-speech voices found in this browser");
      return false;
    }

    return true;
  }

  function startTtsWithSentences(
    sentences: SpeechSentenceSegment[],
    sentenceIndex: number,
    startCharOffset: number,
    readMode: TtsReadMode
  ) {
    if (!sentences.length) {
      setToast("Nothing to read");
      return;
    }

    activeSpeechRequestIdRef.current += 1;
    const requestId = activeSpeechRequestIdRef.current;

    cancelBrowserSpeech();
    clearWordHighlight();
    lastScrollTargetTopRef.current = null;

    ttsSentencesRef.current = sentences;
    ttsCurrentSentenceIndexRef.current = sentenceIndex;
    ttsCurrentSentenceCharOffsetRef.current = Math.max(0, startCharOffset);
    ttsReadModeRef.current = readMode;

    window.getSelection()?.removeAllRanges();
    setPreviewReadPopover(null);

    speakSentenceAtIndex(sentenceIndex, requestId, startCharOffset);
  }

  function startTtsFromPreviewSelection(readMode: TtsReadMode) {
    if (!previewReadPopover || !canStartBrowserTts()) return;
    if (previewReadPopover.start === null || previewReadPopover.end === null) {
      setToast("That selection cannot be read");
      return;
    }

    const preview = previewScrollRef.current;
    const speechText = preview
      ? collectSpeechTextSegments(preview).text
      : getFallbackSpeechTextFromSource(sourceRef.current);
    const startBoundary = resolveWordBoundary(speechText, previewReadPopover.start);
    const startOffset = startBoundary?.start ?? previewReadPopover.start;

    if (readMode === "selection") {
      const selectedText = speechText.slice(startOffset, previewReadPopover.end);
      const selectedSentences = splitTextIntoSentences(selectedText).map(sentence => ({
        ...sentence,
        start: sentence.start + startOffset,
        end: sentence.end + startOffset,
      }));

      startTtsWithSentences(selectedSentences, 0, 0, "selection");
      return;
    }

    const sentences = splitTextIntoSentences(speechText);
    const startPoint = getSentenceStartPoint(sentences, startOffset);

    if (!startPoint) {
      setToast("Nothing to read from that selection");
      return;
    }

    startTtsWithSentences(sentences, startPoint.index, startPoint.charOffset, "document");
  }

  useEffect(() => {
    return () => {
      activeSpeechRequestIdRef.current += 1;
      cancelBrowserSpeech();
      clearWordHighlight();
    };
  }, [clearWordHighlight]);

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

  openLinkedDocumentRef.current = openLinkedDocument;

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

  const showPreviewReadPopover = useCallback(() => {
    const preview = previewScrollRef.current;
    const selection = window.getSelection();

    if (!preview || !selection || selection.rangeCount === 0) {
      previewReadPopoverKeyRef.current = null;
      setPreviewReadPopover(null);
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      previewReadPopoverKeyRef.current = null;
      setPreviewReadPopover(null);
      return;
    }

    const range = selection.getRangeAt(0);

    if (!isSelectionInsideElement(range, preview)) {
      previewReadPopoverKeyRef.current = null;
      setPreviewReadPopover(null);
      return;
    }

    const speechSelection =
      getSpeechSelectionFromRange(preview, range) ?? getSpeechSelectionFromSelectedText(preview, selectedText);
    const position = getSelectionPopoverPosition(range);
    const nextPopover = {
      text: speechSelection?.text ?? selectedText,
      start: speechSelection?.start ?? null,
      end: speechSelection?.end ?? null,
      left: position.left,
      top: position.top,
    };
    const nextPopoverKey = getPreviewReadPopoverKey(nextPopover);

    if (nextPopoverKey === previewReadPopoverKeyRef.current) return;

    if (!speechSelection) {
      console.log("Preview selection could not map to readable TTS text:", {
        selectedText,
        readableText: collectSpeechTextSegments(preview).text,
      });
    }

    previewReadPopoverKeyRef.current = nextPopoverKey;
    setPreviewReadPopover(nextPopover);
  }, []);

  const schedulePreviewReadPopover = useCallback(() => {
    if (previewSelectionTimeoutRef.current !== null) {
      window.clearTimeout(previewSelectionTimeoutRef.current);
    }

    previewSelectionTimeoutRef.current = window.setTimeout(showPreviewReadPopover, 120);
  }, [showPreviewReadPopover]);

  const hidePreviewReadPopoverIfSelectionCleared = useCallback(() => {
    if (window.getSelection()?.toString().trim()) return;
    setPreviewReadPopover(null);
  }, []);

  useEffect(() => {
    if (!showPreview) {
      setPreviewReadPopover(null);
      return;
    }

    window.addEventListener("mouseup", schedulePreviewReadPopover);
    window.addEventListener("touchend", schedulePreviewReadPopover);
    window.addEventListener("keyup", schedulePreviewReadPopover);

    return () => {
      window.removeEventListener("mouseup", schedulePreviewReadPopover);
      window.removeEventListener("touchend", schedulePreviewReadPopover);
      window.removeEventListener("keyup", schedulePreviewReadPopover);

      if (previewSelectionTimeoutRef.current !== null) {
        window.clearTimeout(previewSelectionTimeoutRef.current);
      }
    };
  }, [schedulePreviewReadPopover, showPreview]);

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

  const handlePreviewCodeLanguageSelect = useCallback((fenceStartOffset: number, language: string) => {
    applyCodeFenceLanguageRef.current(fenceStartOffset, language);
  }, []);

  const handlePreviewLinkClick = useCallback((href: string) => openLinkedDocumentRef.current(href), []);

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
        ::highlight(mdlens-tts-current) {
          background: color-mix(in srgb, #ef4444 20%, transparent);
          color: inherit;
        }
      `}</style>

      <div className="print-content">
        <div className="markdown-body" style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
          <MarkdownRenderer content={source} />
        </div>
      </div>

      <main className={cn("bg-background text-foreground h-screen overflow-hidden p-3 sm:p-6", zenMode && "zen-mode")}>
        <section
          className="mx-auto flex h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-lg border border-(--line) bg-(--panel) shadow-sm sm:h-[calc(100vh-3rem)]"
          style={{ maxWidth: maxWidth >= 99999 ? "100%" : `${maxWidth}px` }}
        >
          {!zenMode && (
            <header className="flex items-center gap-1 border-b border-(--line) bg-(--panel-muted) px-3 py-2">
              <h1 className="text-muted mr-1 inline-flex items-center gap-2 text-[0.8rem] font-bold tracking-[0.08em] uppercase">
                <MDLensIcon
                  aria-hidden
                  className="mdlens-icon size-5 rounded-xl"
                  focusable="false"
                  showSubtitle={false}
                  size={20}
                />
                <span className="xs:inline hidden">
                  <span className="mdlens-wordmark-primary">MD</span>
                  <span className="mdlens-wordmark-accent">Lens</span>
                </span>
              </h1>

              <div className="mx-2 h-5 w-px bg-(--line)" />

              <Tabs value={viewMode} onValueChange={value => setViewMode(value as ViewMode)}>
                <TabsList className="text-muted h-auto rounded-lg bg-(--panel-sunken) p-0.5">
                  {VIEW_MODES.map(mode => (
                    <TabsTrigger
                      key={mode.value}
                      value={mode.value}
                      className="data-active:text-foreground rounded-md border border-transparent px-2.5 py-1 text-xs font-bold data-active:border-(--line-strong) data-active:bg-(--panel) data-active:shadow-none sm:px-3"
                    >
                      {mode.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              <div className="mx-2 hidden h-5 w-px bg-(--line) sm:block" />

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

              <div className="mx-2 hidden h-5 w-px bg-(--line) sm:block" />

              <div className="hidden items-center gap-0.5 sm:flex">
                <IconButton
                  icon={Search}
                  label="Find & replace (⌘F)"
                  onClick={() => setFindOpen(o => !o)}
                  active={findOpen}
                />
                <IconButton icon={Volume2} label={ttsPrimaryLabel} onClick={toggleTts} active={isTtsActive} />
                <IconButton
                  icon={ttsHighlightIcon}
                  label={ttsHighlightLabel}
                  onClick={toggleTtsHighlightMode}
                  active={ttsHighlightMode === "sentence"}
                />

                {isTtsActive ? (
                  <>
                    <IconButton icon={ttsPauseIcon} label={ttsPauseLabel} onClick={toggleTtsPause} active />
                    <IconButton icon={RefreshCcw} label="Restart reading" onClick={restartTts} />
                  </>
                ) : null}
                <TtsRatePopover rate={ttsRate} onChange={setTtsRate} />
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
                <div className="mx-2 h-5 w-px bg-(--line)" />
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
                  className="text-muted hover:text-foreground h-8 w-8 rounded-md bg-transparent shadow-none transition hover:bg-(--panel-sunken)"
                >
                  <MoreHorizontal aria-hidden size={15} />
                </Button>
              </div>

              <MobileToolbarSheet open={mobileSheetOpen} onClose={() => setMobileSheetOpen(false)}>
                <div className="flex items-center gap-1 border-b border-(--line) px-4 pt-1 pb-3">
                  <span className="mr-auto text-xs font-bold tracking-widest text-(--muted-soft) uppercase">
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
                  <IconButton icon={Volume2} label={ttsPrimaryLabel} onClick={toggleTts} active={isTtsActive} />
                  <IconButton
                    icon={ttsHighlightIcon}
                    label={ttsHighlightLabel}
                    onClick={toggleTtsHighlightMode}
                    active={ttsHighlightMode === "sentence"}
                  />
                  {isTtsActive ? (
                    <>
                      <IconButton icon={ttsPauseIcon} label={ttsPauseLabel} onClick={toggleTtsPause} active />
                      <IconButton icon={RefreshCcw} label="Restart reading" onClick={restartTts} />
                    </>
                  ) : null}
                  <TtsRatePopover rate={ttsRate} onChange={setTtsRate} />
                </div>

                <div className="py-1">
                  <MobileSheetRow icon={Upload} label="Upload file" onClick={openFilePickerFromSheet} />
                  <MobileSheetRow icon={FilePlus} label="New document" onClick={sheetAction(createBlankDocument)} />
                  <MobileSheetRow icon={Download} label="Download .md" onClick={sheetAction(downloadMarkdown)} />
                  <MobileSheetRow icon={Copy} label="Copy markdown" onClick={sheetAction(copyMarkdown)} />
                  <MobileSheetRow icon={Printer} label="Print" onClick={sheetAction(printDocument)} />
                  <MobileSheetRow icon={RefreshCcw} label="Load sample" onClick={sheetAction(loadSample)} />
                </div>

                <div className="border-t border-(--line) py-1">
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
            <div className="flex items-center justify-end gap-1 border-b border-(--line) bg-(--panel-muted) px-4 py-1.5">
              <IconButton icon={Volume2} label={ttsPrimaryLabel} onClick={toggleTts} active={isTtsActive} />
              <IconButton
                icon={ttsHighlightIcon}
                label={ttsHighlightLabel}
                onClick={toggleTtsHighlightMode}
                active={ttsHighlightMode === "sentence"}
              />
              {isTtsActive ? (
                <>
                  <IconButton icon={ttsPauseIcon} label={ttsPauseLabel} onClick={toggleTtsPause} active />
                  <IconButton icon={RefreshCcw} label="Restart reading" onClick={restartTts} />
                </>
              ) : null}
              <TtsRatePopover rate={ttsRate} onChange={setTtsRate} />
              <IconButton icon={themeIcon} label={`Theme: ${capitalize(selectedTheme)}`} onClick={cycleTheme} />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setZenMode(false)}
                className="text-muted hover:text-foreground h-auto gap-1.5 bg-transparent px-2 py-1 text-xs font-bold shadow-none transition hover:bg-(--panel-sunken)"
              >
                <Minimize2 aria-hidden size={12} />
                Exit Zen
              </Button>
            </div>
          )}

          <div className="document-strip flex items-center gap-2 border-b border-(--line) bg-(--panel) px-3 py-2">
            <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto" aria-label="Open markdown documents">
              {documents.map((document, index) => (
                <div
                  key={document.id}
                  draggable
                  onDragEnd={clearDocumentDragState}
                  onDragOver={event => handleDocumentDragOver(event, document.id)}
                  onDragStart={event => handleDocumentDragStart(event, document.id)}
                  onDrop={event => handleDocumentDrop(event, document.id)}
                  className={cn(
                    "document-tab group flex max-w-55 shrink-0 cursor-grab items-center rounded-md border text-xs transition active:cursor-grabbing",
                    document.id === activeDocumentId
                      ? "text-foreground border-(--line-strong) bg-(--panel-muted)"
                      : "text-muted hover:text-foreground border-transparent hover:border-(--line) hover:bg-(--panel-muted)",
                    document.id === draggedDocumentId && "opacity-50",
                    document.id === dropTargetDocumentId &&
                      document.id !== draggedDocumentId &&
                      "border-accent bg-(--accent-soft)"
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
                    className="hover:text-foreground rounded px-1.5 py-1.5 text-(--muted-soft) opacity-80 transition hover:bg-(--panel-sunken) sm:opacity-0 sm:group-hover:opacity-100"
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
                  className="text-muted hover:text-foreground min-h-8 shrink-0 rounded-md border-(--line-strong) bg-transparent px-2.5 text-xs font-bold shadow-none hover:bg-(--panel-sunken)"
                >
                  <Pencil aria-hidden size={13} />
                  Rename
                </Button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="text-foreground w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-(--line-strong) bg-(--panel) p-3 text-xs shadow-lg"
              >
                <form onSubmit={renameActiveDocument} role="dialog" aria-label="Rename active markdown document">
                  <label className="block font-bold tracking-[0.08em] text-(--muted-soft) uppercase">
                    Document name
                  </label>
                  <input
                    value={renameValue}
                    onChange={event => setRenameValue(event.target.value)}
                    className="text-foreground focus:border-accent mt-2 w-full rounded-md border border-(--line-strong) bg-(--panel-muted) px-2.5 py-2 text-sm outline-none"
                    autoFocus
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setRenamePopoverOpen(false)}
                      className="text-muted hover:text-foreground rounded-md border-(--line) bg-transparent px-2.5 py-1.5 font-bold shadow-none hover:bg-(--panel-sunken)"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="outline"
                      size="sm"
                      className="border-accent text-foreground rounded-md bg-(--accent-soft) px-2.5 py-1.5 font-bold shadow-none hover:bg-(--panel-sunken)"
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
              className="flex flex-wrap items-center gap-2 border-b border-(--line) bg-(--panel-muted) px-4 py-2"
            >
              <Search aria-hidden size={13} className="shrink-0 text-(--muted-soft)" />
              <input
                autoFocus
                value={findInput}
                onChange={e => setFindInput(e.target.value)}
                onKeyDown={handleFindKeyDown}
                placeholder="Find…"
                aria-label="Find text"
                className="text-foreground focus:border-accent h-7 min-w-30 flex-1 rounded-md border border-(--line-strong) bg-(--panel) px-2.5 text-xs outline-none"
              />
              <input
                value={replaceQuery}
                onChange={e => setReplaceQuery(e.target.value)}
                onKeyDown={handleFindKeyDown}
                placeholder="Replace with…"
                aria-label="Replace with"
                className="text-foreground focus:border-accent h-7 min-w-30 flex-1 rounded-md border border-(--line-strong) bg-(--panel) px-2.5 text-xs outline-none"
              />
              <span className="shrink-0 text-xs text-(--muted-soft)">
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
                  className="border-t-accent h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-(--line-strong)"
                />
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={findCaseSensitive}
                title={findCaseSensitive ? "Case-sensitive find" : "Case-insensitive find"}
                onClick={() => setFindCaseSensitive(value => !value)}
                className={cn(
                  "h-7 shrink-0 rounded-md px-2.5 text-xs font-bold shadow-none transition",
                  findCaseSensitive
                    ? "border-accent text-foreground bg-(--accent-soft) hover:bg-(--panel-sunken)"
                    : "text-muted hover:text-foreground border-(--line) bg-transparent hover:bg-(--panel-sunken)"
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
                className="text-muted hover:text-foreground h-7 shrink-0 rounded-md border-(--line) bg-transparent px-2.5 text-xs font-bold shadow-none transition hover:bg-(--panel-sunken) disabled:cursor-not-allowed disabled:opacity-40"
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => moveFindSelection(1)}
                disabled={findPending || !findMatchCount}
                className="text-muted hover:text-foreground h-7 shrink-0 rounded-md border-(--line) bg-transparent px-2.5 text-xs font-bold shadow-none transition hover:bg-(--panel-sunken) disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={applyReplace}
                disabled={findPending || !findQuery.trim() || findMatchCount === 0}
                className="border-accent text-foreground h-7 shrink-0 rounded-md bg-(--accent-soft) px-3 text-xs font-bold shadow-none transition hover:bg-(--panel-sunken) disabled:cursor-not-allowed disabled:opacity-40"
              >
                Replace all
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeFind}
                className="text-muted hover:text-foreground h-7 shrink-0 rounded-md border-(--line) bg-transparent px-2.5 text-xs font-bold shadow-none transition hover:bg-(--panel-sunken)"
              >
                Close
              </Button>
            </div>
          )}

          <div
            ref={splitContainerRef}
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row",
              viewMode === "read" && "read-layout",
              isResizing && "select-none"
            )}
          >
            {viewMode === "read" ? (
              <aside className={cn("toc-sidebar", tocOpen && "is-open")}>
                <div className="toc-header">Contents</div>
                <nav className="toc-list" aria-label="Table of contents">
                  {markdownDocument.headings.length ? (
                    markdownDocument.headings.map(heading => (
                      <a
                        key={`${heading.id}-${heading.depth}-${heading.text}`}
                        href={`#${heading.id}`}
                        onClick={event => handleTocClick(event, heading.id)}
                        className={cn("toc-item", `toc-depth-${heading.depth}`)}
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
                <div className="border-b border-(--line) bg-(--panel-muted) px-4 py-1.5 text-[0.68rem] font-bold tracking-[0.08em] text-(--muted-soft) uppercase">
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
                  className="text-foreground min-h-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent p-5 font-mono leading-7 outline-none placeholder:text-(--muted-soft)"
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
                className={cn("split-divider hidden lg:flex", isResizing && "is-dragging")}
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
                className={cn(
                  "flex min-h-105 min-w-0 flex-1 flex-col border-t border-(--line) lg:border-t-0",
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
                <div className="border-b border-(--line) bg-(--panel-muted) px-4 py-1.5 text-[0.68rem] font-bold tracking-[0.08em] text-(--muted-soft) uppercase">
                  {previewPending ? "Previewing..." : "Preview"}
                </div>
                <article
                  ref={previewScrollRef}
                  onScroll={hidePreviewReadPopoverIfSelectionCleared}
                  style={{ fontSize: `${fontSize}px` }}
                  className={cn("markdown-body flex-1 overflow-y-auto p-6", viewMode === "read" && "w-full sm:p-10")}
                >
                  <PreviewContent
                    hasContent={Boolean(markdownDocument.content.trim())}
                    source={source}
                    onCodeLanguageSelect={handlePreviewCodeLanguageSelect}
                    onLinkClick={handlePreviewLinkClick}
                  />
                </article>
              </section>
            ) : null}
          </div>

          <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-(--line) bg-(--panel-muted) px-4 py-1.5 text-[0.7rem] text-(--muted-soft)">
            <span>{stats.words.toLocaleString()} words</span>
            <span>{stats.characters.toLocaleString()} chars</span>
            <span>{lineCount.toLocaleString()} lines</span>
            <span>~{stats.readingMinutes} min read</span>
            <span>{documents.length.toLocaleString()} docs open</span>
            <span className="min-w-0 truncate">{filename ?? "Local draft"}</span>

            <span
              className={cn(
                "ml-auto flex items-center gap-1 transition-opacity duration-300",
                savedStatus === "saved" ? "opacity-60" : "opacity-100"
              )}
            >
              <span
                className={cn(
                  "inline-block h-1.5 w-1.5 rounded-full",
                  savedStatus === "saved" ? "bg-green-500" : "bg-amber-400"
                )}
              />
              {savedStatus === "saved" ? "Saved" : "Unsaved"}
            </span>

            {wordGoal > 0 && (
              <span className={cn("flex items-center gap-1.5", wordGoalDone && "text-green-600")}>
                <span
                  className="relative inline-block h-1.5 w-16 overflow-hidden rounded-full bg-(--line)"
                  title={`${stats.words} / ${wordGoal} words`}
                >
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full transition-all",
                      wordGoalDone ? "bg-green-500" : "bg-accent"
                    )}
                    style={{ width: `${wordGoalPercent}%` }}
                  />
                </span>
                {wordGoalDone ? "Goal reached!" : `${stats.words} / ${wordGoal}`}
              </span>
            )}
          </footer>

          {toast ? (
            <div className="text-foreground pointer-events-none fixed bottom-8 left-1/2 z-50 -translate-x-1/2 rounded-md border border-(--line-strong) bg-(--panel) px-4 py-2 text-sm font-bold shadow-sm">
              {toast}
            </div>
          ) : null}
        </section>

        {previewReadPopover ? (
          <div
            data-preview-read-popover="true"
            role="dialog"
            aria-label="Read selected preview text"
            onMouseDown={event => event.preventDefault()}
            className="text-foreground fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-lg border border-(--line-strong) bg-(--panel) p-1 text-xs shadow-lg"
            style={{ left: `${previewReadPopover.left}px`, top: `${previewReadPopover.top}px` }}
            title={previewReadPopover.text}
          >
            <span className="text-muted flex items-center gap-1 px-2 font-bold">
              <Volume2 aria-hidden size={13} />
              Read
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => startTtsFromPreviewSelection("document")}
              disabled={!canReadPreviewSelection}
              className="text-muted hover:text-foreground h-7 rounded-md border-(--line) bg-transparent px-2.5 text-xs font-bold shadow-none hover:bg-(--panel-sunken) disabled:cursor-not-allowed disabled:opacity-45"
            >
              Start from here
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => startTtsFromPreviewSelection("selection")}
              disabled={!canReadPreviewSelection}
              className="border-accent text-foreground h-7 rounded-md bg-(--accent-soft) px-2.5 text-xs font-bold shadow-none hover:bg-(--panel-sunken) disabled:cursor-not-allowed disabled:opacity-45"
            >
              Read selection
            </Button>
          </div>
        ) : null}

        {isDraggingFiles ? (
          <div className="border-accent pointer-events-none fixed inset-0 z-40 grid place-items-center border-[6px] border-dashed bg-(--bg)/70 p-6 backdrop-blur-[2px]">
            <div className="rounded-lg border border-(--line-strong) bg-(--panel) px-5 py-4 text-center shadow-sm">
              <Upload aria-hidden className="text-muted mx-auto mb-2" size={24} />
              <p className="text-foreground text-sm font-bold">Drop markdown files to add them</p>
              <p className="text-muted mt-1 text-xs">.md, .markdown, .mdx, and .txt files are accepted.</p>
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
      className={cn(
        "relative h-8 w-8 rounded-md bg-transparent shadow-none transition",
        active
          ? "text-accent bg-(--accent-soft)"
          : variant === "danger"
            ? "text-muted hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
            : "text-muted hover:text-foreground hover:bg-(--panel-sunken)"
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
        className="pb-safe fixed right-0 bottom-0 left-0 z-40 rounded-t-2xl border-t border-(--line-strong) bg-(--panel)"
      >
        <div className="mx-auto mt-2.5 mb-3 h-1 w-10 rounded-full bg-(--line-strong)" />
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
      className={cn(
        "flex w-full items-center gap-3 px-5 py-3 text-sm font-medium transition active:bg-(--panel-sunken)",
        active ? "text-accent" : variant === "danger" ? "text-red-600 dark:text-red-400" : "text-foreground"
      )}
    >
      <Icon aria-hidden size={18} className="text-muted shrink-0" />
      {label}
      {active && <span className="text-accent ml-auto text-xs font-bold">On</span>}
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
          className="text-muted hover:text-foreground min-h-8 gap-1.5 rounded-md border-(--line-strong) bg-transparent px-2.5 text-xs font-bold whitespace-nowrap shadow-none hover:bg-(--panel-sunken)"
        >
          <Type aria-hidden size={13} />
          {fontSize}px
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="text-foreground w-52 rounded-lg border border-(--line-strong) bg-(--panel) p-3 text-xs shadow-lg"
        role="dialog"
        aria-label="Font size"
      >
        <p className="mb-2 font-bold tracking-[0.08em] text-(--muted-soft) uppercase">Font size</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onChange(Math.max(FONT_SIZE_MIN, fontSize - 1))}
            className="text-muted h-7 w-7 rounded-md border-(--line) bg-transparent text-sm font-bold shadow-none hover:bg-(--panel-sunken)"
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
            className="**:data-[slot=slider-range]:bg-accent **:data-[slot=slider-thumb]:border-accent flex-1 **:data-[slot=slider-thumb]:bg-(--panel) **:data-[slot=slider-track]:bg-(--panel-sunken)"
            aria-label="Font size slider"
          />
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={() => onChange(Math.min(FONT_SIZE_MAX, fontSize + 1))}
            className="text-muted h-7 w-7 rounded-md border-(--line) bg-transparent text-sm font-bold shadow-none hover:bg-(--panel-sunken)"
            aria-label="Increase font size"
          >
            +
          </Button>
        </div>
        <div className="mt-2 flex justify-between text-[0.68rem] text-(--muted-soft)">
          <span>{FONT_SIZE_MIN}px</span>
          <span className="text-foreground font-bold">{fontSize}px</span>
          <span>{FONT_SIZE_MAX}px</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(FONT_SIZE_DEFAULT)}
          className="text-muted hover:text-foreground mt-2 w-full rounded-md border-(--line) bg-transparent py-1 shadow-none transition hover:bg-(--panel-sunken)"
        >
          Reset to default ({FONT_SIZE_DEFAULT}px)
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function TtsRatePopover({ rate, onChange }: { rate: number; onChange: (v: number) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-muted hover:text-foreground min-h-8 gap-1.5 rounded-md border-(--line-strong) bg-transparent px-2.5 text-xs font-bold whitespace-nowrap shadow-none hover:bg-(--panel-sunken)"
        >
          <Gauge aria-hidden size={13} />
          {formatTtsRate(rate)}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="text-foreground w-56 rounded-lg border border-(--line-strong) bg-(--panel) p-3 text-xs shadow-lg"
        role="dialog"
        aria-label="Text-to-speech speed"
      >
        <p className="mb-1 font-bold tracking-[0.08em] text-(--muted-soft) uppercase">Reading speed</p>
        <p className="text-muted mb-3 text-[0.72rem]">Applies to the next spoken sentence.</p>
        <Slider
          min={TTS_RATE_MIN}
          max={TTS_RATE_MAX}
          step={TTS_RATE_STEP}
          value={[rate]}
          onValueChange={([nextRate]) => {
            if (typeof nextRate === "number") onChange(clampTtsRate(nextRate));
          }}
          className="**:data-[slot=slider-range]:bg-accent **:data-[slot=slider-thumb]:border-accent **:data-[slot=slider-thumb]:bg-(--panel) **:data-[slot=slider-track]:bg-(--panel-sunken)"
          aria-label="Text-to-speech speed slider"
        />
        <div className="mt-2 flex justify-between text-[0.68rem] text-(--muted-soft)">
          <span>{formatTtsRate(TTS_RATE_MIN)}</span>
          <span className="text-foreground font-bold">{formatTtsRate(rate)}</span>
          <span>{formatTtsRate(TTS_RATE_MAX)}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(TTS_RATE_DEFAULT)}
          className="text-muted hover:text-foreground mt-3 w-full rounded-md border-(--line) bg-transparent py-1 shadow-none transition hover:bg-(--panel-sunken)"
        >
          Reset to normal ({formatTtsRate(TTS_RATE_DEFAULT)})
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
          className="text-muted hover:text-foreground min-h-8 gap-1.5 rounded-md border-(--line-strong) bg-transparent px-2.5 text-xs font-bold whitespace-nowrap shadow-none hover:bg-(--panel-sunken)"
        >
          <AlignLeft aria-hidden size={13} />
          Width
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="text-foreground w-[min(14rem,calc(100vw-2rem))] rounded-lg border border-(--line-strong) bg-(--panel) p-3 text-xs shadow-lg"
        role="dialog"
        aria-label="Set content max width"
      >
        <p className="mb-2 font-bold tracking-[0.08em] text-(--muted-soft) uppercase">Max content width</p>
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
              className={cn(
                "rounded-md border px-2 py-1.5 text-center font-bold shadow-none transition",
                maxWidth === preset.value
                  ? "border-accent text-foreground bg-(--accent-soft)"
                  : "text-muted hover:text-foreground border-(--line) bg-transparent hover:border-(--line-strong) hover:bg-transparent"
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
            className="text-foreground focus:border-accent min-w-0 flex-1 rounded-md border border-(--line-strong) bg-(--panel-muted) px-2 py-1.5 text-sm outline-none"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="border-accent text-foreground rounded-md bg-(--accent-soft) px-2.5 font-bold shadow-none transition hover:bg-(--panel-sunken)"
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
          className={cn(
            "min-h-8 gap-1.5 rounded-md border px-2.5 text-xs font-bold whitespace-nowrap shadow-none transition",
            wordGoal > 0
              ? "border-accent text-foreground bg-(--accent-soft) hover:bg-(--panel-sunken)"
              : "text-muted hover:text-foreground border-(--line-strong) bg-transparent hover:bg-(--panel-sunken)"
          )}
        >
          <Target aria-hidden size={13} />
          Goal
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="text-foreground w-[min(14rem,calc(100vw-2rem))] rounded-lg border border-(--line-strong) bg-(--panel) p-3 text-xs shadow-lg"
        role="dialog"
        aria-label="Set word goal"
      >
        <p className="mb-2 font-bold tracking-[0.08em] text-(--muted-soft) uppercase">Word goal</p>
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
              className={cn(
                "rounded-md border py-1 text-center font-bold shadow-none transition",
                wordGoal === g
                  ? "border-accent text-foreground bg-(--accent-soft)"
                  : "text-muted hover:text-foreground border-(--line) bg-transparent hover:border-(--line-strong) hover:bg-transparent"
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
            className="text-foreground focus:border-accent min-w-0 flex-1 rounded-md border border-(--line-strong) bg-(--panel-muted) px-2 py-1.5 text-sm outline-none"
          />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="border-accent text-foreground rounded-md bg-(--accent-soft) px-2.5 font-bold shadow-none transition hover:bg-(--panel-sunken)"
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
            className="text-muted mt-2 w-full rounded-md border-(--line) bg-transparent py-1 shadow-none transition hover:bg-(--panel-sunken) hover:text-(--danger)"
          >
            Clear goal
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampTtsRate(value: number) {
  return clampNumber(Number(value.toFixed(1)), TTS_RATE_MIN, TTS_RATE_MAX);
}

function formatTtsRate(value: number) {
  return `${value.toFixed(1)}x`;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
