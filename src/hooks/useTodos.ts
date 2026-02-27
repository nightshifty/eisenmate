import { useState, useCallback } from "react";
import { getTodos, saveTodos, generateId, type Todo, type EisenhowerQuadrant } from "@/lib/storage";

export type { Todo } from "@/lib/storage";
export type { EisenhowerQuadrant } from "@/lib/storage";

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(() => getTodos());

  const addTodo = useCallback((content: string, estimationMinutes: number, quadrant: EisenhowerQuadrant | null = null) => {
    setTodos(prev => {
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
        ...prev,
      ];
      saveTodos(updated);
      return updated;
    });
  }, []);

  const deleteTodo = useCallback((todoId: string) => {
    setTodos(prev => {
      const updated = prev.filter((t) => t.id !== todoId);
      saveTodos(updated);
      return updated;
    });
  }, []);

  const trackTime = useCallback((todoId: string, minutes: number) => {
    setTodos(prev => {
      const updated = prev.map((t) =>
        t.id === todoId ? { ...t, timeSpentMinutes: t.timeSpentMinutes + minutes } : t,
      );
      saveTodos(updated);
      return updated;
    });
  }, []);

  const toggleDone = useCallback((todoId: string, done: boolean) => {
    setTodos(prev => {
      const updated = prev.map((t) =>
        t.id === todoId ? { ...t, done, completedAt: done ? new Date().toISOString() : null } : t,
      );
      saveTodos(updated);
      return updated;
    });
  }, []);

  const updateTodo = useCallback((todoId: string, patch: Partial<Pick<Todo, "content" | "estimationMinutes" | "quadrant">>) => {
    setTodos(prev => {
      const updated = prev.map((t) =>
        t.id === todoId ? { ...t, ...patch } : t,
      );
      saveTodos(updated);
      return updated;
    });
  }, []);

  const refreshTodos = useCallback(() => {
    setTodos(getTodos());
  }, []);

  return { todos, loading: false, addTodo, deleteTodo, trackTime, toggleDone, updateTodo, refreshTodos };
}
