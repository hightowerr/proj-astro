import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerEnvMock, resendSendMock } = vi.hoisted(() => ({
  getServerEnvMock: vi.fn(),
  resendSendMock: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getServerEnv: getServerEnvMock,
}));

vi.mock("resend", () => ({
  Resend: vi.fn(function Resend() {
    return {
      emails: {
        send: resendSendMock,
      },
    };
  }),
}));

const { sendEmail } = await import("@/lib/email");

describe("sendEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerEnvMock.mockReturnValue({
      RESEND_API_KEY: "re_test_key",
      EMAIL_FROM_ADDRESS: "test@example.com",
    });
  });

  it("sends email successfully", async () => {
    resendSendMock.mockResolvedValue({
      data: { id: "msg_123" },
      error: null,
    });

    const result = await sendEmail({
      to: "customer@example.com",
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });

    expect(result).toEqual({
      success: true,
      messageId: "msg_123",
    });
    expect(resendSendMock).toHaveBeenCalledWith({
      from: "test@example.com",
      to: "customer@example.com",
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });
  });

  it("handles Resend API errors", async () => {
    resendSendMock.mockResolvedValue({
      data: null,
      error: { message: "Invalid API key" },
    });

    const result = await sendEmail({
      to: "customer@example.com",
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });

    expect(result).toEqual({
      success: false,
      error: "Invalid API key",
    });
  });

  it("handles missing data response", async () => {
    resendSendMock.mockResolvedValue({
      data: null,
      error: null,
    });

    const result = await sendEmail({
      to: "customer@example.com",
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });

    expect(result).toEqual({
      success: false,
      error: "No response data from email service",
    });
  });

  it("handles exceptions", async () => {
    resendSendMock.mockRejectedValue(new Error("Network error"));

    const result = await sendEmail({
      to: "customer@example.com",
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });

    expect(result).toEqual({
      success: false,
      error: "Network error",
    });
  });

  it("supports multiple recipients", async () => {
    resendSendMock.mockResolvedValue({
      data: { id: "msg_456" },
      error: null,
    });

    const result = await sendEmail({
      to: ["customer1@example.com", "customer2@example.com"],
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });

    expect(result).toEqual({
      success: true,
      messageId: "msg_456",
    });
    expect(resendSendMock).toHaveBeenCalledWith({
      from: "test@example.com",
      to: ["customer1@example.com", "customer2@example.com"],
      subject: "Test Subject",
      html: "<p>Test content</p>",
    });
  });
});
