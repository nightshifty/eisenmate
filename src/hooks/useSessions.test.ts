import { renderHook, act } from "@testing-library/react";
import { useSessions } from "./useSessions";
import { getSessions, getTodos, saveTodos, generateId, type Todo } from "@/lib/storage";

beforeEach(() => {
  localStorage.clear();
});

/** Helper to create and persist a to-do in localStorage */
function createTodo(overrides: Partial<Todo> = {}): Todo {
  const todo: Todo = {
    id: generateId(),
    content: "Test Task",
    estimationMinutes: 60,
    timeSpentMinutes: 0,
    done: false,
    createdAt: new Date().toISOString(),
    completedAt: null,
    quadrant: null,
    updatedAt: Date.now(),
    ...overrides,
  };
  const existing = getTodos();
  saveTodos([todo, ...existing]);
  return todo;
}

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

  describe("time subtraction on delete", () => {
    it("subtracts duration from linked todo when deleting a session", () => {
      const todo = createTodo({ timeSpentMinutes: 50 });
      const { result } = renderHook(() => useSessions());

      act(() =>
        result.current.addSession({
          todoId: todo.id,
          todoContent: todo.content,
          durationMinutes: 25,
          completedAt: new Date().toISOString(),
        }),
      );

      const sessionId = result.current.sessions[0].id;
      act(() => result.current.deleteSession(sessionId));

      const updatedTodos = getTodos();
      const updatedTodo = updatedTodos.find((t) => t.id === todo.id);
      expect(updatedTodo!.timeSpentMinutes).toBe(25);
    });

    it("does not modify todos when deleting a session with todoId null", () => {
      const todo = createTodo({ timeSpentMinutes: 30 });
      const { result } = renderHook(() => useSessions());

      act(() =>
        result.current.addSession({
          todoId: null,
          todoContent: "Kein Todo",
          durationMinutes: 25,
          completedAt: new Date().toISOString(),
        }),
      );

      const sessionId = result.current.sessions[0].id;
      act(() => result.current.deleteSession(sessionId));

      const updatedTodo = getTodos().find((t) => t.id === todo.id);
      expect(updatedTodo!.timeSpentMinutes).toBe(30);
    });

    it("does not throw when the linked todo has been deleted", () => {
      const todo = createTodo({ timeSpentMinutes: 25 });
      const { result } = renderHook(() => useSessions());

      act(() =>
        result.current.addSession({
          todoId: todo.id,
          todoContent: todo.content,
          durationMinutes: 25,
          completedAt: new Date().toISOString(),
        }),
      );

      // Delete the to-do from localStorage before deleting the session
      saveTodos([]);

      const sessionId = result.current.sessions[0].id;
      expect(() => {
        act(() => result.current.deleteSession(sessionId));
      }).not.toThrow();

      expect(result.current.sessions).toHaveLength(0);
      expect(getTodos()).toEqual([]);
    });

    it("clamps timeSpentMinutes to 0 instead of going negative", () => {
      const todo = createTodo({ timeSpentMinutes: 10 });
      const { result } = renderHook(() => useSessions());

      act(() =>
        result.current.addSession({
          todoId: todo.id,
          todoContent: todo.content,
          durationMinutes: 25,
          completedAt: new Date().toISOString(),
        }),
      );

      const sessionId = result.current.sessions[0].id;
      act(() => result.current.deleteSession(sessionId));

      const updatedTodo = getTodos().find((t) => t.id === todo.id);
      expect(updatedTodo!.timeSpentMinutes).toBe(0);
    });

    it("does not modify unrelated todos when deleting a session", () => {
      const linkedTodo = createTodo({ content: "Linked", timeSpentMinutes: 50 });
      const unrelatedTodo = createTodo({ content: "Unrelated", timeSpentMinutes: 30 });
      const { result } = renderHook(() => useSessions());

      act(() =>
        result.current.addSession({
          todoId: linkedTodo.id,
          todoContent: linkedTodo.content,
          durationMinutes: 25,
          completedAt: new Date().toISOString(),
        }),
      );

      const sessionId = result.current.sessions[0].id;
      act(() => result.current.deleteSession(sessionId));

      const todos = getTodos();
      expect(todos.find((t) => t.id === linkedTodo.id)!.timeSpentMinutes).toBe(25);
      expect(todos.find((t) => t.id === unrelatedTodo.id)!.timeSpentMinutes).toBe(30);
    });

    it("handles deleting a session with durationMinutes 0", () => {
      const todo = createTodo({ timeSpentMinutes: 30 });
      const { result } = renderHook(() => useSessions());

      act(() =>
        result.current.addSession({
          todoId: todo.id,
          todoContent: todo.content,
          durationMinutes: 0,
          completedAt: new Date().toISOString(),
        }),
      );

      const sessionId = result.current.sessions[0].id;
      act(() => result.current.deleteSession(sessionId));

      const updatedTodo = getTodos().find((t) => t.id === todo.id);
      expect(updatedTodo!.timeSpentMinutes).toBe(30);
    });
  });

  describe("time subtraction on clear all", () => {
    it("subtracts durations from all linked todos when clearing sessions", () => {
      const todo1 = createTodo({ content: "Task 1", timeSpentMinutes: 50 });
      const todo2 = createTodo({ content: "Task 2", timeSpentMinutes: 40 });
      const { result } = renderHook(() => useSessions());
      const now = new Date().toISOString();

      act(() =>
        result.current.addSession({
          todoId: todo1.id,
          todoContent: todo1.content,
          durationMinutes: 25,
          completedAt: now,
        }),
      );
      act(() =>
        result.current.addSession({
          todoId: todo2.id,
          todoContent: todo2.content,
          durationMinutes: 15,
          completedAt: now,
        }),
      );

      act(() => result.current.clearSessions());

      const todos = getTodos();
      expect(todos.find((t) => t.id === todo1.id)!.timeSpentMinutes).toBe(25);
      expect(todos.find((t) => t.id === todo2.id)!.timeSpentMinutes).toBe(25);
    });

    it("aggregates durations for the same todo when clearing sessions", () => {
      const todo = createTodo({ timeSpentMinutes: 75 });
      const { result } = renderHook(() => useSessions());
      const now = new Date().toISOString();

      act(() =>
        result.current.addSession({
          todoId: todo.id,
          todoContent: todo.content,
          durationMinutes: 25,
          completedAt: now,
        }),
      );
      act(() =>
        result.current.addSession({
          todoId: todo.id,
          todoContent: todo.content,
          durationMinutes: 25,
          completedAt: now,
        }),
      );

      act(() => result.current.clearSessions());

      const updatedTodo = getTodos().find((t) => t.id === todo.id);
      expect(updatedTodo!.timeSpentMinutes).toBe(25);
    });

    it("ignores deleted todos when clearing sessions", () => {
      const existingTodo = createTodo({ content: "Exists", timeSpentMinutes: 50 });
      const deletedTodoId = generateId();
      const { result } = renderHook(() => useSessions());
      const now = new Date().toISOString();

      act(() =>
        result.current.addSession({
          todoId: existingTodo.id,
          todoContent: existingTodo.content,
          durationMinutes: 25,
          completedAt: now,
        }),
      );
      act(() =>
        result.current.addSession({
          todoId: deletedTodoId,
          todoContent: "Deleted Task",
          durationMinutes: 30,
          completedAt: now,
        }),
      );

      expect(() => {
        act(() => result.current.clearSessions());
      }).not.toThrow();

      const todos = getTodos();
      expect(todos.find((t) => t.id === existingTodo.id)!.timeSpentMinutes).toBe(25);
      expect(result.current.sessions).toEqual([]);
    });

    it("clamps timeSpentMinutes to 0 when clearing sessions", () => {
      const todo = createTodo({ timeSpentMinutes: 10 });
      const { result } = renderHook(() => useSessions());
      const now = new Date().toISOString();

      act(() =>
        result.current.addSession({
          todoId: todo.id,
          todoContent: todo.content,
          durationMinutes: 25,
          completedAt: now,
        }),
      );
      act(() =>
        result.current.addSession({
          todoId: todo.id,
          todoContent: todo.content,
          durationMinutes: 25,
          completedAt: now,
        }),
      );

      act(() => result.current.clearSessions());

      const updatedTodo = getTodos().find((t) => t.id === todo.id);
      expect(updatedTodo!.timeSpentMinutes).toBe(0);
    });

    it("handles mix of null and valid todoIds when clearing", () => {
      const todo = createTodo({ timeSpentMinutes: 50 });
      const { result } = renderHook(() => useSessions());
      const now = new Date().toISOString();

      act(() =>
        result.current.addSession({
          todoId: todo.id,
          todoContent: todo.content,
          durationMinutes: 25,
          completedAt: now,
        }),
      );
      act(() =>
        result.current.addSession({
          todoId: null,
          todoContent: "Kein Todo",
          durationMinutes: 30,
          completedAt: now,
        }),
      );

      act(() => result.current.clearSessions());

      const updatedTodo = getTodos().find((t) => t.id === todo.id);
      expect(updatedTodo!.timeSpentMinutes).toBe(25);
    });

    it("does nothing to todos when clearing empty sessions", () => {
      const todo = createTodo({ timeSpentMinutes: 30 });
      const { result } = renderHook(() => useSessions());

      act(() => result.current.clearSessions());

      const updatedTodo = getTodos().find((t) => t.id === todo.id);
      expect(updatedTodo!.timeSpentMinutes).toBe(30);
    });
  });

  describe("onTodosChanged callback", () => {
    it("calls onTodosChanged when deleting a session with a linked todo", () => {
      const todo = createTodo({ timeSpentMinutes: 25 });
      const onTodosChanged = vi.fn();
      const { result } = renderHook(() => useSessions(onTodosChanged));

      act(() =>
        result.current.addSession({
          todoId: todo.id,
          todoContent: todo.content,
          durationMinutes: 25,
          completedAt: new Date().toISOString(),
        }),
      );

      const sessionId = result.current.sessions[0].id;
      act(() => result.current.deleteSession(sessionId));

      expect(onTodosChanged).toHaveBeenCalledTimes(1);
    });

    it("calls onTodosChanged when deleting a session without a linked todo", () => {
      const onTodosChanged = vi.fn();
      const { result } = renderHook(() => useSessions(onTodosChanged));

      act(() =>
        result.current.addSession({
          todoId: null,
          todoContent: "Kein Todo",
          durationMinutes: 25,
          completedAt: new Date().toISOString(),
        }),
      );

      const sessionId = result.current.sessions[0].id;
      act(() => result.current.deleteSession(sessionId));

      // Still called because a session was found and deleted
      expect(onTodosChanged).toHaveBeenCalledTimes(1);
    });

    it("calls onTodosChanged when clearing sessions", () => {
      const onTodosChanged = vi.fn();
      const { result } = renderHook(() => useSessions(onTodosChanged));

      act(() =>
        result.current.addSession({
          todoId: null,
          todoContent: "Session",
          durationMinutes: 25,
          completedAt: new Date().toISOString(),
        }),
      );

      act(() => result.current.clearSessions());

      expect(onTodosChanged).toHaveBeenCalledTimes(1);
    });

    it("does not call onTodosChanged when clearing empty sessions", () => {
      const onTodosChanged = vi.fn();
      const { result } = renderHook(() => useSessions(onTodosChanged));

      act(() => result.current.clearSessions());

      expect(onTodosChanged).not.toHaveBeenCalled();
    });

    it("does not call onTodosChanged when deleting a non-existent session", () => {
      const onTodosChanged = vi.fn();
      const { result } = renderHook(() => useSessions(onTodosChanged));

      act(() => result.current.deleteSession("non-existent-id"));

      expect(onTodosChanged).not.toHaveBeenCalled();
    });
  });
});
