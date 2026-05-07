"use client";

import type { ClipboardEvent, DragEvent, KeyboardEvent } from "react";
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from "react";

import { cn } from "@/lib/utils";

export type HighlightRange = {
  start: number;
  end: number;
  className?: string;
};

export type HighlightEditorHandle = {
  focus: (options?: FocusOptions) => void;
  selectRange: (start: number, end: number) => void;
  scrollOffsetIntoView: (offset: number) => void;
};

type HighlightEditorProps = {
  "aria-label"?: string;
  className?: string;
  highlights?: HighlightRange[];
  onChange: (value: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  value: string;
  wordWrap?: boolean;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function normalizeHighlights(highlights: HighlightRange[], textLength: number): HighlightRange[] {
  return highlights
    .map(range => ({
      ...range,
      start: clamp(range.start, 0, textLength),
      end: clamp(range.end, 0, textLength),
    }))
    .filter(range => range.end > range.start)
    .sort((a, b) => a.start - b.start);
}

function getCaretOffset(root: HTMLElement): number {
  return getSelectionOffsets(root)?.end ?? 0;
}

function getSelectionOffsets(root: HTMLElement): { start: number; end: number } | null {
  const selection = window.getSelection();

  if (!selection || selection.rangeCount === 0) {
    return null;
  }

  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) {
    return null;
  }

  const preSelectionStartRange = range.cloneRange();
  preSelectionStartRange.selectNodeContents(root);
  preSelectionStartRange.setEnd(range.startContainer, range.startOffset);

  const preSelectionEndRange = range.cloneRange();
  preSelectionEndRange.selectNodeContents(root);
  preSelectionEndRange.setEnd(range.endContainer, range.endOffset);

  const start = preSelectionStartRange.toString().length;
  const end = preSelectionEndRange.toString().length;

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function setSelectionOffsets(root: HTMLElement, start: number, end = start) {
  const selection = window.getSelection();
  if (!selection) return;

  const startPoint = findTextPoint(root, start);
  const endPoint = findTextPoint(root, end);
  const range = document.createRange();

  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset);
  selection.removeAllRanges();
  selection.addRange(range);
}

function findTextPoint(root: HTMLElement, offset: number): { node: Node; offset: number } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let currentOffset = 0;

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const textLength = node.textContent?.length ?? 0;
    const nextOffset = currentOffset + textLength;

    if (offset <= nextOffset) {
      return {
        node,
        offset: clamp(offset - currentOffset, 0, textLength),
      };
    }

    currentOffset = nextOffset;
  }

  return { node: root, offset: root.childNodes.length };
}

function renderHighlightedText(text: string, highlights: HighlightRange[]) {
  const parts: React.ReactNode[] = [];
  const normalized = normalizeHighlights(highlights, text.length);

  let cursor = 0;

  normalized.forEach((range, index) => {
    if (range.start > cursor) {
      parts.push(
        <React.Fragment key={`text-${cursor}-${range.start}`}>{text.slice(cursor, range.start)}</React.Fragment>
      );
    }

    parts.push(
      <mark
        key={`highlight-${index}-${range.start}-${range.end}`}
        className={
          range.className ??
          "rounded-sm bg-[var(--accent-soft)] px-0.5 text-[var(--text)] ring-1 ring-[var(--accent)]/20"
        }
      >
        {text.slice(range.start, range.end)}
      </mark>
    );

    cursor = range.end;
  });

  if (cursor < text.length) {
    parts.push(<React.Fragment key={`text-${cursor}-${text.length}`}>{text.slice(cursor)}</React.Fragment>);
  }

  return parts.length > 0 ? parts : "\u200B";
}

function getPlainText(editor: HTMLElement) {
  return editor.innerText.replace(/\u200B/g, "").replace(/\n$/, "");
}

function replaceSelectedText(root: HTMLElement, value: string, replacement: string) {
  const selectionOffsets = getSelectionOffsets(root);
  if (!selectionOffsets) return null;

  return {
    caretOffset: selectionOffsets.start + replacement.length,
    nextValue: `${value.slice(0, selectionOffsets.start)}${replacement}${value.slice(selectionOffsets.end)}`,
    selectedText: value.slice(selectionOffsets.start, selectionOffsets.end),
  };
}

export const HighlightEditor = forwardRef<HighlightEditorHandle, HighlightEditorProps>(function HighlightEditor(
  {
    "aria-label": ariaLabel,
    className,
    highlights = [],
    onChange,
    placeholder = "Start typing...",
    style,
    value,
    wordWrap = true,
  },
  ref
) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastCaretOffsetRef = useRef(0);

  const highlightedContent = useMemo(() => {
    return renderHighlightedText(value, highlights);
  }, [highlights, value]);

  const emitPlainTextChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    lastCaretOffsetRef.current = getCaretOffset(editor);
    onChange(getPlainText(editor));
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    focus: options => editorRef.current?.focus(options),
    scrollOffsetIntoView: offset => {
      const editor = editorRef.current;
      if (!editor) return;
      const lineIndex = value.slice(0, offset).split("\n").length - 1;
      const lineHeight = parseFloat(window.getComputedStyle(editor).lineHeight) || 24;
      editor.scrollTop = Math.max(0, (lineIndex - 3) * lineHeight);
    },
    selectRange: (start, end) => {
      const editor = editorRef.current;
      if (!editor) return;
      setSelectionOffsets(editor, start, end);
      lastCaretOffsetRef.current = end;
    },
  }));

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const safeOffset = clamp(lastCaretOffsetRef.current, 0, value.length);

    window.requestAnimationFrame(() => {
      if (document.activeElement === editor) {
        setSelectionOffsets(editor, safeOffset);
      }
    });
  }, [highlights, value]);

  function handleBeforeInput(event: React.FormEvent<HTMLDivElement>) {
    const nativeEvent = event.nativeEvent as InputEvent;
    const inputType = nativeEvent.inputType;

    if (!inputType) return;
    if (inputType === "deleteByCut" || inputType === "insertFromPaste") {
      event.preventDefault();
      return;
    }

    const isPlainEdit =
      inputType.startsWith("insert") || inputType.startsWith("delete") || inputType.startsWith("history");

    if (!isPlainEdit) {
      event.preventDefault();
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();

    const editor = editorRef.current;
    if (!editor) return;

    const text = event.clipboardData.getData("text/plain");
    const replacement = replaceSelectedText(editor, value, text);
    if (!replacement) return;

    lastCaretOffsetRef.current = replacement.caretOffset;
    onChange(replacement.nextValue);
  }

  function handleCut(event: ClipboardEvent<HTMLDivElement>) {
    const editor = editorRef.current;
    if (!editor) return;

    const replacement = replaceSelectedText(editor, value, "");
    if (!replacement || !replacement.selectedText) return;

    event.preventDefault();
    event.clipboardData.setData("text/plain", replacement.selectedText);
    lastCaretOffsetRef.current = replacement.caretOffset;
    onChange(replacement.nextValue);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const key = event.key.toLowerCase();

    if ((event.metaKey || event.ctrlKey) && ["b", "i", "u"].includes(key)) {
      event.preventDefault();
    }
  }

  return (
    <div className="relative flex min-h-0 flex-1">
      {!value && (
        <div className="pointer-events-none absolute top-5 left-5 font-mono text-[var(--muted-soft)]">
          {placeholder}
        </div>
      )}

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        role="textbox"
        aria-label={ariaLabel}
        aria-multiline="true"
        onBeforeInput={handleBeforeInput}
        onCut={handleCut}
        onDrop={handleDrop}
        onInput={emitPlainTextChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        style={style}
        className={cn(
          "min-h-0 flex-1 overflow-y-auto border-0 bg-transparent p-5 font-mono leading-7 text-[var(--text)] outline-none",
          wordWrap ? "overflow-x-hidden break-words whitespace-pre-wrap" : "overflow-x-auto whitespace-pre",
          className
        )}
      >
        {highlightedContent}
      </div>
    </div>
  );
});
