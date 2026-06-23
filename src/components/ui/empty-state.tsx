import { Inbox } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex min-h-20 flex-col items-center justify-center gap-2 px-4 py-5 text-center", className)}>
      <div className="bg-muted/40 text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full border">
        <Inbox className="h-4 w-4" />
      </div>
      <div className="space-y-1">
        <div className="text-foreground text-sm font-medium">{title}</div>
        {description && <div className="text-muted-foreground mx-auto max-w-xl text-xs">{description}</div>}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
