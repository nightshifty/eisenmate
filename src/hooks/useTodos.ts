import { useState, useCallback } from "react";
import { getTodos, saveTodos, generateId, type Todo, type EisenhowerQuadrant } from "@/lib/storage";

export type { Todo } from "@/lib/storage";
export type { EisenhowerQuadrant } from "@/lib/storage";

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(() => getTodos());

  const addTodo = useCallback((content: string, estimationMinutes: number, quadrant: EisenhowerQuadrant | null = null) => {
    const updated = [
      {
        id: generateId(),
        content,
        estimationMinutes,
        timeSpentMinutes: 0,
        done: false,
        createdAt: new Date().toISOString(),
        completedAt: null,
        quadrant,
      },
      ...getTodos(),
    ];
    saveTodos(updated);
    setTodos(updated);
  }, []);

  const deleteTodo = useCallback((todoId: string) => {
    const updated = getTodos().filter((t) => t.id !== todoId);
    saveTodos(updated);
    setTodos(updated);
  }, []);

  const trackTime = useCallback((todoId: string, minutes: number) => {
    const updated = getTodos().map((t) =>
      t.id === todoId ? { ...t, timeSpentMinutes: t.timeSpentMinutes + minutes } : t,
    );
    saveTodos(updated);
    setTodos(updated);
  }, []);

  const toggleDone = useCallback((todoId: string, done: boolean) => {
    const updated = getTodos().map((t) =>
      t.id === todoId ? { ...t, done, completedAt: done ? new Date().toISOString() : null } : t,
    );
    saveTodos(updated);
    setTodos(updated);
  }, []);

  const updateTodo = useCallback((todoId: string, patch: Partial<Pick<Todo, "content" | "estimationMinutes" | "quadrant">>) => {
    const updated = getTodos().map((t) =>
      t.id === todoId ? { ...t, ...patch } : t,
    );
    saveTodos(updated);
    setTodos(updated);
  }, []);

  return { todos, loading: false, addTodo, deleteTodo, trackTime, toggleDone, updateTodo };
}
