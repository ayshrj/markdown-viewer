import { useCallback } from "react";
import { toast } from "sonner";

export function useUndoToast() {
  return useCallback((message: string, undo: () => void, description?: string) => {
    toast(message, {
      description,
      action: {
        label: "Undo",
        onClick: undo,
      },
    });
  }, []);
}
