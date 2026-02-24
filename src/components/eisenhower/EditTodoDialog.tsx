import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Todo, EisenhowerQuadrant } from "@/lib/storage";
import { QUADRANT_OPTIONS } from "./quadrant-config";

interface EditTodoDialogProps {
  todo: Todo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (todoId: string, patch: { content?: string; estimationMinutes?: number; quadrant?: EisenhowerQuadrant | null }) => void;
}

function EditForm({ todo, onSave, onCancel }: {
  todo: Todo;
  onSave: (todoId: string, patch: { content?: string; estimationMinutes?: number; quadrant?: EisenhowerQuadrant | null }) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState(todo.content);
  const [estimation, setEstimation] = useState(String(todo.estimationMinutes));
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant | "">(todo.quadrant ?? "");

  const handleSave = () => {
    if (!content.trim()) return;
    onSave(todo.id, {
      content: content.trim(),
      estimationMinutes: parseInt(estimation, 10) || 25,
      quadrant: quadrant === "" ? null : quadrant,
    });
  };

  return (
    <>
      <div className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label htmlFor="edit-content">Aufgabe</Label>
          <Input
            id="edit-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Aufgabe beschreiben..."
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="edit-estimation">Schätzung (Minuten)</Label>
          <Input
            id="edit-estimation"
            type="number"
            min={1}
            max={999}
            value={estimation}
            onChange={(e) => setEstimation(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="edit-quadrant">Quadrant</Label>
          <select
            id="edit-quadrant"
            value={quadrant}
            onChange={(e) => setQuadrant(e.target.value as EisenhowerQuadrant | "")}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
          >
            <option value="">Unsortiert</option>
            {QUADRANT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button onClick={handleSave} disabled={!content.trim()}>
          Speichern
        </Button>
      </DialogFooter>
    </>
  );
}

export function EditTodoDialog({ todo, open, onOpenChange, onSave }: EditTodoDialogProps) {
  const handleSave = (todoId: string, patch: { content?: string; estimationMinutes?: number; quadrant?: EisenhowerQuadrant | null }) => {
    onSave(todoId, patch);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Aufgabe bearbeiten</DialogTitle>
          <DialogDescription>
            Bearbeite den Namen, die Zeitschätzung und den Quadranten.
          </DialogDescription>
        </DialogHeader>

        {todo && (
          <EditForm
            key={todo.id}
            todo={todo}
            onSave={handleSave}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
