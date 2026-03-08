import { parsePhoneNumberFromString } from "libphonenumber-js";

export const normalizePhoneNumber = (phone: string) => {
  const parsed = parsePhoneNumberFromString(phone.trim());

  // Accept E.164-compatible test/demo numbers (e.g. +15551234567) that are possible
  // but not considered "assigned" real numbers by libphonenumber metadata.
  if (!parsed || !parsed.isPossible()) {
    throw new Error("Invalid phone number format.");
  }

  return parsed.number;
};
