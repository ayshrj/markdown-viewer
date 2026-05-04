"use client";

import { Check, Copy, TriangleAlert } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useId, useState } from "react";

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
    <figure className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel-strong)]">
      <figcaption className="flex items-center justify-between border-b border-[var(--line)] px-4 py-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
        <span>Mermaid</span>
        <button
          type="button"
          onClick={copyDiagram}
          className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--line)] px-3 text-[0.7rem] font-black transition hover:bg-[var(--accent-soft)]"
        >
          {copied ? <Check aria-hidden size={14} /> : <Copy aria-hidden size={14} />}
          {copied ? "Copied" : "Copy"}
        </button>
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
        <div
          className="mermaid overflow-x-auto p-4"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="p-4 text-sm text-[var(--muted)]">Rendering diagram...</div>
      )}
    </figure>
  );
}
