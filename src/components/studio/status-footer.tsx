"use client";

import { cn } from "@/lib/utils";

type StatusFooterProps = {
  words: number;
  characters: number;
  lineCount: number;
  readingMinutes: number;
  documentCount: number;
  filename: string | undefined;
  savedStatus: "saved" | "unsaved";
  wordGoal: number;
  wordGoalPercent: number;
  wordGoalDone: boolean;
};

export function StatusFooter({
  words,
  characters,
  lineCount,
  readingMinutes,
  documentCount,
  filename,
  savedStatus,
  wordGoal,
  wordGoalPercent,
  wordGoalDone,
}: StatusFooterProps) {
  return (
    <footer className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-(--line) bg-(--panel-muted) px-4 py-1.5 text-[0.7rem] text-(--muted-soft)">
      <span>{words.toLocaleString()} words</span>
      <span>{characters.toLocaleString()} chars</span>
      <span>{lineCount.toLocaleString()} lines</span>
      <span>~{readingMinutes} min read</span>
      <span>{documentCount.toLocaleString()} docs open</span>
      <span className="min-w-0 truncate">{filename ?? "Local draft"}</span>

      <span
        className={cn(
          "ml-auto flex items-center gap-1 transition-opacity duration-300",
          savedStatus === "saved" ? "opacity-60" : "opacity-100"
        )}
      >
        <span
          className={cn(
            "inline-block h-1.5 w-1.5 rounded-full",
            savedStatus === "saved" ? "bg-green-500" : "bg-amber-400"
          )}
        />
        {savedStatus === "saved" ? "Saved" : "Unsaved"}
      </span>

      {wordGoal > 0 && (
        <span className={cn("flex items-center gap-1.5", wordGoalDone && "text-green-600")}>
          <span
            className="relative inline-block h-1.5 w-16 overflow-hidden rounded-full bg-(--line)"
            title={`${words} / ${wordGoal} words`}
          >
            <span
              className={cn(
                "absolute inset-y-0 left-0 rounded-full transition-all",
                wordGoalDone ? "bg-green-500" : "bg-accent"
              )}
              style={{ width: `${wordGoalPercent}%` }}
            />
          </span>
          {wordGoalDone ? "Goal reached!" : `${words} / ${wordGoal}`}
        </span>
      )}
    </footer>
  );
}
