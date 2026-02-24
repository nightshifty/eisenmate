import { useState, useCallback } from "react";
import { EisenhowerMatrix } from "@/components/eisenhower/EisenhowerMatrix";
import { UnsortedTodos } from "@/components/eisenhower/UnsortedTodos";
import { EditTodoDialog } from "@/components/eisenhower/EditTodoDialog";
import { AddTodoWithQuadrant } from "@/components/eisenhower/AddTodoWithQuadrant";
import type { Todo, EisenhowerQuadrant } from "@/lib/storage";

interface EisenhowerPageProps {
  todos: Todo[];
  addTodo: (content: string, estimationMinutes: number, quadrant?: EisenhowerQuadrant | null) => void;
  deleteTodo: (id: string) => void;
  toggleDone: (id: string, done: boolean) => void;
  updateTodo: (todoId: string, patch: Partial<Pick<Todo, "content" | "estimationMinutes" | "quadrant">>) => void;
}

export function EisenhowerPage({
  todos,
  addTodo,
  deleteTodo,
  toggleDone,
  updateTodo,
}: EisenhowerPageProps) {
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [dragTodoId, setDragTodoId] = useState<string | null>(null);

  const unsortedTodos = todos.filter((t) => t.quadrant === null);

  const handleEdit = useCallback((todo: Todo) => {
    setEditTodo(todo);
    setEditOpen(true);
  }, []);

  const handleSave = useCallback(
    (todoId: string, patch: { content?: string; estimationMinutes?: number; quadrant?: EisenhowerQuadrant | null }) => {
      updateTodo(todoId, patch);
    },
    [updateTodo],
  );

  const handleUpdateQuadrant = useCallback(
    (todoId: string, quadrant: EisenhowerQuadrant | null) => {
      updateTodo(todoId, { quadrant });
    },
    [updateTodo],
  );

  const handleDragStart = useCallback((e: React.DragEvent, todoId: string) => {
    e.dataTransfer.setData("text/plain", todoId);
    e.dataTransfer.effectAllowed = "move";
    setDragTodoId(todoId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragTodoId(null);
  }, []);

  const handleDropUnsorted = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const todoId = e.dataTransfer.getData("text/plain") || dragTodoId;
      if (todoId) {
        handleUpdateQuadrant(todoId, null);
      }
      handleDragEnd();
    },
    [dragTodoId, handleUpdateQuadrant, handleDragEnd],
  );

  return (
    <main className="flex-1 flex flex-col gap-4 px-4 py-6 max-w-5xl mx-auto w-full min-h-0" onDragEnd={handleDragEnd}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-lg font-bold">Eisenhower-Matrix</h1>
      </div>

      <AddTodoWithQuadrant onAdd={addTodo} />

      <UnsortedTodos
        todos={unsortedTodos}
        onDelete={deleteTodo}
        onToggleDone={toggleDone}
        onEdit={handleEdit}
        onDragStart={handleDragStart}
        onDrop={handleDropUnsorted}
      />

      <EisenhowerMatrix
        todos={todos}
        onDelete={deleteTodo}
        onToggleDone={toggleDone}
        onEdit={handleEdit}
        onUpdateQuadrant={handleUpdateQuadrant}
        dragTodoId={dragTodoId}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      />

      <EditTodoDialog
        todo={editTodo}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={handleSave}
      />
    </main>
  );
}
