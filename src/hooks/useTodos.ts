import { useState, useCallback, useEffect } from "react";
import { getTodos, saveTodos, generateId, addDeletedTodoId, type Todo, type EisenhowerQuadrant } from "@/lib/storage";

export type { Todo } from "@/lib/storage";
export type { EisenhowerQuadrant } from "@/lib/storage";

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(() => getTodos());

  const addTodo = useCallback((content: string, estimationMinutes: number, quadrant: EisenhowerQuadrant | null = null) => {
    setTodos(prev => {
      const now = new Date().toISOString();
      const updated = [
        {
          id: generateId(),
          content,
          estimationMinutes,
          timeSpentMinutes: 0,
          done: false,
          createdAt: now,
          completedAt: null,
          quadrant,
          updatedAt: now,
        },
        ...prev,
      ];
      saveTodos(updated);
      return updated;
    });
  }, []);

  const deleteTodo = useCallback((todoId: string) => {
    addDeletedTodoId(todoId);
    setTodos(prev => {
      const updated = prev.filter((t) => t.id !== todoId);
      saveTodos(updated);
      return updated;
    });
  }, []);

  const trackTime = useCallback((todoId: string, minutes: number) => {
    setTodos(prev => {
      const now = new Date().toISOString();
      const updated = prev.map((t) =>
        t.id === todoId ? { ...t, timeSpentMinutes: t.timeSpentMinutes + minutes, updatedAt: now } : t,
      );
      saveTodos(updated);
      return updated;
    });
  }, []);

  const toggleDone = useCallback((todoId: string, done: boolean) => {
    setTodos(prev => {
      const now = new Date().toISOString();
      const updated = prev.map((t) =>
        t.id === todoId ? { ...t, done, completedAt: done ? now : null, updatedAt: now } : t,
      );
      saveTodos(updated);
      return updated;
    });
  }, []);

  const updateTodo = useCallback((todoId: string, patch: Partial<Pick<Todo, "content" | "estimationMinutes" | "quadrant">>) => {
    setTodos(prev => {
      const now = new Date().toISOString();
      const updated = prev.map((t) =>
        t.id === todoId ? { ...t, ...patch, updatedAt: now } : t,
      );
      saveTodos(updated);
      return updated;
    });
  }, []);

  const refreshTodos = useCallback(() => {
    setTodos(getTodos());
  }, []);

  // Auto-refresh when sync completes
  useEffect(() => {
    const handler = () => refreshTodos();
    window.addEventListener("eisenmate-sync-complete", handler);
    return () => window.removeEventListener("eisenmate-sync-complete", handler);
  }, [refreshTodos]);

  return { todos, loading: false, addTodo, deleteTodo, trackTime, toggleDone, updateTodo, refreshTodos };
}
