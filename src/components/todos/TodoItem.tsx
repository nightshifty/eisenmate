import { Button } from "@/components/ui/button";
import { Trash2, Clock, Check } from "lucide-react";
import type { Todo } from "@/hooks/useTodos";
import type { EisenhowerQuadrant } from "@/lib/storage";
import { cn } from "@/lib/utils";

const QUADRANT_CHIP: Partial<Record<EisenhowerQuadrant, { label: string; className: string }>> = {
  "urgent-important": {
    label: "wichtig & dringend",
    className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  },
  "not-urgent-important": {
    label: "wichtig",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  "urgent-not-important": {
    label: "dringend",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
};

interface TodoItemProps {
  todo: Todo;
  isActive: boolean;
  onSelect: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
}

export function TodoItem({ todo, isActive, onSelect, onDelete, onToggleDone }: TodoItemProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-lg border p-3 cursor-pointer transition-colors",
        isActive && "border-primary bg-primary/5",
        todo.done && "opacity-60",
      )}
      onClick={() => !todo.done && onSelect(todo)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone(todo.id, !todo.done);
          }}
        >
          <Check className={cn("h-4 w-4", todo.done ? "text-green-500" : "text-muted-foreground")} />
        </Button>
        <div className="min-w-0 flex-1">
          <p className={cn("text-sm font-medium truncate", todo.done && "line-through")}>
            {todo.content}
          </p>
           <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {todo.timeSpentMinutes}/{todo.estimationMinutes} Min.
            </span>
            {todo.quadrant && QUADRANT_CHIP[todo.quadrant] && (
              <span
                className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none ${QUADRANT_CHIP[todo.quadrant]!.className}`}
              >
                {QUADRANT_CHIP[todo.quadrant]!.label}
              </span>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(todo.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
