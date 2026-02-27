import { useState, useCallback } from "react";
import { HomePage } from "@/pages/HomePage";
import { EisenhowerPage } from "@/pages/EisenhowerPage";
import { Navbar } from "@/components/layout/Navbar";
import { SessionTimerBar } from "@/components/sessions/SessionTimerBar";
import { SessionSummaryDialog } from "@/components/sessions/SessionSummaryDialog";
import { PairingDialog } from "@/components/sync/PairingDialog";
import { SyncSettings } from "@/components/sync/SyncSettings";
import { ConflictDialog } from "@/components/sync/ConflictDialog";
import { useTodos } from "@/hooks/useTodos";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useSessions } from "@/hooks/useSessions";
import { useTheme } from "@/hooks/useTheme";
import { useSessionTimer, type SessionSummary } from "@/hooks/useSessionTimer";
import { useSync } from "@/hooks/useSync";

export type Page = "pomodoro" | "eisenhower";

export default function App() {
  const [page, setPage] = useState<Page>("pomodoro");
  const todosHook = useTodos();
  const settingsHook = useUserSettings();
  const sessionsHook = useSessions(todosHook.refreshTodos);
  const { theme, toggleTheme } = useTheme();
  const [timerRunning, setTimerRunning] = useState(false);

  const sessionTimer = useSessionTimer(settingsHook.sessionTimerEnabled);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [pendingSummary, setPendingSummary] = useState<SessionSummary | null>(null);

  // ─── Sync ───────────────────────────────────────────────────────────
  const sync = useSync();
  const [syncSettingsOpen, setSyncSettingsOpen] = useState(false);
  const [pairingDialogOpen, setPairingDialogOpen] = useState(false);

  const handleStartPairing = useCallback(() => {
    setSyncSettingsOpen(false);
    setPairingDialogOpen(true);
  }, []);

  const handlePairingComplete = useCallback(
    (payload: Parameters<typeof sync.completePairing>[0], role: "initiator" | "responder") => {
      sync.completePairing(payload, role);
      setPairingDialogOpen(false);
    },
    [sync],
  );

  // ─── Session Timer ──────────────────────────────────────────────────

  const handleSessionStop = useCallback(() => {
    const summary = sessionTimer.getSummary();
    if (summary) {
      setPendingSummary(summary);
      setSummaryDialogOpen(true);
    }
  }, [sessionTimer]);

  const handleSummaryConfirm = useCallback(() => {
    sessionTimer.stop();
    setSummaryDialogOpen(false);
    setPendingSummary(null);
  }, [sessionTimer]);

  const handleSummaryCancel = useCallback(() => {
    setSummaryDialogOpen(false);
    setPendingSummary(null);
  }, []);

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
          sessionTimerEnabled: settingsHook.sessionTimerEnabled,
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
        silentMode={settingsHook.silentMode}
        onToggleSilentMode={() => settingsHook.updateSettings({ silentMode: !settingsHook.silentMode })}
        syncStatus={sync.connectionStatus}
        isSyncPaired={sync.isPaired}
        onSyncSettingsOpen={() => setSyncSettingsOpen(true)}
      />

      {settingsHook.sessionTimerEnabled && sessionTimer.isRunning && (
        <SessionTimerBar
          display={sessionTimer.display}
          pomodoroCount={sessionTimer.pomodoroCount}
          onStop={handleSessionStop}
        />
      )}

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
          silentMode={settingsHook.silentMode}
          addSession={sessionsHook.addSession}
          onTimerRunningChange={setTimerRunning}
          sessionTimerEnabled={settingsHook.sessionTimerEnabled}
          onSessionTimerStart={sessionTimer.start}
          onSessionTimerRecordPomodoro={sessionTimer.recordPomodoro}
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

      <SessionSummaryDialog
        open={summaryDialogOpen}
        onOpenChange={setSummaryDialogOpen}
        summary={pendingSummary}
        onConfirm={handleSummaryConfirm}
        onCancel={handleSummaryCancel}
      />

      {/* ─── Sync Dialogs ──────────────────────────────────────────── */}
      <SyncSettings
        open={syncSettingsOpen}
        onOpenChange={setSyncSettingsOpen}
        syncConfig={sync.syncConfig}
        connectionStatus={sync.connectionStatus}
        onStartPairing={handleStartPairing}
        onUnpair={sync.unpair}
        onSyncNow={sync.syncNow}
        onToggleSync={sync.toggleSync}
      />

      <PairingDialog
        open={pairingDialogOpen}
        onOpenChange={setPairingDialogOpen}
        onPairingComplete={handlePairingComplete}
        localPairingPayload={sync.pairingPayload}
        onStartAsInitiator={sync.startPairing}
      />

      <ConflictDialog
        conflicts={sync.conflicts}
        onResolve={sync.resolveConflicts}
      />
    </div>
  );
}
