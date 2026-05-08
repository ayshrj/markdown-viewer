"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function IconButton({
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
    <ButtonTooltip label={label}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onClick}
        aria-label={label}
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
    </ButtonTooltip>
  );
}

export function ButtonTooltip({
  label,
  children,
  side = "top",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  side?: React.ComponentProps<typeof TooltipContent>["side"];
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export function MobileToolbarSheet({
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

export function MobileSheetRow({
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
    <ButtonTooltip label={label} side="left">
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
    </ButtonTooltip>
  );
}
