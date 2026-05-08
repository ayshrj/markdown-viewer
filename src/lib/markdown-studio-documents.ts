import { toCodeFenceLanguage } from "@/lib/code-language";
import { ACTIVE_DOCUMENT_TITLE_COOKIE, SITE_NAME } from "@/lib/site";
import type { ThemeMode } from "@/types/markdown";

export type ViewMode = "split" | "edit" | "read";

export type SessionDocument = {
  id: string;
  source: string;
  filename?: string;
  updatedAt: number;
};

export type FindMatch = {
  start: number;
  end: number;
};

export const ACCEPTED_EXTENSIONS = [".md", ".markdown", ".mdx", ".txt"];
export const ACCEPTED_UPLOADS = ACCEPTED_EXTENSIONS.join(",");
export const VIEW_MODES: Array<{ value: ViewMode; label: string }> = [
  { value: "split", label: "Split" },
  { value: "edit", label: "Edit" },
  { value: "read", label: "Read" },
];
export const THEME_VALUES: ThemeMode[] = ["system", "light", "dark"];
export const MIN_SPLIT_PERCENT = 15;
export const MAX_SPLIT_PERCENT = 85;
export const DOCUMENT_DRAG_TYPE = "application/x-mdlens-document-id";

export function createDocument(
  source: string,
  filename?: string,
  stableId?: string,
  updatedAt = Date.now()
): SessionDocument {
  return {
    id: stableId ?? `doc-${updatedAt}-${Math.random().toString(36).slice(2, 9)}`,
    source,
    filename,
    updatedAt,
  };
}

export function getActiveDocument(documents: SessionDocument[], activeDocumentId: string): SessionDocument {
  return (
    documents.find(document => document.id === activeDocumentId) ??
    documents[0] ??
    createDocument("", "Untitled 1.md", "fallback")
  );
}

export function getDocumentLabel(document: SessionDocument, index: number): string {
  if (document.filename?.trim()) return document.filename.trim();
  return `Draft ${index + 1}`;
}

export function getNextUntitledFilename(documents: SessionDocument[]): string {
  const usedNumbers = new Set<number>();
  for (const document of documents) {
    const match = /^Untitled(?:\s+(\d+))?\.md$/i.exec(document.filename?.trim() ?? "");
    if (match) usedNumbers.add(match[1] ? Number(match[1]) : 1);
  }
  let nextNumber = 1;
  while (usedNumbers.has(nextNumber)) nextNumber += 1;
  return `Untitled ${nextNumber}.md`;
}

export function normalizeDocumentFilename(value: string): string {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";
  return isAcceptedMarkdownPath(trimmedValue) ? trimmedValue : `${trimmedValue}.md`;
}

export function addLanguageToFence(source: string, fenceStartOffset: number, language: string): string {
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

export function getDocumentPageTitle(filename: string | undefined): string {
  return filename ? `${filename} - ${SITE_NAME}` : SITE_NAME;
}

export function syncActiveDocumentTitleCookie(filename: string | undefined) {
  const baseCookie = `${ACTIVE_DOCUMENT_TITLE_COOKIE}=`;
  if (!filename) {
    document.cookie = `${baseCookie}; Max-Age=0; Path=/; SameSite=Lax`;
    return;
  }

  document.cookie = `${baseCookie}${encodeURIComponent(
    filename.slice(0, 140)
  )}; Max-Age=31536000; Path=/; SameSite=Lax`;
}

export function getFindMatches(query: string, source: string, caseSensitive: boolean): FindMatch[] {
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

export function scrollTextareaSelectionIntoView(textarea: HTMLTextAreaElement, selectionStart: number) {
  const lineIndex = textarea.value.slice(0, selectionStart).split("\n").length - 1;
  const lineHeight = parseFloat(window.getComputedStyle(textarea).lineHeight) || 24;
  textarea.scrollTop = Math.max(0, (lineIndex - 3) * lineHeight);
}

export function reorderDocuments(
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

export function isDocumentTabDrag(event: { dataTransfer: DataTransfer }): boolean {
  return Array.from(event.dataTransfer.types).includes(DOCUMENT_DRAG_TYPE);
}

export function documentMatchesFilename(document: SessionDocument, linkedFilename: string): boolean {
  if (!document.filename) return false;
  return normalizeFilename(document.filename) === normalizeFilename(linkedFilename);
}

export function getLinkedMarkdownFilename(href: string): string | null {
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

export function getLinkHash(href: string): string | null {
  const hash = href.split("#")[1];
  if (!hash) return null;
  return decodePathSegment(hash);
}

export function parseStoredDocuments(value: string | null): SessionDocument[] {
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

export function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some(extension => name.endsWith(extension));
}

export function hasDraggedFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return typeof value === "string" && THEME_VALUES.includes(value as ThemeMode);
}

export function isViewMode(value: unknown): value is ViewMode {
  return value === "split" || value === "edit" || value === "read";
}

export function normalizeWheelDelta(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
  return event.deltaY;
}

export function isEditableWheelTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("textarea, input, select, [contenteditable='true']"));
}

export function isFindBarTarget(target: Element | null): boolean {
  return Boolean(target?.closest("[data-find-bar='true']"));
}

export function isInsideElement(target: EventTarget | null, element: Element | null): boolean {
  return Boolean(element && target instanceof Node && element.contains(target));
}

export function clampSplitPercent(value: number) {
  return Math.min(Math.max(value, MIN_SPLIT_PERCENT), MAX_SPLIT_PERCENT);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
