"use client";

/* eslint-disable @next/next/no-img-element */

import { Globe } from "lucide-react";
import { type MouseEvent, type ReactNode, useState } from "react";

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { useLinkPreview } from "@/hooks/use-link-preview";

type LinkPreviewCardProps = {
  href: string;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
  title?: string;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function LinkPreviewCard({ href, children, className, target, rel, title, onClick }: LinkPreviewCardProps) {
  const [open, setOpen] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);
  const { data, isLoading, isError } = useLinkPreview(href, open);

  return (
    <HoverCard open={open} onOpenChange={setOpen}>
      <HoverCardTrigger href={href} target={target} rel={rel} title={title} className={className} onClick={onClick}>
        {children}
      </HoverCardTrigger>
      <HoverCardContent className="w-72">
        {isLoading && (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <Globe className="size-3.5 animate-pulse" />
            Loading preview...
          </div>
        )}
        {isError && <p className="text-muted-foreground text-xs">Couldn&apos;t load a preview for this link.</p>}
        {data && (
          <div className="flex gap-3">
            {data.favicon && !faviconFailed ? (
              <img
                src={data.favicon}
                alt=""
                className="mt-0.5 size-8 shrink-0 rounded"
                onError={() => setFaviconFailed(true)}
              />
            ) : (
              <Globe className="text-muted-foreground mt-0.5 size-8 shrink-0 rounded" />
            )}
            <div className="min-w-0 space-y-0.5">
              <p className="line-clamp-2 text-sm font-semibold">{data.title ?? href}</p>
              {data.description && <p className="text-muted-foreground line-clamp-2 text-xs">{data.description}</p>}
              <p className="text-muted-foreground truncate text-xs">{hostnameOf(data.finalUrl) ?? href}</p>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
