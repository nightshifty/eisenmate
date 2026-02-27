import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TodoList } from "./TodoList";
import { AddTodoForm } from "./AddTodoForm";
import { ClipboardList, ChevronDown, Check, X } from "lucide-react";
import { useState } from "react";
import type { Todo } from "@/hooks/useTodos";
import { cn } from "@/lib/utils";

interface TodoPanelProps {
  todos: Todo[];
  loading: boolean;
  activeTodo: Todo | null;
  disabled?: boolean;
  onSelect: (todo: Todo) => void;
  onDeselect: () => void;
  onAdd: (content: string, estimationMinutes: number) => void;
  onDelete: (id: string) => void;
  onToggleDone: (id: string, done: boolean) => void;
}

export function TodoPanel({
  todos,
  loading,
  activeTodo,
  disabled = false,
  onSelect,
  onDeselect,
  onAdd,
  onDelete,
  onToggleDone,
}: TodoPanelProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (todo: Todo) => {
    onSelect(todo);
    setOpen(false);
  };

  // When disabled with an active task: show a static, non-interactive display
  if (disabled && activeTodo) {
    return (
      <div
        className="w-full rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5 text-left opacity-75"
      >
        <div className="flex items-center gap-2.5">
          <Check className="h-4 w-4 shrink-0 text-primary" />
          <p className="min-w-0 flex-1 text-sm font-medium truncate text-foreground">{activeTodo.content}</p>
        </div>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full rounded-lg border px-3 py-2.5 text-left transition-colors cursor-pointer",
            activeTodo
              ? "border-primary bg-primary/5 hover:bg-primary/10"
              : "border-dashed border-muted-foreground/30 hover:border-muted-foreground/50 hover:bg-muted/50",
          )}
        >
          {activeTodo ? (
            <div className="flex items-center gap-2.5">
              <Check className="h-4 w-4 shrink-0 text-primary" />
              <p className="min-w-0 flex-1 text-sm font-medium truncate text-foreground">{activeTodo.content}</p>
              <button
                type="button"
                className="shrink-0 rounded-sm p-0.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeselect();
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <ClipboardList className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm text-muted-foreground">Aufgabe auswählen...</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </div>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[70vh]">
        <SheetHeader>
          <SheetTitle>Meine Aufgaben</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-4 mt-4 overflow-hidden h-full px-4">
          <AddTodoForm onAdd={onAdd} />
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <p className="text-center text-sm text-muted-foreground py-8">Laden...</p>
            ) : (
              <TodoList
                todos={todos}
                activeTodoId={activeTodo?.id ?? null}
                onSelect={handleSelect}
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
