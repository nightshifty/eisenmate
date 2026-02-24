import { useState, useCallback } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { PomodoroTimer } from "@/components/timer/PomodoroTimer";
import { TodoPanel } from "@/components/todos/TodoPanel";
import { useTodos, type Todo } from "@/hooks/useTodos";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useSessions } from "@/hooks/useSessions";
import { useTheme } from "@/hooks/useTheme";
import { getTimerState, getTodos } from "@/lib/storage";
import type { TimerStatus } from "@/hooks/useTimer";

function getRestoredTodo(): Todo | null {
  const saved = getTimerState();
  if (!saved?.activeTodoId) return null;
  return getTodos().find((t) => t.id === saved.activeTodoId) ?? null;
}

export function HomePage() {
  const { todos, loading: todosLoading, addTodo, deleteTodo, trackTime, toggleDone } = useTodos();
  const { pomodoroMinutes, overtimeMaxMinutes, overtimeChimeIntervalMinutes, updateSettings } = useUserSettings();
  const { sessions, todaySessions, todayMinutes, addSession, deleteSession, clearSessions } = useSessions();
  const { theme, toggleTheme } = useTheme();
  const [activeTodo, setActiveTodo] = useState<Todo | null>(getRestoredTodo);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>("idle");

  const handleSelectTodo = (todo: Todo) => {
    setActiveTodo((prev) => (prev?.id === todo.id ? null : todo));
  };

  const handlePomodoroComplete = useCallback(() => {
    if (activeTodo) {
      trackTime(activeTodo.id, pomodoroMinutes);
    }

    addSession({
      todoId: activeTodo?.id ?? null,
      todoContent: activeTodo?.content ?? "Kein Todo",
      durationMinutes: pomodoroMinutes,
      completedAt: new Date().toISOString(),
    });
  }, [activeTodo, pomodoroMinutes, trackTime, addSession]);

  const handleOvertimeStop = useCallback((overtimeMinutes: number) => {
    if (activeTodo && overtimeMinutes > 0) {
      trackTime(activeTodo.id, overtimeMinutes);
    }
  }, [activeTodo, trackTime]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        settings={{ pomodoroMinutes, overtimeMaxMinutes, overtimeChimeIntervalMinutes }}
        onSaveSettings={updateSettings}
        timerRunning={timerStatus === "running" || timerStatus === "paused" || timerStatus === "overtime"}
        sessions={sessions}
        todaySessions={todaySessions}
        todayMinutes={todayMinutes}
        onDeleteSession={deleteSession}
        onClearSessions={clearSessions}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 flex flex-col items-center justify-center gap-8 px-4 py-8">
        <PomodoroTimer
          pomodoroMinutes={pomodoroMinutes}
          overtimeMaxMinutes={overtimeMaxMinutes}
          overtimeChimeIntervalMinutes={overtimeChimeIntervalMinutes}
          activeTodo={activeTodo}
          onPomodoroComplete={handlePomodoroComplete}
          onOvertimeStop={handleOvertimeStop}
          onStatusChange={setTimerStatus}
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
    </div>
  );
}
