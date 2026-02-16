import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { getServerEnvMock } = vi.hoisted(() => ({
  getServerEnvMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getServerEnv: getServerEnvMock,
}));

const { sendTwilioSms, smsIsMocked, smsUsesTwilioTestApi } =
  await import("@/lib/twilio");

const buildOkResponse = (sid = "SM_test_sid") =>
  ({
    ok: true,
    json: async () => ({ sid }),
  }) as Response;

describe("twilio sms sending", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "development");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns mock sid in NODE_ENV=test", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendTwilioSms({
      to: "+15551234567",
      body: "hello",
    });

    expect(smsIsMocked()).toBe(true);
    expect(result.sid).toMatch(/^mock_/);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(getServerEnvMock).not.toHaveBeenCalled();
  });

  it("uses Twilio test API mode with magic from number by default", async () => {
    vi.stubEnv("TWILIO_TEST_MODE", "true");
    const fetchMock = vi.fn(async () => buildOkResponse("SM_test_mode"));
    vi.stubGlobal("fetch", fetchMock);
    getServerEnvMock.mockReturnValue({
      TWILIO_ACCOUNT_SID: "AC_test_123",
      TWILIO_AUTH_TOKEN: "auth_token",
      TWILIO_PHONE_NUMBER: "+15550000000",
    });

    const result = await sendTwilioSms({
      to: "+15551234567",
      body: "hello world",
    });

    expect(smsUsesTwilioTestApi()).toBe(true);
    expect(result).toEqual({ sid: "SM_test_mode" });

    const firstCall = fetchMock.mock.calls[0] as unknown[] | undefined;
    expect(firstCall).toBeDefined();
    if (!firstCall) {
      throw new Error("Expected fetch to be called");
    }

    const url = firstCall[0] as string;
    const request = firstCall[1] as RequestInit;
    expect(url).toContain("/Accounts/AC_test_123/Messages.json");
    expect(request.method).toBe("POST");
    expect(request.headers).toMatchObject({
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from("AC_test_123:auth_token").toString("base64")}`,
    });
    const payload = String(request.body);
    expect(payload).toContain("From=%2B15005550006");
    expect(payload).toContain("To=%2B15551234567");
    expect(payload).toContain("Body=hello+world");
  });

  it("uses test mode destination override when configured", async () => {
    vi.stubEnv("TWILIO_TEST_MODE", "true");
    const fetchMock = vi.fn(async () => buildOkResponse("SM_override"));
    vi.stubGlobal("fetch", fetchMock);
    getServerEnvMock.mockReturnValue({
      TWILIO_ACCOUNT_SID: "AC_test_456",
      TWILIO_AUTH_TOKEN: "auth_token_2",
      TWILIO_PHONE_NUMBER: "+15550000000",
      TWILIO_TEST_TO_NUMBER_OVERRIDE: "+15005550009",
    });

    await sendTwilioSms({
      to: "+15557654321",
      body: "override target",
    });

    const firstCall = fetchMock.mock.calls[0] as unknown[] | undefined;
    expect(firstCall).toBeDefined();
    if (!firstCall) {
      throw new Error("Expected fetch to be called");
    }

    const request = firstCall[1] as RequestInit;
    const payload = String(request.body);
    expect(payload).toContain("From=%2B15005550006");
    expect(payload).toContain("To=%2B15005550009");
    expect(payload).not.toContain("To=%2B15557654321");
  });

  it("uses configured live sender in non-test mode", async () => {
    vi.stubEnv("TWILIO_TEST_MODE", "false");
    const fetchMock = vi.fn(async () => buildOkResponse("SM_live"));
    vi.stubGlobal("fetch", fetchMock);
    getServerEnvMock.mockReturnValue({
      TWILIO_ACCOUNT_SID: "AC_live_789",
      TWILIO_AUTH_TOKEN: "live_auth_token",
      TWILIO_PHONE_NUMBER: "+12223334444",
    });

    await sendTwilioSms({
      to: "+19998887777",
      body: "live send",
    });

    const firstCall = fetchMock.mock.calls[0] as unknown[] | undefined;
    expect(firstCall).toBeDefined();
    if (!firstCall) {
      throw new Error("Expected fetch to be called");
    }

    const request = firstCall[1] as RequestInit;
    const payload = String(request.body);
    expect(payload).toContain("From=%2B12223334444");
    expect(payload).toContain("To=%2B19998887777");
  });

  it("throws when live sender is missing", async () => {
    vi.stubEnv("TWILIO_TEST_MODE", "false");
    const fetchMock = vi.fn(async () => buildOkResponse());
    vi.stubGlobal("fetch", fetchMock);
    getServerEnvMock.mockReturnValue({
      TWILIO_ACCOUNT_SID: "AC_missing_sender",
      TWILIO_AUTH_TOKEN: "missing_sender_token",
    });

    await expect(
      sendTwilioSms({
        to: "+15551234567",
        body: "missing sender",
      })
    ).rejects.toThrow("Twilio sender phone number is missing");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
