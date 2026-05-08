"use client";

import { Volume2 } from "lucide-react";

import { Button } from "@/components/ui/button";

import { ButtonTooltip } from "./studio-controls";

type PreviewReadPopoverState = {
  text: string;
  start: number | null;
  end: number | null;
  left: number;
  top: number;
};

type PreviewReadPopoverProps = {
  popover: PreviewReadPopoverState;
  canReadSelection: boolean;
  onStartFromHere: () => void;
  onReadSelection: () => void;
};

export function PreviewReadPopover({
  popover,
  canReadSelection,
  onStartFromHere,
  onReadSelection,
}: PreviewReadPopoverProps) {
  return (
    <div
      data-preview-read-popover="true"
      role="dialog"
      aria-label="Read selected preview text"
      onMouseDown={event => event.preventDefault()}
      className="text-foreground fixed z-50 flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-lg border border-(--line-strong) bg-(--panel) p-1 text-xs shadow-lg"
      style={{ left: `${popover.left}px`, top: `${popover.top}px` }}
      title={popover.text}
    >
      <span className="text-muted flex items-center gap-1 px-2 font-bold">
        <Volume2 aria-hidden size={13} />
        Read
      </span>
      <ButtonTooltip label="Read from the selected text to the end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onStartFromHere}
          disabled={!canReadSelection}
          className="text-muted hover:text-foreground h-7 rounded-md border-(--line) bg-transparent px-2.5 text-xs font-bold shadow-none hover:bg-(--panel-sunken) disabled:cursor-not-allowed disabled:opacity-45"
        >
          Start from here
        </Button>
      </ButtonTooltip>
      <ButtonTooltip label="Read only the selected text">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReadSelection}
          disabled={!canReadSelection}
          className="border-accent text-foreground h-7 rounded-md bg-(--accent-soft) px-2.5 text-xs font-bold shadow-none hover:bg-(--panel-sunken) disabled:cursor-not-allowed disabled:opacity-45"
        >
          Read selection
        </Button>
      </ButtonTooltip>
    </div>
  );
}

export type { PreviewReadPopoverState };
