import { renderHook, act } from "@testing-library/react";
import { useSessions } from "./useSessions";
import { getSessions } from "@/lib/storage";

beforeEach(() => {
  localStorage.clear();
});

describe("useSessions", () => {
  it("starts with empty sessions", () => {
    const { result } = renderHook(() => useSessions());
    expect(result.current.sessions).toEqual([]);
    expect(result.current.todaySessions).toBe(0);
    expect(result.current.todayMinutes).toBe(0);
  });

  it("adds a session and persists", () => {
    const { result } = renderHook(() => useSessions());
    act(() =>
      result.current.addSession({
        todoId: "t1",
        todoContent: "Work",
        durationMinutes: 25,
        completedAt: new Date().toISOString(),
      }),
    );

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].todoContent).toBe("Work");
    expect(getSessions()).toHaveLength(1);
  });

  it("counts today's sessions and minutes", () => {
    const { result } = renderHook(() => useSessions());
    const now = new Date().toISOString();

    act(() =>
      result.current.addSession({
        todoId: null,
        todoContent: "Session 1",
        durationMinutes: 25,
        completedAt: now,
      }),
    );
    act(() =>
      result.current.addSession({
        todoId: null,
        todoContent: "Session 2",
        durationMinutes: 15,
        completedAt: now,
      }),
    );

    expect(result.current.todaySessions).toBe(2);
    expect(result.current.todayMinutes).toBe(40);
  });

  it("excludes sessions from other days", () => {
    const { result } = renderHook(() => useSessions());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    act(() =>
      result.current.addSession({
        todoId: null,
        todoContent: "Old session",
        durationMinutes: 25,
        completedAt: yesterday.toISOString(),
      }),
    );

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.todaySessions).toBe(0);
    expect(result.current.todayMinutes).toBe(0);
  });

  it("deletes a single session and persists", () => {
    const { result } = renderHook(() => useSessions());
    const now = new Date().toISOString();

    act(() =>
      result.current.addSession({
        todoId: null,
        todoContent: "Session 1",
        durationMinutes: 25,
        completedAt: now,
      }),
    );
    act(() =>
      result.current.addSession({
        todoId: null,
        todoContent: "Session 2",
        durationMinutes: 15,
        completedAt: now,
      }),
    );

    expect(result.current.sessions).toHaveLength(2);

    const idToDelete = result.current.sessions[0].id;
    act(() => result.current.deleteSession(idToDelete));

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.sessions[0].id).not.toBe(idToDelete);
    expect(getSessions()).toHaveLength(1);
  });

  it("clears all sessions and persists", () => {
    const { result } = renderHook(() => useSessions());
    const now = new Date().toISOString();

    act(() =>
      result.current.addSession({
        todoId: null,
        todoContent: "Session 1",
        durationMinutes: 25,
        completedAt: now,
      }),
    );
    act(() =>
      result.current.addSession({
        todoId: null,
        todoContent: "Session 2",
        durationMinutes: 15,
        completedAt: now,
      }),
    );

    expect(result.current.sessions).toHaveLength(2);

    act(() => result.current.clearSessions());

    expect(result.current.sessions).toEqual([]);
    expect(getSessions()).toEqual([]);
    expect(result.current.todaySessions).toBe(0);
    expect(result.current.todayMinutes).toBe(0);
  });
});
