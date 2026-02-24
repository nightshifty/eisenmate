import { renderHook, act } from "@testing-library/react";
import { useTodos } from "./useTodos";
import { getTodos } from "@/lib/storage";

beforeEach(() => {
  localStorage.clear();
});

describe("useTodos", () => {
  it("starts with empty todos", () => {
    const { result } = renderHook(() => useTodos());
    expect(result.current.todos).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("adds a todo", () => {
    const { result } = renderHook(() => useTodos());
    act(() => result.current.addTodo("Write tests", 30));

    expect(result.current.todos).toHaveLength(1);
    expect(result.current.todos[0].content).toBe("Write tests");
    expect(result.current.todos[0].estimationMinutes).toBe(30);
    expect(result.current.todos[0].done).toBe(false);
    expect(result.current.todos[0].timeSpentMinutes).toBe(0);
    // persisted to localStorage
    expect(getTodos()).toHaveLength(1);
  });

  it("adds todos in prepend order", () => {
    const { result } = renderHook(() => useTodos());
    act(() => result.current.addTodo("First", 10));
    act(() => result.current.addTodo("Second", 20));

    expect(result.current.todos[0].content).toBe("Second");
    expect(result.current.todos[1].content).toBe("First");
  });

  it("deletes a todo", () => {
    const { result } = renderHook(() => useTodos());
    act(() => result.current.addTodo("Delete me", 10));
    const id = result.current.todos[0].id;

    act(() => result.current.deleteTodo(id));
    expect(result.current.todos).toHaveLength(0);
    expect(getTodos()).toHaveLength(0);
  });

  it("tracks time on a todo", () => {
    const { result } = renderHook(() => useTodos());
    act(() => result.current.addTodo("Work", 25));
    const id = result.current.todos[0].id;

    act(() => result.current.trackTime(id, 25));
    expect(result.current.todos[0].timeSpentMinutes).toBe(25);

    act(() => result.current.trackTime(id, 10));
    expect(result.current.todos[0].timeSpentMinutes).toBe(35);
  });

  it("toggles done state", () => {
    const { result } = renderHook(() => useTodos());
    act(() => result.current.addTodo("Finish", 15));
    const id = result.current.todos[0].id;

    act(() => result.current.toggleDone(id, true));
    expect(result.current.todos[0].done).toBe(true);
    expect(result.current.todos[0].completedAt).not.toBeNull();

    act(() => result.current.toggleDone(id, false));
    expect(result.current.todos[0].done).toBe(false);
    expect(result.current.todos[0].completedAt).toBeNull();
  });

  it("adds a todo with default quadrant null", () => {
    const { result } = renderHook(() => useTodos());
    act(() => result.current.addTodo("Unsorted task", 25));
    expect(result.current.todos[0].quadrant).toBeNull();
  });

  it("adds a todo with a specific quadrant", () => {
    const { result } = renderHook(() => useTodos());
    act(() => result.current.addTodo("Urgent task", 25, "urgent-important"));
    expect(result.current.todos[0].quadrant).toBe("urgent-important");
  });

  it("updates a todo content and quadrant", () => {
    const { result } = renderHook(() => useTodos());
    act(() => result.current.addTodo("Original", 25));
    const id = result.current.todos[0].id;

    act(() => result.current.updateTodo(id, { content: "Updated", quadrant: "not-urgent-important" }));
    expect(result.current.todos[0].content).toBe("Updated");
    expect(result.current.todos[0].quadrant).toBe("not-urgent-important");
    // estimation unchanged
    expect(result.current.todos[0].estimationMinutes).toBe(25);
    // persisted
    expect(getTodos()[0].content).toBe("Updated");
  });

  it("updates only estimation without changing other fields", () => {
    const { result } = renderHook(() => useTodos());
    act(() => result.current.addTodo("Task", 25, "urgent-important"));
    const id = result.current.todos[0].id;

    act(() => result.current.updateTodo(id, { estimationMinutes: 45 }));
    expect(result.current.todos[0].estimationMinutes).toBe(45);
    expect(result.current.todos[0].content).toBe("Task");
    expect(result.current.todos[0].quadrant).toBe("urgent-important");
  });
});
