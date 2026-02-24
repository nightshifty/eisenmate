import type { Todo, EisenhowerQuadrant } from "@/lib/storage";
import { QUADRANTS } from "./quadrant-config";
import { QuadrantCard } from "./QuadrantCard";

interface EisenhowerMatrixProps {
  todos: Todo[];
  onDelete: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
  onEdit: (todo: Todo) => void;
  onUpdateQuadrant: (todoId: string, quadrant: EisenhowerQuadrant | null) => void;
  dragTodoId: string | null;
  onDragStart: (e: React.DragEvent, todoId: string) => void;
  onDragEnd: () => void;
}

export function EisenhowerMatrix({
  todos,
  onDelete,
  onToggleDone,
  onEdit,
  onUpdateQuadrant,
  dragTodoId,
  onDragStart,
  onDragEnd,
}: EisenhowerMatrixProps) {
  const handleDrop = (quadrant: EisenhowerQuadrant) => (e: React.DragEvent) => {
    e.preventDefault();
    const todoId = e.dataTransfer.getData("text/plain") || dragTodoId;
    if (todoId) {
      onUpdateQuadrant(todoId, quadrant);
    }
    onDragEnd();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 flex-1 min-h-0">
      {QUADRANTS.map((config) => (
        <QuadrantCard
          key={config.key}
          config={config}
          todos={todos.filter((t) => t.quadrant === config.key)}
          onDelete={onDelete}
          onToggleDone={onToggleDone}
          onEdit={onEdit}
          onDragStart={onDragStart}
          onDrop={handleDrop(config.key)}
        />
      ))}
    </div>
  );
}
