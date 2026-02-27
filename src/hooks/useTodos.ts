import { useState, useCallback, useEffect } from "react";
import { getTodos, saveTodos, generateId, type Todo, type EisenhowerQuadrant } from "@/lib/storage";
import { SYNC_UPDATE_EVENT } from "@/lib/sync-types";

export type { Todo } from "@/lib/storage";
export type { EisenhowerQuadrant } from "@/lib/storage";

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(() => getTodos());

  // Re-read from storage when sync engine updates data
  useEffect(() => {
    const handleSyncUpdate = () => {
      setTodos(getTodos());
    };
    window.addEventListener(SYNC_UPDATE_EVENT, handleSyncUpdate);
    return () => window.removeEventListener(SYNC_UPDATE_EVENT, handleSyncUpdate);
  }, []);

  const addTodo = useCallback((content: string, estimationMinutes: number, quadrant: EisenhowerQuadrant | null = null) => {
    const now = Date.now();
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
        updatedAt: now,
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
    const now = Date.now();
    const updated = getTodos().map((t) =>
      t.id === todoId ? { ...t, timeSpentMinutes: t.timeSpentMinutes + minutes, updatedAt: now } : t,
    );
    saveTodos(updated);
    setTodos(updated);
  }, []);

  const toggleDone = useCallback((todoId: string, done: boolean) => {
    const now = Date.now();
    const updated = getTodos().map((t) =>
      t.id === todoId ? { ...t, done, completedAt: done ? new Date().toISOString() : null, updatedAt: now } : t,
    );
    saveTodos(updated);
    setTodos(updated);
  }, []);

  const updateTodo = useCallback((todoId: string, patch: Partial<Pick<Todo, "content" | "estimationMinutes" | "quadrant">>) => {
    const now = Date.now();
    const updated = getTodos().map((t) =>
      t.id === todoId ? { ...t, ...patch, updatedAt: now } : t,
    );
    saveTodos(updated);
    setTodos(updated);
  }, []);

  const refreshTodos = useCallback(() => {
    setTodos(getTodos());
  }, []);

  return { todos, loading: false, addTodo, deleteTodo, trackTime, toggleDone, updateTodo, refreshTodos };
}
