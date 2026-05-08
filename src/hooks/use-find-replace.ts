"use client";

import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from "react";
import { useEffect, useState } from "react";

import {
  escapeRegex,
  type FindMatch,
  getFindMatches,
  isFindBarTarget,
  scrollTextareaSelectionIntoView,
} from "@/lib/markdown-studio-documents";

const FIND_DEBOUNCE_MS = 180;

type UseFindReplaceOptions = {
  source: string;
  activeDocumentId: string;
  showEditor: boolean;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  updateSource: (nextSource: string) => void;
  setToast: (message: string) => void;
};

export function useFindReplace({
  source,
  activeDocumentId,
  showEditor,
  textareaRef,
  updateSource,
  setToast,
}: UseFindReplaceOptions) {
  const [findOpen, setFindOpen] = useState(false);
  const [findInput, setFindInput] = useState("");
  const [findQuery, setFindQuery] = useState("");
  const [findMatches, setFindMatches] = useState<FindMatch[]>([]);
  const [findSearching, setFindSearching] = useState(false);
  const [findCaseSensitive, setFindCaseSensitive] = useState(false);
  const [replaceQuery, setReplaceQuery] = useState("");
  const [activeFindIndex, setActiveFindIndex] = useState(0);

  const findPending = findOpen && (findSearching || findInput !== findQuery);
  const findMatchCount = findMatches.length;
  const activeFindPosition = findMatchCount ? Math.min(activeFindIndex + 1, findMatchCount) : 0;

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
  }, [activeFindIndex, findMatchCount, findMatches, findOpen, showEditor, textareaRef]);

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

  return {
    activeFindPosition,
    applyReplace,
    closeFind,
    findCaseSensitive,
    findInput,
    findMatchCount,
    findOpen,
    findPending,
    handleFindKeyDown,
    moveFindSelection,
    replaceQuery,
    setFindCaseSensitive,
    setFindInput,
    setFindOpen,
    setReplaceQuery,
  };
}
