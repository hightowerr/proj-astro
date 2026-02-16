import { randomUUID } from "node:crypto";
import { getServerEnv } from "@/lib/env";

const DEFAULT_TWILIO_TEST_FROM_NUMBER = "+15005550006";

export const smsIsMocked = () => process.env.NODE_ENV === "test";
export const smsUsesTwilioTestApi = () =>
  process.env.TWILIO_TEST_MODE === "true";

type TwilioResponse = {
  sid: string;
  status?: string;
  error_code?: string | number | null;
  error_message?: string | null;
  message?: string | null;
};

const buildAuthHeader = (accountSid: string, authToken: string) => {
  const encoded = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  return `Basic ${encoded}`;
};

export const sendTwilioSms = async (input: {
  to: string;
  body: string;
}): Promise<{ sid: string }> => {
  if (smsIsMocked()) {
    return { sid: `mock_${randomUUID()}` };
  }

  const env = getServerEnv();
  if (
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN
  ) {
    throw new Error("Twilio environment variables are missing");
  }

  const useTwilioTestApi = smsUsesTwilioTestApi();
  const from = useTwilioTestApi
    ? (env.TWILIO_TEST_FROM_NUMBER ?? DEFAULT_TWILIO_TEST_FROM_NUMBER)
    : env.TWILIO_PHONE_NUMBER;
  const to = useTwilioTestApi
    ? (env.TWILIO_TEST_TO_NUMBER_OVERRIDE ?? input.to)
    : input.to;

  if (!from) {
    throw new Error("Twilio sender phone number is missing");
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const payload = new URLSearchParams({
    From: from,
    To: to,
    Body: input.body,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: buildAuthHeader(
        env.TWILIO_ACCOUNT_SID,
        env.TWILIO_AUTH_TOKEN
      ),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: payload.toString(),
  });

  const data = (await response.json().catch(() => ({}))) as TwilioResponse;

  if (!response.ok) {
    const error = new Error(
      data.error_message || data.message || data.status || "Twilio send failed"
    );
    if (data.error_code != null) {
      (error as { code?: string | number }).code = data.error_code;
    }
    throw error;
  }

  if (!data.sid) {
    throw new Error("Twilio send failed: missing message SID");
  }

  return { sid: data.sid };
};
