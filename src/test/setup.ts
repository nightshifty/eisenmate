import "@testing-library/jest-dom/vitest";

// jsdom does not implement HTMLMediaElement — stub Audio for tests
globalThis.Audio = vi.fn().mockImplementation(function () {
  return { play: vi.fn().mockResolvedValue(undefined) };
}) as unknown as typeof Audio;

// jsdom does not implement Notification API — stub it
globalThis.Notification = vi.fn() as unknown as typeof Notification;
Object.defineProperty(globalThis.Notification, "permission", {
  get: () => "default" as NotificationPermission,
  configurable: true,
});
