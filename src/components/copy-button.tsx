"use client";

import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

type CopyButtonProps = {
  copied: boolean;
  onClick: () => void | Promise<void>;
};

export function CopyButton({ copied, onClick }: CopyButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      className="min-h-8 gap-2 rounded-md border-[var(--line-strong)] bg-transparent px-2.5 text-[0.7rem] font-bold text-[var(--muted)] shadow-none hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
    >
      {copied ? <Check aria-hidden size={14} /> : <Copy aria-hidden size={14} />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
