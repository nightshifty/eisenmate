import { Button } from "@/components/ui/button";
import { Trash2, Clock, Check, Pencil, GripVertical } from "lucide-react";
import type { Todo } from "@/lib/storage";
import { cn } from "@/lib/utils";

interface EisenhowerTodoItemProps {
  todo: Todo;
  onDelete: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDragStart: (e: React.DragEvent, todoId: string) => void;
}

export function EisenhowerTodoItem({
  todo,
  onDelete,
  onToggleDone,
  onEdit,
  onDragStart,
}: EisenhowerTodoItemProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, todo.id)}
      className={cn(
        "group flex items-center gap-2 rounded-md border bg-card p-2 cursor-grab active:cursor-grabbing transition-colors",
        todo.done && "opacity-50",
      )}
    >
      <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 group-hover:text-muted-foreground" />

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => onToggleDone(todo.id, !todo.done)}
      >
        <Check className={cn("h-3.5 w-3.5", todo.done ? "text-green-500" : "text-muted-foreground")} />
      </Button>

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium truncate", todo.done && "line-through text-muted-foreground")}>
          {todo.content}
        </p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-2.5 w-2.5" />
          <span>{todo.timeSpentMinutes}/{todo.estimationMinutes} Min.</span>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => onEdit(todo)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(todo.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
