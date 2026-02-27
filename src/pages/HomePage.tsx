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
  silentMode?: boolean;
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
  silentMode,
  addSession,
  onTimerRunningChange,
}: HomePageProps) {
  const [activeTodo, setActiveTodo] = useState<Todo | null>(getRestoredTodo);
  const [, setTimerStatus] = useState<CombinedTimerStatus>("idle");

  const handleSelectTodo = (todo: Todo) => {
    setActiveTodo((prev) => (prev?.id === todo.id ? null : todo));
  };

  const handleToggleDone = useCallback((todoId: string, done: boolean) => {
    toggleDone(todoId, done);
    // When a task is marked as done and it's the active task, deselect it
    if (done && activeTodo?.id === todoId) {
      setActiveTodo(null);
    }
  }, [toggleDone, activeTodo]);

  const handlePomodoroComplete = useCallback((effectivePomodoroMinutes: number) => {
    if (activeTodo) {
      trackTime(activeTodo.id, effectivePomodoroMinutes);
    }
  }, [activeTodo, trackTime]);

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

  const handleOvertimeStop = useCallback((overtimeMinutes: number, effectivePomodoroMinutes: number) => {
    if (activeTodo && overtimeMinutes > 0) {
      trackTime(activeTodo.id, overtimeMinutes);
    }

    addSession({
      todoId: activeTodo?.id ?? null,
      todoContent: activeTodo?.content ?? "Kein Todo",
      durationMinutes: effectivePomodoroMinutes + overtimeMinutes,
      completedAt: new Date().toISOString(),
    });
  }, [activeTodo, trackTime, addSession]);

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
        silentMode={silentMode}
        activeTodo={activeTodo}
        onPomodoroComplete={handlePomodoroComplete}
        onEarlyFinish={handleEarlyFinish}
        onOvertimeStop={handleOvertimeStop}
        onToggleDone={handleToggleDone}
        onStatusChange={handleStatusChange}
      />

      <TodoPanel
        todos={todos}
        loading={todosLoading}
        activeTodo={activeTodo}
        onSelect={handleSelectTodo}
        onDeselect={() => setActiveTodo(null)}
        onAdd={addTodo}
        onDelete={deleteTodo}
        onToggleDone={handleToggleDone}
      />
    </main>
  );
}
