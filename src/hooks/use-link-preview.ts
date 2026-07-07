"use client";

import { useQuery } from "@tanstack/react-query";

export type LinkPreviewData = {
  title: string | null;
  description: string | null;
  favicon: string | null;
  finalUrl: string;
};

async function fetchLinkPreview(url: string): Promise<LinkPreviewData> {
  const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    throw new Error("Failed to load link preview");
  }
  return res.json();
}

/**
 * Fetches link-preview metadata for `url`, cached by React Query so the same
 * link across the app is only ever fetched once per staleTime window instead
 * of on every hover.
 */
export function useLinkPreview(url: string, enabled: boolean) {
  return useQuery({
    queryKey: ["link-preview", url],
    queryFn: () => fetchLinkPreview(url),
    enabled: enabled && Boolean(url),
  });
}
