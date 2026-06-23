"use client";

import { TriangleAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";

import { CopyButton } from "@/components/copy-button";
import { ZoomableContainer } from "@/components/zoomable-container";

type MermaidBlockProps = {
  code: string;
};

export function MermaidBlock({ code }: MermaidBlockProps) {
  const { resolvedTheme } = useTheme();
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;

    async function renderDiagram() {
      setSvg("");
      setError(null);

      try {
        const mermaidModule = await import("mermaid");
        const mermaid = mermaidModule.default;
        const renderId = `mermaid-${uid}-${Date.now()}`;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: resolvedTheme === "dark" ? "dark" : "default",
        });

        const result = await mermaid.render(renderId, code);

        if (active) {
          setSvg(result.svg);
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Diagram render failed");
        }
      }
    }

    renderDiagram();

    return () => {
      active = false;
    };
  }, [code, resolvedTheme, uid]);

  async function copyDiagram() {
    if (!navigator.clipboard) {
      return;
    }

    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <figure className="overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--panel)]">
      <figcaption className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2 text-xs tracking-[0.14em] text-[var(--muted)] uppercase">
        <span>Mermaid</span>
        <CopyButton copied={copied} onClick={copyDiagram} />
      </figcaption>
      {error ? (
        <div className="flex gap-3 p-4 text-sm text-[var(--danger)]">
          <TriangleAlert aria-hidden className="mt-0.5 shrink-0" size={18} />
          <div>
            <p className="font-black">This Mermaid diagram could not be rendered.</p>
            <pre className="mt-2 max-h-56 overflow-auto rounded-xl border border-[var(--line)] bg-[var(--accent-soft)] p-3 font-mono text-xs text-[var(--text)]">
              {error}
            </pre>
          </div>
        </div>
      ) : svg ? (
        <ZoomableContainer
          modalTitle="Mermaid Diagram"
          modalContent={
            <div className="flex h-full min-h-0 items-center justify-center p-6">
              <div className="mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
          }
        >
          <div className="mermaid p-4" dangerouslySetInnerHTML={{ __html: svg }} />
        </ZoomableContainer>
      ) : (
        <div className="p-4 text-sm text-[var(--muted)]">Rendering diagram...</div>
      )}
    </figure>
  );
}
