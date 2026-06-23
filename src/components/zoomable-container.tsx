"use client";

import { Maximize2, Minus, Pin, PinOff, Plus, RotateCcw, X } from "lucide-react";
import { Dialog as RadixDialog } from "radix-ui";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ZoomState = { scale: number; x: number; y: number };

const RESET: ZoomState = { scale: 1, x: 0, y: 0 };
const MIN_SCALE = 0.1;
const MAX_SCALE = 20;

function applyZoom(prev: ZoomState, newScale: number, originX: number, originY: number): ZoomState {
  const scale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
  const ratio = scale / prev.scale;
  return {
    scale,
    x: originX - ratio * (originX - prev.x),
    y: originY - ratio * (originY - prev.y),
  };
}

type ZoomableContainerProps = {
  children: ReactNode;
  className?: string;
  /** Content shown in the modal (defaults to children) */
  modalContent?: ReactNode;
  modalTitle?: string;
  /** Hide the expand-to-modal button — used when already inside the modal */
  showExpand?: boolean;
  /** Render as "span" for inline (image) contexts to avoid div-in-p nesting */
  as?: "div" | "span";
};

export function ZoomableContainer({
  children,
  className,
  modalContent,
  modalTitle,
  showExpand = true,
  as: Tag = "div",
}: ZoomableContainerProps) {
  const [zoom, setZoom] = useState<ZoomState>(RESET);
  const [isPinned, setIsPinned] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<any>(null);
  const dragRef = useRef({ active: false, startX: 0, startY: 0, panX: 0, panY: 0 });
  const pinchRef = useRef<{ dist: number; scale: number } | null>(null);

  const isZoomed = zoom.scale !== 1 || zoom.x !== 0 || zoom.y !== 0;

  // Wheel zoom — non-passive so we can call preventDefault
  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (isPinned) return;
      e.preventDefault();
      const el = containerRef.current;
      if (!el) return;
      const { left, top } = el.getBoundingClientRect();
      const delta = -e.deltaY * 0.002;
      setZoom(prev => applyZoom(prev, prev.scale * (1 + delta), e.clientX - left, e.clientY - top));
    },
    [isPinned]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  // Non-passive touchmove for pinch-to-zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2 || !pinchRef.current) return;
      e.preventDefault();
      const { left, top } = el.getBoundingClientRect();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dx = t0.clientX - t1.clientX;
      const dy = t0.clientY - t1.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const midX = (t0.clientX + t1.clientX) / 2 - left;
      const midY = (t0.clientY + t1.clientY) / 2 - top;
      setZoom(prev => applyZoom(prev, pinchRef.current!.scale * (dist / pinchRef.current!.dist), midX, midY));
    }
    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", handleTouchMove);
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    if (zoom.scale <= 1) return;
    e.preventDefault();
    dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, panX: zoom.x, panY: zoom.y };
    setIsDragging(true);
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setZoom(prev => ({ ...prev, x: dragRef.current.panX + dx, y: dragRef.current.panY + dy }));
  }

  function stopDrag() {
    dragRef.current.active = false;
    setIsDragging(false);
  }

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.sqrt(dx * dx + dy * dy), scale: zoom.scale };
    }
  }

  function zoomToCenter(factor: number) {
    const el = containerRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setZoom(prev => applyZoom(prev, prev.scale * factor, width / 2, height / 2));
  }

  const controls = (
    <div className="pointer-events-auto absolute right-2 bottom-2 z-10 flex items-center gap-0.5 rounded-lg border border-[var(--line)] bg-[var(--panel)]/90 p-0.5 shadow-lg backdrop-blur-sm">
      <ZBtn onClick={() => zoomToCenter(1 / 1.25)} title="Zoom out (−25%)">
        <Minus size={11} />
      </ZBtn>
      <span
        className="px-1 text-center text-[10px] text-[var(--muted)] tabular-nums select-none"
        style={{ minWidth: "2.8rem" }}
      >
        {Math.round(zoom.scale * 100)}%
      </span>
      <ZBtn onClick={() => zoomToCenter(1.25)} title="Zoom in (+25%)">
        <Plus size={11} />
      </ZBtn>
      {isZoomed && (
        <ZBtn onClick={() => setZoom(RESET)} title="Reset zoom & pan">
          <RotateCcw size={11} />
        </ZBtn>
      )}
      <div className="mx-0.5 h-3 w-px bg-[var(--line)]" />
      <ZBtn onClick={() => setIsPinned(p => !p)} title={isPinned ? "Unpin controls" : "Pin controls"} active={isPinned}>
        {isPinned ? <PinOff size={11} /> : <Pin size={11} />}
      </ZBtn>
      {showExpand && (
        <ZBtn onClick={() => setIsModalOpen(true)} title="Open in modal">
          <Maximize2 size={11} />
        </ZBtn>
      )}
    </div>
  );

  const containerStyle: React.CSSProperties = {
    cursor: isDragging ? "grabbing" : zoom.scale > 1 ? "grab" : "default",
    ...(Tag === "span" ? { display: "block" } : {}),
  };

  const innerStyle: React.CSSProperties = {
    transform: `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.scale})`,
    transformOrigin: "0 0",
    ...(Tag === "span" ? { display: "block" } : {}),
  };

  return (
    <>
      <Tag
        ref={containerRef}
        className={cn("relative overflow-hidden", className)}
        style={containerStyle}
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => {
          stopDrag();
          if (!isPinned) setShowControls(false);
        }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={stopDrag}
        onTouchStart={onTouchStart}
        onTouchEnd={() => {
          pinchRef.current = null;
        }}
      >
        <Tag style={innerStyle}>{children}</Tag>
        {(showControls || isPinned) && controls}
      </Tag>

      {showExpand && (
        <RadixDialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
          <RadixDialog.Portal>
            <RadixDialog.Overlay className="data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-black/70 backdrop-blur-sm duration-150" />
            <RadixDialog.Content
              aria-label={modalTitle ?? "Media viewer"}
              className="data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed inset-3 z-50 flex flex-col overflow-hidden rounded-xl bg-[var(--panel)] ring-1 ring-[var(--line)] duration-150 outline-none"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] bg-[var(--panel-muted)] px-4 py-2">
                <span className="text-xs font-medium tracking-[0.1em] text-[var(--muted)] uppercase">
                  {modalTitle ?? "Preview"}
                </span>
                <RadixDialog.Close className="rounded p-1 text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text)]">
                  <X size={14} />
                </RadixDialog.Close>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <ZoomableContainer showExpand={false} className="h-full w-full">
                  {modalContent ?? children}
                </ZoomableContainer>
              </div>
            </RadixDialog.Content>
          </RadixDialog.Portal>
        </RadixDialog.Root>
      )}
    </>
  );
}

function ZBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded text-[var(--muted)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--text)]",
        active && "bg-[var(--accent-soft)] text-[var(--text)]"
      )}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}
