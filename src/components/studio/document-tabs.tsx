"use client";

import { Pencil } from "lucide-react";
import type { DragEvent as ReactDragEvent, SyntheticEvent } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getDocumentLabel, type SessionDocument } from "@/lib/markdown-studio-documents";
import { cn } from "@/lib/utils";

import { ButtonTooltip } from "./studio-controls";

type DocumentTabsProps = {
  documents: SessionDocument[];
  activeDocumentId: string;
  draggedDocumentId: string | null;
  dropTargetDocumentId: string | null;
  renamePopoverOpen: boolean;
  renameValue: string;
  onActiveDocumentChange: (documentId: string) => void;
  onRenamePopoverOpenChange: (open: boolean) => void;
  onRenameValueChange: (value: string) => void;
  onRenameSubmit: (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => void;
  onRemoveDocument: (documentId: string) => void;
  onDocumentDragStart: (event: ReactDragEvent<HTMLDivElement>, documentId: string) => void;
  onDocumentDragOver: (event: ReactDragEvent<HTMLDivElement>, documentId: string) => void;
  onDocumentDrop: (event: ReactDragEvent<HTMLDivElement>, documentId: string) => void;
  onDocumentDragEnd: () => void;
};

export function DocumentTabs({
  documents,
  activeDocumentId,
  draggedDocumentId,
  dropTargetDocumentId,
  renamePopoverOpen,
  renameValue,
  onActiveDocumentChange,
  onRenamePopoverOpenChange,
  onRenameValueChange,
  onRenameSubmit,
  onRemoveDocument,
  onDocumentDragStart,
  onDocumentDragOver,
  onDocumentDrop,
  onDocumentDragEnd,
}: DocumentTabsProps) {
  return (
    <div className="document-strip flex items-center gap-2 border-b border-(--line) bg-(--panel) px-3 py-2">
      <div className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto" aria-label="Open markdown documents">
        {documents.map((document, index) => (
          <div
            key={document.id}
            draggable
            onDragEnd={onDocumentDragEnd}
            onDragOver={event => onDocumentDragOver(event, document.id)}
            onDragStart={event => onDocumentDragStart(event, document.id)}
            onDrop={event => onDocumentDrop(event, document.id)}
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
            <ButtonTooltip label={`Open ${getDocumentLabel(document, index)}`}>
              <button
                type="button"
                onClick={() => onActiveDocumentChange(document.id)}
                className="min-w-0 flex-1 truncate px-2.5 py-1.5 text-left"
                aria-current={document.id === activeDocumentId ? "page" : undefined}
              >
                {getDocumentLabel(document, index)}
              </button>
            </ButtonTooltip>
            <ButtonTooltip label={`Close ${getDocumentLabel(document, index)}`}>
              <button
                type="button"
                onClick={() => onRemoveDocument(document.id)}
                draggable={false}
                className="hover:text-foreground rounded px-1.5 py-1.5 text-(--muted-soft) opacity-80 transition hover:bg-(--panel-sunken) sm:opacity-0 sm:group-hover:opacity-100"
                aria-label={`Close ${getDocumentLabel(document, index)}`}
              >
                &times;
              </button>
            </ButtonTooltip>
          </div>
        ))}
      </div>
      <Popover open={renamePopoverOpen} onOpenChange={onRenamePopoverOpenChange}>
        <Tooltip>
          <PopoverTrigger asChild>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-muted hover:text-foreground min-h-8 shrink-0 rounded-md border-(--line-strong) bg-transparent px-2.5 text-xs font-bold shadow-none hover:bg-(--panel-sunken)"
              >
                <Pencil aria-hidden size={13} />
                Rename
              </Button>
            </TooltipTrigger>
          </PopoverTrigger>
          <TooltipContent sideOffset={8}>Rename active document</TooltipContent>
        </Tooltip>
        <PopoverContent
          align="end"
          className="text-foreground w-[min(18rem,calc(100vw-2rem))] rounded-lg border border-(--line-strong) bg-(--panel) p-3 text-xs shadow-lg"
        >
          <form onSubmit={onRenameSubmit} role="dialog" aria-label="Rename active markdown document">
            <label className="block font-bold tracking-[0.08em] text-(--muted-soft) uppercase">Document name</label>
            <input
              value={renameValue}
              onChange={event => onRenameValueChange(event.target.value)}
              className="text-foreground focus:border-accent mt-2 w-full rounded-md border border-(--line-strong) bg-(--panel-muted) px-2.5 py-2 text-sm outline-none"
              autoFocus
            />
            <div className="mt-3 flex justify-end gap-2">
              <ButtonTooltip label="Cancel rename">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onRenamePopoverOpenChange(false)}
                  className="text-muted hover:text-foreground rounded-md border-(--line) bg-transparent px-2.5 py-1.5 font-bold shadow-none hover:bg-(--panel-sunken)"
                >
                  Cancel
                </Button>
              </ButtonTooltip>
              <ButtonTooltip label="Save document name">
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="border-accent text-foreground rounded-md bg-(--accent-soft) px-2.5 py-1.5 font-bold shadow-none hover:bg-(--panel-sunken)"
                >
                  Save
                </Button>
              </ButtonTooltip>
            </div>
          </form>
        </PopoverContent>
      </Popover>
    </div>
  );
}
