import type { Session } from "@/lib/storage";

export interface GroupedSessions {
  label: string;
  sessions: Session[];
}

/**
 * Groups sessions by day. Today and yesterday get special labels;
 * all other days use locale-formatted date strings.
 */
export function groupByDay(
  sessions: Session[],
  todayLabel: string,
  yesterdayLabel: string,
  dateLocale: string,
): GroupedSessions[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: Map<string, { label: string; sessions: Session[] }> = new Map();

  for (const session of sessions) {
    const date = new Date(session.completedAt);
    date.setHours(0, 0, 0, 0);

    let label: string;
    let key: string;
    if (date.getTime() === today.getTime()) {
      label = todayLabel;
      key = "today";
    } else if (date.getTime() === yesterday.getTime()) {
      label = yesterdayLabel;
      key = "yesterday";
    } else {
      label = date.toLocaleDateString(dateLocale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
      key = label;
    }

    if (!groups.has(key)) {
      groups.set(key, { label, sessions: [] });
    }
    groups.get(key)!.sessions.push(session);
  }

  return Array.from(groups.values());
}
