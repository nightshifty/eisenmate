import { TodoItem } from "./TodoItem";
import type { Todo } from "@/hooks/useTodos";

interface TodoListProps {
  todos: Todo[];
  activeTodoId: string | null;
  onSelect: (todo: Todo) => void;
  onDelete: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
}

export function TodoList({ todos, activeTodoId, onSelect, onDelete, onToggleDone }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground py-8">
        Noch keine Aufgaben. Erstelle eine neue!
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {todos.map((todo) => (
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
