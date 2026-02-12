import { fromZonedTime, toZonedTime } from "date-fns-tz";

type SlotConfig = {
  dateStr: string;
  timeZone: string;
  slotMinutes: number;
  openTime: string;
  closeTime: string;
};

type SlotValidationConfig = {
  startsAt: Date;
  timeZone: string;
  slotMinutes: number;
  openTime: string;
  closeTime: string;
};

type EndsAtConfig = {
  startsAt: Date;
  timeZone: string;
  slotMinutes: number;
};

const MINUTES_IN_DAY = 24 * 60;
const MS_PER_MINUTE = 60 * 1000;

const pad2 = (value: number) => value.toString().padStart(2, "0");

export const formatDateInTimeZone = (date: Date, timeZone: string) => {
  const zoned = toZonedTime(date, timeZone);
  return `${zoned.getFullYear()}-${pad2(zoned.getMonth() + 1)}-${pad2(
    zoned.getDate()
  )}`;
};

export const parseTimeToMinutes = (timeValue: string) => {
  const [rawHours, rawMinutes] = timeValue.split(":");
  const hours = Number.parseInt(rawHours ?? "", 10);
  const minutes = Number.parseInt(rawMinutes ?? "", 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return 0;
  }
  return hours * 60 + minutes;
};

export const getDayStartEndUtc = (dateStr: string, timeZone: string) => {
  const start = fromZonedTime(`${dateStr}T00:00:00`, timeZone);
  const end = new Date(start.getTime() + MINUTES_IN_DAY * MS_PER_MINUTE - 1);
  return { start, end };
};

export const generateSlotsForDate = ({
  dateStr,
  timeZone,
  slotMinutes,
  openTime,
  closeTime,
}: SlotConfig) => {
  if (slotMinutes <= 0) {
    return [];
  }

  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);
  if (openMinutes >= closeMinutes) {
    return [];
  }

  const dayStartUtc = fromZonedTime(`${dateStr}T00:00:00`, timeZone);
  const slots: { startsAt: Date; endsAt: Date }[] = [];

  for (
    let minutes = openMinutes;
    minutes + slotMinutes <= closeMinutes;
    minutes += slotMinutes
  ) {
    const startsAt = new Date(dayStartUtc.getTime() + minutes * MS_PER_MINUTE);
    const endsAt = new Date(startsAt.getTime() + slotMinutes * MS_PER_MINUTE);
    slots.push({ startsAt, endsAt });
  }

  return slots;
};

export const isValidSlotStart = ({
  startsAt,
  timeZone,
  slotMinutes,
  openTime,
  closeTime,
}: SlotValidationConfig) => {
  if (slotMinutes <= 0) {
    return false;
  }

  const local = toZonedTime(startsAt, timeZone);
  const minutesFromStartOfDay = local.getHours() * 60 + local.getMinutes();
  const openMinutes = parseTimeToMinutes(openTime);
  const closeMinutes = parseTimeToMinutes(closeTime);

  if (minutesFromStartOfDay < openMinutes) {
    return false;
  }

  if (minutesFromStartOfDay + slotMinutes > closeMinutes) {
    return false;
  }

  return (minutesFromStartOfDay - openMinutes) % slotMinutes === 0;
};

export const computeEndsAt = ({ startsAt, slotMinutes }: EndsAtConfig) => {
  return new Date(startsAt.getTime() + slotMinutes * MS_PER_MINUTE);
};
