import { useState } from "react";
import { HomePage } from "@/pages/HomePage";
import { EisenhowerPage } from "@/pages/EisenhowerPage";
import { Navbar } from "@/components/layout/Navbar";
import { useTodos } from "@/hooks/useTodos";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useSessions } from "@/hooks/useSessions";
import { useTheme } from "@/hooks/useTheme";

export type Page = "pomodoro" | "eisenhower";

export default function App() {
  const [page, setPage] = useState<Page>("pomodoro");
  const todosHook = useTodos();
  const settingsHook = useUserSettings();
  const sessionsHook = useSessions();
  const { theme, toggleTheme } = useTheme();
  const [timerRunning, setTimerRunning] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        activePage={page}
        onPageChange={setPage}
        settings={{
          pomodoroMinutes: settingsHook.pomodoroMinutes,
          breakMinutes: settingsHook.breakMinutes,
          overtimeMaxMinutes: settingsHook.overtimeMaxMinutes,
          overtimeChimeIntervalMinutes: settingsHook.overtimeChimeIntervalMinutes,
          allowEarlyFinish: settingsHook.allowEarlyFinish,
        }}
        onSaveSettings={settingsHook.updateSettings}
        timerRunning={timerRunning}
        sessions={sessionsHook.sessions}
        todaySessions={sessionsHook.todaySessions}
        todayMinutes={sessionsHook.todayMinutes}
        onDeleteSession={sessionsHook.deleteSession}
        onClearSessions={sessionsHook.clearSessions}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {page === "pomodoro" ? (
        <HomePage
          todos={todosHook.todos}
          todosLoading={todosHook.loading}
          addTodo={todosHook.addTodo}
          deleteTodo={todosHook.deleteTodo}
          trackTime={todosHook.trackTime}
          toggleDone={todosHook.toggleDone}
          pomodoroMinutes={settingsHook.pomodoroMinutes}
          breakMinutes={settingsHook.breakMinutes}
          overtimeMaxMinutes={settingsHook.overtimeMaxMinutes}
          overtimeChimeIntervalMinutes={settingsHook.overtimeChimeIntervalMinutes}
          allowEarlyFinish={settingsHook.allowEarlyFinish}
          addSession={sessionsHook.addSession}
          onTimerRunningChange={setTimerRunning}
        />
      ) : (
        <EisenhowerPage
          todos={todosHook.todos}
          addTodo={todosHook.addTodo}
          deleteTodo={todosHook.deleteTodo}
          toggleDone={todosHook.toggleDone}
          updateTodo={todosHook.updateTodo}
        />
      )}
    </div>
  );
}
