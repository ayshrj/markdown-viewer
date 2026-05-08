"use client";

import { FileText } from "lucide-react";
import { memo } from "react";

import { MarkdownRenderer } from "@/components/markdown-renderer";

type PreviewContentProps = {
  hasContent: boolean;
  source: string;
  onCodeLanguageSelect: (fenceStartOffset: number, language: string) => void;
  onLinkClick: (href: string) => boolean;
};

export const PreviewContent = memo(function PreviewContent({
  hasContent,
  source,
  onCodeLanguageSelect,
  onLinkClick,
}: PreviewContentProps) {
  if (!hasContent) {
    return (
      <div className="text-muted grid min-h-80 place-items-center text-center text-sm">
        <div>
          <FileText aria-hidden className="mx-auto mb-3 text-(--muted-soft)" size={34} />
          <p className="text-foreground font-bold">Nothing to preview yet</p>
          <p className="mt-1">Write or upload markdown to begin.</p>
        </div>
      </div>
    );
  }

  return <MarkdownRenderer content={source} onCodeLanguageSelect={onCodeLanguageSelect} onLinkClick={onLinkClick} />;
});
