import { Button } from "@/components/ui/button";
import { Trash2, Clock, Check } from "lucide-react";
import type { Todo } from "@/hooks/useTodos";
import { cn } from "@/lib/utils";

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
