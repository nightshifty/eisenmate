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
  const [timerStatus, setTimerStatus] = useState<CombinedTimerStatus>("idle");

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

  const isTimerActive = timerStatus !== "idle" && timerStatus !== "completed";
  const isBreak = timerStatus === "break";

  return (
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
    >
      {(timerDisplay, controls) => (
        <main className="flex-1 flex flex-col">
          {/* Timer display area — fills available space, centers the circle */}
          <div className="flex-1 flex items-center justify-center px-4 py-4">
            <div className="flex flex-col items-center">
              {timerDisplay}
            </div>
          </div>

          {/* Bottom bar — task selector + action buttons */}
          <div className="border-t bg-background/80 backdrop-blur-sm px-4 py-3">
            <div className={`mx-auto max-w-lg flex items-center gap-3 ${isBreak ? "justify-center" : ""}`}>
              {!isBreak && (
                <div className="min-w-0 flex-1">
                  <TodoPanel
                    todos={todos}
                    loading={todosLoading}
                    activeTodo={activeTodo}
                    disabled={isTimerActive}
                    onSelect={handleSelectTodo}
                    onDeselect={() => setActiveTodo(null)}
                    onAdd={addTodo}
                    onDelete={deleteTodo}
                    onToggleDone={handleToggleDone}
                  />
                </div>
              )}
              {controls}
            </div>
          </div>
        </main>
      )}
    </PomodoroTimer>
  );
}
