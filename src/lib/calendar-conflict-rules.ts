export const CALENDAR_CONFLICT_BUFFER_MS = 5 * 60 * 1000;

export function overlapsWithCalendarConflictBuffer(input: {
  slotStartMs: number;
  slotEndMs: number;
  eventStartMs: number;
  eventEndMs: number;
}): boolean {
  return (
    input.eventStartMs < input.slotEndMs + CALENDAR_CONFLICT_BUFFER_MS &&
    input.eventEndMs > input.slotStartMs - CALENDAR_CONFLICT_BUFFER_MS
  );
}
