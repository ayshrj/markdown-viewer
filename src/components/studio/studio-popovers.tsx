"use client";

import { AlignLeft, Gauge, Target, Type } from "lucide-react";
import type { SyntheticEvent } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { ButtonTooltip } from "./studio-controls";

export const FONT_SIZE_MIN = 11;
export const FONT_SIZE_MAX = 22;
export const FONT_SIZE_DEFAULT = 15;
export const TTS_RATE_MIN = 0.7;
export const TTS_RATE_MAX = 1.8;
export const TTS_RATE_DEFAULT = 1;
export const TTS_RATE_STEP = 0.1;

export function FontSizePopover({ fontSize, onChange }: { fontSize: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-muted hover:text-foreground min-h-8 gap-1.5 rounded-md border-(--line-strong) bg-transparent px-2.5 text-xs font-bold whitespace-nowrap shadow-none hover:bg-(--panel-sunken)"
            >
              <Type aria-hidden size={13} />
              {fontSize}px
            </Button>
          </TooltipTrigger>
        </PopoverTrigger>
        <TooltipContent sideOffset={8}>Change editor and preview font size</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        className="text-foreground w-52 rounded-lg border border-(--line-strong) bg-(--panel) p-3 text-xs shadow-lg"
        role="dialog"
        aria-label="Font size"
      >
        <p className="mb-2 font-bold tracking-[0.08em] text-(--muted-soft) uppercase">Font size</p>
        <div className="flex items-center gap-2">
          <ButtonTooltip label="Decrease font size">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => onChange(Math.max(FONT_SIZE_MIN, fontSize - 1))}
              className="text-muted h-7 w-7 rounded-md border-(--line) bg-transparent text-sm font-bold shadow-none hover:bg-(--panel-sunken)"
              aria-label="Decrease font size"
            >
              -
            </Button>
          </ButtonTooltip>
          <Slider
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            step={1}
            value={[fontSize]}
            onValueChange={([nextFontSize]) => {
              if (typeof nextFontSize === "number") onChange(nextFontSize);
            }}
            className="**:data-[slot=slider-range]:bg-accent **:data-[slot=slider-thumb]:border-accent flex-1 **:data-[slot=slider-thumb]:bg-(--panel) **:data-[slot=slider-track]:bg-(--panel-sunken)"
            aria-label="Font size slider"
          />
          <ButtonTooltip label="Increase font size">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => onChange(Math.min(FONT_SIZE_MAX, fontSize + 1))}
              className="text-muted h-7 w-7 rounded-md border-(--line) bg-transparent text-sm font-bold shadow-none hover:bg-(--panel-sunken)"
              aria-label="Increase font size"
            >
              +
            </Button>
          </ButtonTooltip>
        </div>
        <div className="mt-2 flex justify-between text-[0.68rem] text-(--muted-soft)">
          <span>{FONT_SIZE_MIN}px</span>
          <span className="text-foreground font-bold">{fontSize}px</span>
          <span>{FONT_SIZE_MAX}px</span>
        </div>
        <ButtonTooltip label="Reset font size to default">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(FONT_SIZE_DEFAULT)}
            className="text-muted hover:text-foreground mt-2 w-full rounded-md border-(--line) bg-transparent py-1 shadow-none transition hover:bg-(--panel-sunken)"
          >
            Reset to default ({FONT_SIZE_DEFAULT}px)
          </Button>
        </ButtonTooltip>
      </PopoverContent>
    </Popover>
  );
}

export function TtsRatePopover({ rate, onChange }: { rate: number; onChange: (v: number) => void }) {
  return (
    <Popover>
      <Tooltip>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-muted hover:text-foreground min-h-8 gap-1.5 rounded-md border-(--line-strong) bg-transparent px-2.5 text-xs font-bold whitespace-nowrap shadow-none hover:bg-(--panel-sunken)"
            >
              <Gauge aria-hidden size={13} />
              {formatTtsRate(rate)}
            </Button>
          </TooltipTrigger>
        </PopoverTrigger>
        <TooltipContent sideOffset={8}>Adjust reading speed</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        className="text-foreground w-56 rounded-lg border border-(--line-strong) bg-(--panel) p-3 text-xs shadow-lg"
        role="dialog"
        aria-label="Text-to-speech speed"
      >
        <p className="mb-1 font-bold tracking-[0.08em] text-(--muted-soft) uppercase">Reading speed</p>
        <p className="text-muted mb-3 text-[0.72rem]">Applies to the next spoken sentence.</p>
        <Slider
          min={TTS_RATE_MIN}
          max={TTS_RATE_MAX}
          step={TTS_RATE_STEP}
          value={[rate]}
          onValueChange={([nextRate]) => {
            if (typeof nextRate === "number") onChange(clampTtsRate(nextRate));
          }}
          className="**:data-[slot=slider-range]:bg-accent **:data-[slot=slider-thumb]:border-accent **:data-[slot=slider-thumb]:bg-(--panel) **:data-[slot=slider-track]:bg-(--panel-sunken)"
          aria-label="Text-to-speech speed slider"
        />
        <div className="mt-2 flex justify-between text-[0.68rem] text-(--muted-soft)">
          <span>{formatTtsRate(TTS_RATE_MIN)}</span>
          <span className="text-foreground font-bold">{formatTtsRate(rate)}</span>
          <span>{formatTtsRate(TTS_RATE_MAX)}</span>
        </div>
        <ButtonTooltip label="Reset reading speed to normal">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(TTS_RATE_DEFAULT)}
            className="text-muted hover:text-foreground mt-3 w-full rounded-md border-(--line) bg-transparent py-1 shadow-none transition hover:bg-(--panel-sunken)"
          >
            Reset to normal ({formatTtsRate(TTS_RATE_DEFAULT)})
          </Button>
        </ButtonTooltip>
      </PopoverContent>
    </Popover>
  );
}

export function WidthPopover({ maxWidth, onChange }: { maxWidth: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState(String(maxWidth));

  const PRESETS = [
    { label: "640", value: 640 },
    { label: "800", value: 800 },
    { label: "1180", value: 1180 },
    { label: "Full", value: 99999 },
  ];

  function applyCustom(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    const num = parseInt(customValue.trim());
    if (Number.isFinite(num) && num > 0) {
      onChange(num);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-muted hover:text-foreground min-h-8 gap-1.5 rounded-md border-(--line-strong) bg-transparent px-2.5 text-xs font-bold whitespace-nowrap shadow-none hover:bg-(--panel-sunken)"
            >
              <AlignLeft aria-hidden size={13} />
              Width
            </Button>
          </TooltipTrigger>
        </PopoverTrigger>
        <TooltipContent sideOffset={8}>Set content max width</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        className="text-foreground w-[min(14rem,calc(100vw-2rem))] rounded-lg border border-(--line-strong) bg-(--panel) p-3 text-xs shadow-lg"
        role="dialog"
        aria-label="Set content max width"
      >
        <p className="mb-2 font-bold tracking-[0.08em] text-(--muted-soft) uppercase">Max content width</p>
        <div className="mb-2 grid grid-cols-2 gap-1.5">
          {PRESETS.map(preset => (
            <ButtonTooltip key={preset.value} label={`Set max width to ${preset.label}`}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange(preset.value);
                  setCustomValue(preset.value >= 99999 ? "full" : String(preset.value));
                  setOpen(false);
                }}
                className={cn(
                  "rounded-md border px-2 py-1.5 text-center font-bold shadow-none transition",
                  maxWidth === preset.value
                    ? "border-accent text-foreground bg-(--accent-soft)"
                    : "text-muted hover:text-foreground border-(--line) bg-transparent hover:border-(--line-strong) hover:bg-transparent"
                )}
              >
                {preset.label}
                {preset.value === 1180 && <span className="ml-1 font-normal opacity-50">default</span>}
              </Button>
            </ButtonTooltip>
          ))}
        </div>
        <form onSubmit={applyCustom} className="flex gap-1.5">
          <input
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            placeholder="e.g. 960"
            className="text-foreground focus:border-accent min-w-0 flex-1 rounded-md border border-(--line-strong) bg-(--panel-muted) px-2 py-1.5 text-sm outline-none"
          />
          <ButtonTooltip label="Apply custom width">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-accent text-foreground rounded-md bg-(--accent-soft) px-2.5 font-bold shadow-none transition hover:bg-(--panel-sunken)"
            >
              Set
            </Button>
          </ButtonTooltip>
        </form>
      </PopoverContent>
    </Popover>
  );
}

export function WordGoalPopover({ wordGoal, onChange }: { wordGoal: number; onChange: (v: number) => void }) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(wordGoal > 0 ? String(wordGoal) : "");

  function handleSubmit(e: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault();
    const num = parseInt(inputValue.trim());
    if (!inputValue.trim() || num <= 0) {
      onChange(0);
      setOpen(false);
      return;
    }
    if (Number.isFinite(num) && num > 0) {
      onChange(num);
      setOpen(false);
    }
  }

  const QUICK_GOALS = [100, 250, 500, 1000];

  return (
    <Popover
      open={open}
      onOpenChange={nextOpen => {
        if (nextOpen) setInputValue(wordGoal > 0 ? String(wordGoal) : "");
        setOpen(nextOpen);
      }}
    >
      <Tooltip>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "min-h-8 gap-1.5 rounded-md border px-2.5 text-xs font-bold whitespace-nowrap shadow-none transition",
                wordGoal > 0
                  ? "border-accent text-foreground bg-(--accent-soft) hover:bg-(--panel-sunken)"
                  : "text-muted hover:text-foreground border-(--line-strong) bg-transparent hover:bg-(--panel-sunken)"
              )}
            >
              <Target aria-hidden size={13} />
              Goal
            </Button>
          </TooltipTrigger>
        </PopoverTrigger>
        <TooltipContent sideOffset={8}>Set writing word goal</TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        className="text-foreground w-[min(14rem,calc(100vw-2rem))] rounded-lg border border-(--line-strong) bg-(--panel) p-3 text-xs shadow-lg"
        role="dialog"
        aria-label="Set word goal"
      >
        <p className="mb-2 font-bold tracking-[0.08em] text-(--muted-soft) uppercase">Word goal</p>
        <div className="mb-2 grid grid-cols-4 gap-1">
          {QUICK_GOALS.map(g => (
            <ButtonTooltip key={g} label={`Set word goal to ${g}`}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onChange(g);
                  setInputValue(String(g));
                  setOpen(false);
                }}
                className={cn(
                  "rounded-md border py-1 text-center font-bold shadow-none transition",
                  wordGoal === g
                    ? "border-accent text-foreground bg-(--accent-soft)"
                    : "text-muted hover:text-foreground border-(--line) bg-transparent hover:border-(--line-strong) hover:bg-transparent"
                )}
              >
                {g}
              </Button>
            </ButtonTooltip>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="flex gap-1.5">
          <input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Custom..."
            type="number"
            min={1}
            className="text-foreground focus:border-accent min-w-0 flex-1 rounded-md border border-(--line-strong) bg-(--panel-muted) px-2 py-1.5 text-sm outline-none"
          />
          <ButtonTooltip label="Apply custom word goal">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="border-accent text-foreground rounded-md bg-(--accent-soft) px-2.5 font-bold shadow-none transition hover:bg-(--panel-sunken)"
            >
              Set
            </Button>
          </ButtonTooltip>
        </form>
        {wordGoal > 0 && (
          <ButtonTooltip label="Clear word goal">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onChange(0);
                setInputValue("");
                setOpen(false);
              }}
              className="text-muted mt-2 w-full rounded-md border-(--line) bg-transparent py-1 shadow-none transition hover:bg-(--panel-sunken) hover:text-(--danger)"
            >
              Clear goal
            </Button>
          </ButtonTooltip>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function clampTtsRate(value: number) {
  return clampNumber(Number(value.toFixed(1)), TTS_RATE_MIN, TTS_RATE_MAX);
}

export function formatTtsRate(value: number) {
  return `${value.toFixed(1)}x`;
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
