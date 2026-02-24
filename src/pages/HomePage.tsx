import { useState, useCallback } from "react";
import { PomodoroTimer } from "@/components/timer/PomodoroTimer";
import { TodoPanel } from "@/components/todos/TodoPanel";
import type { Todo } from "@/hooks/useTodos";
import type { EisenhowerQuadrant } from "@/lib/storage";
import { getTimerState, getTodos } from "@/lib/storage";
import type { TimerStatus } from "@/hooks/useTimer";

type CombinedTimerStatus = TimerStatus | "break";

function getRestoredTodo(): Todo | null {
  const saved = getTimerState();
  if (!saved?.activeTodoId) return null;
  return getTodos().find((t) => t.id === saved.activeTodoId) ?? null;
}

interface HomePageProps {
  todos: Todo[];
  todosLoading: boolean;
  addTodo: (content: string, estimationMinutes: number, quadrant?: EisenhowerQuadrant | null) => void;
  deleteTodo: (todoId: string) => void;
  trackTime: (todoId: string, minutes: number) => void;
  toggleDone: (todoId: string, done: boolean) => void;
  pomodoroMinutes: number;
  breakMinutes: number;
  overtimeMaxMinutes: number;
  overtimeChimeIntervalMinutes: number;
  allowEarlyFinish: boolean;
  addSession: (session: { todoId: string | null; todoContent: string; durationMinutes: number; completedAt: string }) => void;
  onTimerRunningChange: (running: boolean) => void;
}

export function HomePage({
  todos,
  todosLoading,
  addTodo,
  deleteTodo,
  trackTime,
  toggleDone,
  pomodoroMinutes,
  breakMinutes,
  overtimeMaxMinutes,
  overtimeChimeIntervalMinutes,
  allowEarlyFinish,
  addSession,
  onTimerRunningChange,
}: HomePageProps) {
  const [activeTodo, setActiveTodo] = useState<Todo | null>(getRestoredTodo);
  const [, setTimerStatus] = useState<CombinedTimerStatus>("idle");

  const handleSelectTodo = (todo: Todo) => {
    setActiveTodo((prev) => (prev?.id === todo.id ? null : todo));
  };

  const handlePomodoroComplete = useCallback(() => {
    if (activeTodo) {
      trackTime(activeTodo.id, pomodoroMinutes);
    }
  }, [activeTodo, pomodoroMinutes, trackTime]);

  const handleEarlyFinish = useCallback((elapsedMinutes: number) => {
    if (activeTodo && elapsedMinutes > 0) {
      trackTime(activeTodo.id, elapsedMinutes);
    }

    addSession({
      todoId: activeTodo?.id ?? null,
      todoContent: activeTodo?.content ?? "Kein Todo",
      durationMinutes: elapsedMinutes,
      completedAt: new Date().toISOString(),
    });
  }, [activeTodo, trackTime, addSession]);

  const handleOvertimeStop = useCallback((overtimeMinutes: number) => {
    if (activeTodo && overtimeMinutes > 0) {
      trackTime(activeTodo.id, overtimeMinutes);
    }

    addSession({
      todoId: activeTodo?.id ?? null,
      todoContent: activeTodo?.content ?? "Kein Todo",
      durationMinutes: pomodoroMinutes + overtimeMinutes,
      completedAt: new Date().toISOString(),
    });
  }, [activeTodo, pomodoroMinutes, trackTime, addSession]);

  const handleStatusChange = useCallback((status: CombinedTimerStatus) => {
    setTimerStatus(status);
    onTimerRunningChange(status !== "idle" && status !== "completed");
  }, [onTimerRunningChange]);

  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-8">
      <PomodoroTimer
        pomodoroMinutes={pomodoroMinutes}
        breakMinutes={breakMinutes}
        overtimeMaxMinutes={overtimeMaxMinutes}
        overtimeChimeIntervalMinutes={overtimeChimeIntervalMinutes}
        allowEarlyFinish={allowEarlyFinish}
        activeTodo={activeTodo}
        onPomodoroComplete={handlePomodoroComplete}
        onEarlyFinish={handleEarlyFinish}
        onOvertimeStop={handleOvertimeStop}
        onStatusChange={handleStatusChange}
      />

      <TodoPanel
        todos={todos}
        loading={todosLoading}
        activeTodoId={activeTodo?.id ?? null}
        onSelect={handleSelectTodo}
        onAdd={addTodo}
        onDelete={deleteTodo}
        onToggleDone={toggleDone}
      />
    </main>
  );
}
