export type ReminderInterval = "10m" | "1h" | "2h" | "4h" | "24h" | "48h" | "1w";

export const REMINDER_INTERVALS: ReminderInterval[] = [
  "10m",
  "1h",
  "2h",
  "4h",
  "24h",
  "48h",
  "1w",
];

export const parseReminderInterval = (interval: string): number | null => {
  switch (interval) {
    case "10m":
      return 10;
    case "1h":
      return 60;
    case "2h":
      return 120;
    case "4h":
      return 240;
    case "24h":
      return 1440;
    case "48h":
      return 2880;
    case "1w":
      return 10080;
    default:
      return null;
  }
};

export const shouldSkipReminder = (
  startsAt: Date,
  createdAt: Date,
  interval: string
): boolean => {
  const intervalMinutes = parseReminderInterval(interval);
  if (intervalMinutes === null) {
    return true;
  }

  const leadTimeMs = startsAt.getTime() - createdAt.getTime();
  const leadTimeMinutes = leadTimeMs / (1000 * 60);

  return leadTimeMinutes < intervalMinutes;
};
