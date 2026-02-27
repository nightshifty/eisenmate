import { useState } from "react";
import type { Todo } from "@/lib/storage";
import type { QuadrantConfig } from "./quadrant-config";
import { EisenhowerTodoItem } from "./EisenhowerTodoItem";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface QuadrantCardProps {
  config: QuadrantConfig;
  todos: Todo[];
  onDelete: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
  onEdit: (todo: Todo) => void;
  onDragStart: (e: React.DragEvent, todoId: string) => void;
  onDrop: (e: React.DragEvent) => void;
}

export function QuadrantCard({
  config,
  todos,
  onDelete,
  onToggleDone,
  onEdit,
  onDragStart,
  onDrop,
}: QuadrantCardProps) {
  const { t } = useTranslation();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only trigger if leaving the card itself, not a child
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop(e);
  };

  const openTodos = todos.filter((t) => !t.done);
  const doneTodos = todos.filter((t) => t.done);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col rounded-xl border-2 p-3 transition-colors min-h-[200px]",
        config.bgClass,
        isDragOver ? config.dropBorderClass : config.borderClass,
        isDragOver && "ring-2 ring-offset-1 ring-offset-background",
      )}
    
    >
      <div className="mb-3">
        <h3 className={cn("text-sm font-bold", config.colorClass)}>{t(config.labelKey)}</h3>
        <p className="text-xs text-muted-foreground">{t(config.subtitleKey)}</p>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {openTodos.map((todo) => (
          <EisenhowerTodoItem
            key={todo.id}
            todo={todo}
            onDelete={onDelete}
            onToggleDone={onToggleDone}
            onEdit={onEdit}
            onDragStart={onDragStart}
          />
        ))}

        {doneTodos.length > 0 && (
          <>
            {openTodos.length > 0 && <div className="border-t border-dashed my-2" />}
            {doneTodos.map((todo) => (
              <EisenhowerTodoItem
                key={todo.id}
                todo={todo}
                onDelete={onDelete}
                onToggleDone={onToggleDone}
                onEdit={onEdit}
                onDragStart={onDragStart}
              />
            ))}
          </>
        )}

        {todos.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            {t("eisenhower.dragHere")}
          </p>
        )}
      </div>
    </div>
  );
}
