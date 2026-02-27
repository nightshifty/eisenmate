import { renderHook, act } from "@testing-library/react";
import { useTheme } from "./useTheme";

// ---- helpers ----------------------------------------------------------------

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function addThemeColorMeta() {
  const meta = document.createElement("meta");
  meta.setAttribute("name", "theme-color");
  meta.content = "";
  document.head.appendChild(meta);
  return meta;
}

// ---- setup ------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove("dark");
  // Remove any theme-color meta tags from previous tests
  document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.remove());
  // Default: prefers light
  mockMatchMedia(false);
});

// ---- tests ------------------------------------------------------------------

describe("useTheme — initial state from system preference", () => {
  it("defaults to light when system prefers light", () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("defaults to dark when system prefers dark", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });
});

describe("useTheme — initial state from localStorage", () => {
  it("restores 'dark' from localStorage regardless of system preference", () => {
    mockMatchMedia(false); // system says light
    localStorage.setItem("eisenmate_theme", "dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("restores 'light' from localStorage regardless of system preference", () => {
    mockMatchMedia(true); // system says dark
    localStorage.setItem("eisenmate_theme", "light");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");
  });

  it("ignores invalid localStorage values and falls back to system preference", () => {
    mockMatchMedia(true);
    localStorage.setItem("eisenmate_theme", "rainbow");
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");
  });
});

describe("useTheme — toggleTheme", () => {
  it("toggles from light to dark", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("light");

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("dark");
  });

  it("toggles from dark to light", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe("dark");

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
  });

  it("toggles back and forth", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe("light");
  });
});

describe("useTheme — side effects", () => {
  it("persists theme to localStorage on toggle", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(localStorage.getItem("eisenmate_theme")).toBe("dark");
  });

  it("adds 'dark' class to documentElement when dark", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes 'dark' class from documentElement when light", () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    act(() => result.current.toggleTheme());
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("updates theme-color meta tags for dark theme", () => {
    const meta = addThemeColorMeta();
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(meta.content).toBe("#1A202C");
  });

  it("updates theme-color meta tags for light theme", () => {
    mockMatchMedia(true);
    const meta = addThemeColorMeta();
    const { result } = renderHook(() => useTheme());
    // Initially dark
    expect(meta.content).toBe("#1A202C");

    act(() => result.current.toggleTheme());
    expect(meta.content).toBe("#FFFAF0");
  });
});
