import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TodoList } from "./TodoList";
import { AddTodoForm } from "./AddTodoForm";
import { ClipboardList } from "lucide-react";
import type { Todo } from "@/hooks/useTodos";

interface TodoPanelProps {
  todos: Todo[];
  loading: boolean;
  activeTodoId: string | null;
  onSelect: (todo: Todo) => void;
  onAdd: (content: string, estimationMinutes: number) => void;
  onDelete: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
}

export function TodoPanel({
  todos,
  loading,
  activeTodoId,
  onSelect,
  onAdd,
  onDelete,
  onToggleDone,
}: TodoPanelProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="gap-2 w-full max-w-xs">
          <ClipboardList className="h-4 w-4" />
          Todos ({todos.filter((t) => !t.done).length})
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle>Meine Aufgaben</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-4 overflow-hidden h-full">
          <AddTodoForm onAdd={onAdd} />
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-center text-sm text-muted-foreground py-8">Laden...</p>
            ) : (
              <TodoList
                todos={todos}
                activeTodoId={activeTodoId}
                onSelect={onSelect}
                onDelete={onDelete}
                onToggleDone={onToggleDone}
              />
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
