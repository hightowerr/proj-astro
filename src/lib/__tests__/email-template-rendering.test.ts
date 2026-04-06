import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const hasPostgresUrl = Boolean(process.env.POSTGRES_URL);
if (!hasPostgresUrl) {
  process.env.POSTGRES_URL =
    "postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder";
}

const [
  { db },
  { getOrCreateTemplate, renderTemplate },
  { createAppointment },
  { createShop },
  schema,
] = await Promise.all([
  import("@/lib/db"),
  import("@/lib/messages"),
  import("@/lib/queries/appointments"),
  import("@/lib/queries/shops"),
  import("@/lib/schema"),
]);

const { shops, user } = schema;

const EMAIL_TEMPLATE_KEY = "appointment_reminder_24h";
const EMAIL_TEMPLATE_VERSION = 1;
const EMAIL_SUBJECT_TEMPLATE =
  "Reminder: Your appointment tomorrow at {{shopName}}";
const EMAIL_BODY_TEMPLATE = `
<html>
  <body>
    <h1>Hi {{customerName}}!</h1>
    <p>Shop: {{shopName}}</p>
    <p>Date: {{appointmentDate}}</p>
    <p>Time: {{appointmentTime}}</p>
    <a href="{{bookingUrl}}">Manage booking</a>
  </body>
</html>
`.trim();

let userId: string;

beforeAll(() => {
  vi.stubEnv("NODE_ENV", "test");
});

afterAll(() => {
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  if (!hasPostgresUrl) {
    return;
  }

  userId = randomUUID();
  await db.insert(user).values({
    id: userId,
    name: "Email Template Test User",
    email: `email-template-${userId}@example.com`,
    emailVerified: true,
  });
});

afterEach(async () => {
  if (!hasPostgresUrl) {
    return;
  }

  await db.delete(shops).where(eq(shops.ownerUserId, userId));
  await db.delete(user).where(eq(user.id, userId));
});

const describeIf = hasPostgresUrl ? describe : describe.skip;

describeIf("email template rendering", () => {
  const ensureEmailTemplate = async () =>
    await getOrCreateTemplate(
      EMAIL_TEMPLATE_KEY,
      "email",
      EMAIL_TEMPLATE_VERSION,
      {
        subjectTemplate: EMAIL_SUBJECT_TEMPLATE,
        bodyTemplate: EMAIL_BODY_TEMPLATE,
      }
    );

  const createAppointmentFixture = async () => {
    const shopName = "Downtown Barber Shop";
    const shop = await createShop({
      ownerUserId: userId,
      name: shopName,
      slug: `email-template-${randomUUID().slice(0, 8)}`,
      status: "active",
    });

    const startsAt = new Date("2026-03-18T14:00:00.000Z");

    const booking = await createAppointment({
      shopId: shop.id,
      startsAt,
      customer: {
        fullName: "John Doe",
        phone: "+12025550199",
        email: `john-${randomUUID()}@example.com`,
        smsOptIn: true,
      },
      paymentsEnabled: true,
    });

    return { ...booking, shopName };
  };

  it("fetches the email template from the database", async () => {
    const template = await ensureEmailTemplate();

    expect(template.key).toBe(EMAIL_TEMPLATE_KEY);
    expect(template.channel).toBe("email");
    expect(template.version).toBe(EMAIL_TEMPLATE_VERSION);
    expect(template.subjectTemplate).toContain("{{shopName}}");
    expect(template.bodyTemplate).toContain("{{customerName}}");
  });

  it("renders the email template with appointment data", async () => {
    const template = await ensureEmailTemplate();
    const result = await createAppointmentFixture();

    const appointmentDate = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      dateStyle: "long",
    }).format(result.appointment.startsAt);

    const appointmentTime = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      timeStyle: "short",
    }).format(result.appointment.startsAt);

    const rendered = renderTemplate(template.bodyTemplate, {
      customerName: result.customer.fullName,
      shopName: result.shopName,
      appointmentDate,
      appointmentTime,
      bookingUrl: result.appointment.bookingUrl ?? "",
    });

    expect(rendered).toContain("John Doe");
    expect(rendered).toContain("Downtown Barber Shop");
    expect(rendered).toContain(appointmentDate);
    expect(rendered).toContain(appointmentTime);
    expect(rendered).toContain(result.appointment.bookingUrl ?? "");
    expect(rendered).not.toContain("{{customerName}}");
    expect(rendered).not.toContain("{{shopName}}");
  });

  it("renders the subject template with appointment data", async () => {
    const template = await ensureEmailTemplate();

    const renderedSubject = renderTemplate(template.subjectTemplate ?? "", {
      shopName: "Downtown Barber Shop",
    });

    expect(renderedSubject).toContain("Reminder");
    expect(renderedSubject).toContain("Downtown Barber Shop");
    expect(renderedSubject).not.toContain("{{shopName}}");
  });

  it("preserves missing variables by default", async () => {
    const template = await ensureEmailTemplate();

    const rendered = renderTemplate(template.bodyTemplate, {
      customerName: "Jane Smith",
    });

    expect(rendered).toContain("Jane Smith");
    expect(rendered).not.toContain("{{customerName}}");
    expect(rendered).toContain("{{shopName}}");
    expect(rendered).toContain("{{appointmentDate}}");
  });

  it("preserves HTML structure after rendering", async () => {
    const template = await ensureEmailTemplate();

    const rendered = renderTemplate(template.bodyTemplate, {
      customerName: "Test User",
      shopName: "Test Shop",
      appointmentDate: "March 18, 2026",
      appointmentTime: "2:00 PM",
      bookingUrl: "https://example.com/manage/test",
    });

    expect(rendered).toContain("<html");
    expect(rendered).toContain("</html>");
    expect(rendered).toContain("<body");
    expect(rendered).toContain("</body>");
    expect(rendered).toContain("Hi Test User!");
    expect(rendered).toContain('href="https://example.com/manage/test"');
  });
});
