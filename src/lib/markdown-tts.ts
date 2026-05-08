export type SpeechTextNodeSegment = {
  node: Text;
  start: number;
  end: number;
};

export type SpeechSentenceSegment = {
  text: string;
  start: number;
  end: number;
};

type PreviewReadPopoverLike = {
  text: string;
  start: number | null;
  end: number | null;
  left: number;
  top: number;
};

const TTS_READABLE_BLOCK_SELECTOR = "h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,summary,dt,dd";
const TTS_SKIP_SELECTOR = [
  "script",
  "style",
  "noscript",
  "template",
  "svg",
  "canvas",
  "button",
  "input",
  "textarea",
  "select",
  "option",
  "pre",
  "code",
  "kbd",
  "samp",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "math",
  ".katex",
  ".katex-display",
  ".katex-mathml",
  ".math",
  ".math-inline",
  ".math-display",
  ".mermaid",
  ".code-block",
  ".code-toolbar",
  ".copy-button",
  ".footnotes",
  "[aria-hidden='true']",
  "[hidden]",
  "[data-footnotes]",
  "[data-footnote-backref]",
  "[data-tts-skip='true']",
].join(",");

export function isSelectionInsideElement(range: Range, element: Element): boolean {
  return (
    isInsideElement(range.commonAncestorContainer, element) ||
    isInsideElement(range.startContainer, element) ||
    isInsideElement(range.endContainer, element)
  );
}

export function getPreviewReadPopoverKey(popover: PreviewReadPopoverLike): string {
  return [
    popover.text,
    popover.start ?? "null",
    popover.end ?? "null",
    Math.round(popover.left),
    Math.round(popover.top),
  ].join("|");
}

export function getSelectionPopoverPosition(range: Range): { left: number; top: number } {
  const rect = Array.from(range.getClientRects()).find(clientRect => clientRect.width > 0 || clientRect.height > 0);
  const fallbackRect = range.getBoundingClientRect();
  const targetRect = rect ?? fallbackRect;

  return {
    left: clampNumber(targetRect.left + targetRect.width / 2, 128, window.innerWidth - 128),
    top: Math.max(56, targetRect.top - 10),
  };
}

export function getSpeechSelectionFromRange(
  root: HTMLElement,
  range: Range
): Pick<PreviewReadPopoverLike, "text" | "start" | "end"> | null {
  const { text, segments } = collectSpeechTextSegments(root);
  let selectionStart: number | null = null;
  let selectionEnd: number | null = null;

  for (const segment of segments) {
    const overlap = getTextNodeSelectionOverlap(range, segment.node);
    if (!overlap) continue;

    const start = segment.start + overlap.start;
    const end = segment.start + overlap.end;

    if (start >= end) continue;

    selectionStart ??= start;
    selectionEnd = end;
  }

  if (selectionStart === null || selectionEnd === null) return null;

  const normalizedSelection = normalizeSpeechSelectionRange(text, selectionStart, selectionEnd);
  if (!normalizedSelection) return null;

  return {
    ...normalizedSelection,
    text: text.slice(normalizedSelection.start, normalizedSelection.end).trim(),
  };
}

export function getSpeechSelectionFromSelectedText(
  root: HTMLElement,
  selectedText: string
): Pick<PreviewReadPopoverLike, "text" | "start" | "end"> | null {
  const speechText = collectSpeechTextSegments(root).text;
  const trimmedSelectedText = selectedText.trim();
  if (!trimmedSelectedText) return null;

  const exactIndex = speechText.indexOf(trimmedSelectedText);
  const normalizedIndex =
    exactIndex >= 0 ? exactIndex : findWhitespaceFlexibleTextIndex(speechText, trimmedSelectedText);

  if (normalizedIndex < 0) return null;

  const matchedText =
    exactIndex >= 0
      ? trimmedSelectedText
      : speechText.slice(normalizedIndex).match(new RegExp(buildWhitespaceFlexiblePattern(trimmedSelectedText)))?.[0];

  if (!matchedText) return null;

  const normalizedSelection = normalizeSpeechSelectionRange(
    speechText,
    normalizedIndex,
    normalizedIndex + matchedText.length
  );

  if (!normalizedSelection) return null;

  return {
    ...normalizedSelection,
    text: speechText.slice(normalizedSelection.start, normalizedSelection.end).trim(),
  };
}

export function getSentenceStartPoint(
  sentences: SpeechSentenceSegment[],
  startOffset: number
): { index: number; charOffset: number } | null {
  const containingSentenceIndex = sentences.findIndex(
    sentence => startOffset >= sentence.start && startOffset < sentence.end
  );
  const index =
    containingSentenceIndex >= 0
      ? containingSentenceIndex
      : sentences.findIndex(sentence => sentence.start >= startOffset);

  if (index < 0) return null;

  const sentence = sentences[index];

  return {
    index,
    charOffset: Math.max(0, startOffset - sentence.start),
  };
}

export function collectSpeechTextSegments(root: HTMLElement): { text: string; segments: SpeechTextNodeSegment[] } {
  const readableBlocks = getSpeechReadableBlocks(root);

  if (!readableBlocks.length) {
    return collectSpeechTextFromElement(root, null);
  }

  const segments: SpeechTextNodeSegment[] = [];
  let text = "";

  for (const block of readableBlocks) {
    const blockResult = collectSpeechTextFromElement(block, block);

    if (!blockResult.text.trim()) continue;

    if (text.length > 0) text += "\n\n";

    const offset = text.length;
    text += blockResult.text;
    segments.push(
      ...blockResult.segments.map(segment => ({
        ...segment,
        start: segment.start + offset,
        end: segment.end + offset,
      }))
    );
  }

  return { text, segments };
}

export function getFallbackSpeechTextFromSource(source: string): string {
  return source
    .replace(/^---[\s\S]*?---\s*/, " ")
    .replace(/(`{3,}|~{3,})[\s\S]*?\1/g, " ")
    .replace(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]/g, " ")
    .replace(/\$[^$\n]+\$/g, " ")
    .replace(/!\[[^\]]*]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)]\([^)]+\)/g, "$1")
    .replace(/[`*_~>#-]+/g, " ");
}

export function splitTextIntoSentences(text: string): SpeechSentenceSegment[] {
  const normalizedText = text.replace(/\u00a0/g, " ");
  const sentenceRegex = /[^\n.!?।]+(?:[.!?।]+["')\]]*|(?=\n|$))/g;
  const sentences: SpeechSentenceSegment[] = [];

  for (const match of normalizedText.matchAll(sentenceRegex)) {
    const rawText = match[0] ?? "";
    const rawStart = match.index ?? 0;

    const leadingWhitespaceLength = rawText.length - rawText.trimStart().length;
    const trailingWhitespaceLength = rawText.length - rawText.trimEnd().length;
    const sentenceText = rawText.trim();

    if (!sentenceText) continue;

    sentences.push({
      text: sentenceText,
      start: rawStart + leadingWhitespaceLength,
      end: rawStart + rawText.length - trailingWhitespaceLength,
    });
  }

  return sentences;
}

export function resolveWordBoundary(text: string, charIndex: number): { start: number; end: number } | null {
  if (!text) return null;

  let index = Math.min(Math.max(charIndex, 0), text.length - 1);

  if (!isWordCharacter(text[index] ?? "")) {
    let forward = index;

    while (forward < text.length && !isWordCharacter(text[forward] ?? "")) {
      forward += 1;
    }

    if (forward < text.length) {
      index = forward;
    } else {
      let backward = index;

      while (backward >= 0 && !isWordCharacter(text[backward] ?? "")) {
        backward -= 1;
      }

      if (backward < 0) return null;
      index = backward;
    }
  }

  let start = index;

  while (start > 0 && isWordCharacter(text[start - 1] ?? "")) {
    start -= 1;
  }

  let end = index + 1;

  while (end < text.length && isWordCharacter(text[end] ?? "")) {
    end += 1;
  }

  return start < end ? { start, end } : null;
}

export function findSegmentForOffset(segments: SpeechTextNodeSegment[], offset: number): SpeechTextNodeSegment | null {
  return segments.find(segment => offset >= segment.start && offset < segment.end) ?? null;
}

export function cancelBrowserSpeech() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
}

function findWhitespaceFlexibleTextIndex(text: string, query: string): number {
  const pattern = buildWhitespaceFlexiblePattern(query);
  if (!pattern) return -1;

  const match = new RegExp(pattern).exec(text);
  return match?.index ?? -1;
}

function buildWhitespaceFlexiblePattern(value: string): string {
  return value.trim().split(/\s+/).filter(Boolean).map(escapeRegex).join("\\s+");
}

function getTextNodeSelectionOverlap(range: Range, node: Text): { start: number; end: number } | null {
  if (!range.intersectsNode(node)) return null;

  const nodeLength = node.textContent?.length ?? 0;
  const start = range.startContainer === node ? range.startOffset : 0;
  const end = range.endContainer === node ? range.endOffset : nodeLength;

  return {
    start: clampNumber(start, 0, nodeLength),
    end: clampNumber(end, 0, nodeLength),
  };
}

function normalizeSpeechSelectionRange(
  text: string,
  start: number,
  end: number
): { start: number; end: number } | null {
  let nextStart = clampNumber(start, 0, text.length);
  let nextEnd = clampNumber(end, nextStart, text.length);

  while (nextStart < nextEnd && /\s/.test(text[nextStart] ?? "")) {
    nextStart += 1;
  }

  while (nextEnd > nextStart && /\s/.test(text[nextEnd - 1] ?? "")) {
    nextEnd -= 1;
  }

  const firstWord = resolveWordBoundary(text, nextStart);
  if (firstWord && firstWord.start < nextEnd) {
    nextStart = firstWord.start;
  }

  return nextStart < nextEnd ? { start: nextStart, end: nextEnd } : null;
}

function getSpeechReadableBlocks(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TTS_READABLE_BLOCK_SELECTOR)).filter(
    block => !shouldSkipTtsElement(block)
  );
}

function collectSpeechTextFromElement(
  root: HTMLElement,
  readableBlockRoot: HTMLElement | null
): { text: string; segments: SpeechTextNodeSegment[] } {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parentElement = node.parentElement;

      if (!parentElement || shouldSkipTtsElement(parentElement)) return NodeFilter.FILTER_REJECT;
      if (readableBlockRoot && isInsideNestedReadableBlock(readableBlockRoot, parentElement)) {
        return NodeFilter.FILTER_REJECT;
      }

      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const segments: SpeechTextNodeSegment[] = [];
  let text = "";
  let currentNode = walker.nextNode();

  while (currentNode) {
    const node = currentNode as Text;
    const value = normalizeSpeechTextValue(node.textContent ?? "");

    if (value.length > 0) {
      segments.push({
        node,
        start: text.length,
        end: text.length + value.length,
      });
      text += value;
    }

    currentNode = walker.nextNode();
  }

  return {
    text,
    segments,
  };
}

function shouldSkipTtsElement(element: Element): boolean {
  return Boolean(element.closest(TTS_SKIP_SELECTOR));
}

function isInsideNestedReadableBlock(readableBlockRoot: HTMLElement, element: Element): boolean {
  const nearestReadableBlock = element.closest(TTS_READABLE_BLOCK_SELECTOR);
  return Boolean(nearestReadableBlock && nearestReadableBlock !== readableBlockRoot);
}

function normalizeSpeechTextValue(value: string): string {
  return value.replace(/\u00a0/g, " ");
}

function isWordCharacter(value: string): boolean {
  return /[\p{L}\p{N}'’-]/u.test(value);
}

function isInsideElement(target: EventTarget | null, element: Element | null): boolean {
  return Boolean(element && target instanceof Node && element.contains(target));
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
