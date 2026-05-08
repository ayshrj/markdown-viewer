"use client";

import { Search } from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { ButtonTooltip } from "./studio-controls";

type FindBarProps = {
  findInput: string;
  replaceQuery: string;
  findPending: boolean;
  findMatchCount: number;
  activeFindPosition: number;
  findCaseSensitive: boolean;
  onFindInputChange: (value: string) => void;
  onReplaceQueryChange: (value: string) => void;
  onFindKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  onCaseSensitiveChange: (value: boolean) => void;
  onMoveSelection: (direction: 1 | -1) => void;
  onReplaceAll: () => void;
  onClose: () => void;
};

export function FindBar({
  findInput,
  replaceQuery,
  findPending,
  findMatchCount,
  activeFindPosition,
  findCaseSensitive,
  onFindInputChange,
  onReplaceQueryChange,
  onFindKeyDown,
  onCaseSensitiveChange,
  onMoveSelection,
  onReplaceAll,
  onClose,
}: FindBarProps) {
  return (
    <div
      data-find-bar="true"
      className="flex flex-wrap items-center gap-2 border-b border-(--line) bg-(--panel-muted) px-4 py-2"
    >
      <Search aria-hidden size={13} className="shrink-0 text-(--muted-soft)" />
      <input
        autoFocus
        value={findInput}
        onChange={e => onFindInputChange(e.target.value)}
        onKeyDown={onFindKeyDown}
        placeholder="Find..."
        aria-label="Find text"
        className="text-foreground focus:border-accent h-7 min-w-30 flex-1 rounded-md border border-(--line-strong) bg-(--panel) px-2.5 text-xs outline-none"
      />
      <input
        value={replaceQuery}
        onChange={e => onReplaceQueryChange(e.target.value)}
        onKeyDown={onFindKeyDown}
        placeholder="Replace with..."
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
      <ButtonTooltip label={findCaseSensitive ? "Case-sensitive find" : "Case-insensitive find"}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={findCaseSensitive}
          onClick={() => onCaseSensitiveChange(!findCaseSensitive)}
          className={cn(
            "h-7 shrink-0 rounded-md px-2.5 text-xs font-bold shadow-none transition",
            findCaseSensitive
              ? "border-accent text-foreground bg-(--accent-soft) hover:bg-(--panel-sunken)"
              : "text-muted hover:text-foreground border-(--line) bg-transparent hover:bg-(--panel-sunken)"
          )}
        >
          Aa
        </Button>
      </ButtonTooltip>
      <ButtonTooltip label="Previous match">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onMoveSelection(-1)}
          disabled={findPending || !findMatchCount}
          className="text-muted hover:text-foreground h-7 shrink-0 rounded-md border-(--line) bg-transparent px-2.5 text-xs font-bold shadow-none transition hover:bg-(--panel-sunken) disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </Button>
      </ButtonTooltip>
      <ButtonTooltip label="Next match">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onMoveSelection(1)}
          disabled={findPending || !findMatchCount}
          className="text-muted hover:text-foreground h-7 shrink-0 rounded-md border-(--line) bg-transparent px-2.5 text-xs font-bold shadow-none transition hover:bg-(--panel-sunken) disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </Button>
      </ButtonTooltip>
      <ButtonTooltip label="Replace every current match">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReplaceAll}
          disabled={findPending || !findInput.trim() || findMatchCount === 0}
          className="border-accent text-foreground h-7 shrink-0 rounded-md bg-(--accent-soft) px-3 text-xs font-bold shadow-none transition hover:bg-(--panel-sunken) disabled:cursor-not-allowed disabled:opacity-40"
        >
          Replace all
        </Button>
      </ButtonTooltip>
      <ButtonTooltip label="Close find and replace">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="text-muted hover:text-foreground h-7 shrink-0 rounded-md border-(--line) bg-transparent px-2.5 text-xs font-bold shadow-none transition hover:bg-(--panel-sunken)"
        >
          Close
        </Button>
      </ButtonTooltip>
    </div>
  );
}
