import { useMemo } from "react";
import { TodoItem } from "./TodoItem";
import type { Todo } from "@/hooks/useTodos";
import { getQuadrantPriority } from "@/lib/quadrant";
import { useTranslation } from "react-i18next";

interface TodoListProps {
  todos: Todo[];
  activeTodoId: string | null;
  onSelect: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
}

export function TodoList({ todos, activeTodoId, onSelect, onDelete, onToggleDone }: TodoListProps) {
  const { t } = useTranslation();
  const sortedTodos = useMemo(
    () => [...todos].sort((a, b) => getQuadrantPriority(a.quadrant) - getQuadrantPriority(b.quadrant)),
    [todos],
  );

  if (sortedTodos.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        {t("todos.noTasks")}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {sortedTodos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          isActive={todo.id === activeTodoId}
          onSelect={onSelect}
          onDelete={onDelete}
          onToggleDone={onToggleDone}
        />
      ))}
    </div>
  );
}
