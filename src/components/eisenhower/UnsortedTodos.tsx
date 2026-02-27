import { useState } from "react";
import { ChevronDown, ChevronRight, Inbox } from "lucide-react";
import type { Todo } from "@/lib/storage";
import { EisenhowerTodoItem } from "./EisenhowerTodoItem";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface UnsortedTodosProps {
  todos: Todo[];
  onDelete: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDragStart: (e: React.DragEvent, todoId: string) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function UnsortedTodos({
  todos,
  onDelete,
  onToggleDone,
  onEdit,
  onDragStart,
  onDrop,
}: UnsortedTodosProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e);
  };

  if (todos.length === 0) return null;

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "rounded-xl border-2 border-dashed p-3 transition-colors",
        isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/20",
      )}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left"
      >
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <Inbox className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{t("eisenhower.unsorted")}</span>
        <span className="text-xs text-muted-foreground">({todos.length})</span>
      </button>

      {isOpen && (
        <div className="mt-3 space-y-1.5">
          {todos.map((todo) => (
            <EisenhowerTodoItem
              key={todo.id}
              todo={todo}
              onDelete={onDelete}
              onToggleDone={onToggleDone}
              onEdit={onEdit}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}
