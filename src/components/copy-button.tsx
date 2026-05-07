"use client";

import { Check, Copy } from "lucide-react";

type CopyButtonProps = {
  copied: boolean;
  onClick: () => void | Promise<void>;
};

export function CopyButton({ copied, onClick }: CopyButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-8 items-center gap-2 rounded-md border border-[var(--line-strong)] px-2.5 text-[0.7rem] font-bold transition hover:bg-[var(--panel-sunken)] hover:text-[var(--text)]"
    >
      {copied ? <Check aria-hidden size={14} /> : <Copy aria-hidden size={14} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
