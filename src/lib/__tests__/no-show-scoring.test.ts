import { describe, expect, it } from "vitest";
import {
  assignNoShowRisk,
  calculateNoShowScore,
  countNoShowsLast90Days,
  flattenRecencyBuckets,
  type RecencyBuckets,
} from "@/lib/no-show-scoring";

describe("calculateNoShowScore", () => {
  it("returns base score (75) for customer with no history", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    expect(calculateNoShowScore(recencyBuckets)).toBe(75);
  });

  it("increases score for completed appointments", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 3, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    expect(calculateNoShowScore(recencyBuckets)).toBe(98);
  });

  it("caps completed bonus at 25 points", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 10, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    expect(calculateNoShowScore(recencyBuckets)).toBe(100);
  });

  it("decreases score for no-shows", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 2, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    expect(calculateNoShowScore(recencyBuckets)).toBe(30);
  });

  it("applies recency multipliers correctly", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 1, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 1, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 1, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    expect(calculateNoShowScore(recencyBuckets)).toBe(90);
  });

  it("applies booking-time adjustment for short lead time", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    expect(
      calculateNoShowScore(recencyBuckets, {
        leadTimeHours: 12,
        appointmentHour: 14,
        paymentRequired: true,
      })
    ).toBe(65);
  });

  it("applies booking-time adjustment for early morning", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    expect(
      calculateNoShowScore(recencyBuckets, {
        leadTimeHours: 48,
        appointmentHour: 7,
        paymentRequired: true,
      })
    ).toBe(70);
  });

  it("applies booking-time adjustment for no payment", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    expect(
      calculateNoShowScore(recencyBuckets, {
        leadTimeHours: 48,
        appointmentHour: 14,
        paymentRequired: false,
      })
    ).toBe(70);
  });

  it("applies multiple booking-time adjustments", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    expect(
      calculateNoShowScore(recencyBuckets, {
        leadTimeHours: 12,
        appointmentHour: 7,
        paymentRequired: false,
      })
    ).toBe(55);
  });

  it("clamps score to 0-100 range", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 10, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 0, lateCancels: 0, onTimeCancels: 0 },
    };

    expect(calculateNoShowScore(recencyBuckets)).toBe(0);
  });
});

describe("assignNoShowRisk", () => {
  it("assigns low risk for high score with no no-shows", () => {
    expect(assignNoShowRisk(75, 0)).toBe("low");
    expect(assignNoShowRisk(70, 0)).toBe("low");
  });

  it("does not assign low risk if no-shows in last 90 days", () => {
    expect(assignNoShowRisk(75, 1)).toBe("medium");
  });

  it("assigns high risk for low score", () => {
    expect(assignNoShowRisk(39, 0)).toBe("high");
    expect(assignNoShowRisk(20, 0)).toBe("high");
  });

  it("assigns high risk for multiple no-shows regardless of score", () => {
    expect(assignNoShowRisk(75, 2)).toBe("high");
    expect(assignNoShowRisk(50, 3)).toBe("high");
  });

  it("assigns medium risk for mid-range score", () => {
    expect(assignNoShowRisk(50, 0)).toBe("medium");
    expect(assignNoShowRisk(60, 1)).toBe("medium");
    expect(assignNoShowRisk(69, 0)).toBe("medium");
  });
});

describe("flattenRecencyBuckets", () => {
  it("sums counts across all recency buckets", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 2, noShows: 1, lateCancels: 1, onTimeCancels: 0 },
      days31To90: { completed: 3, noShows: 0, lateCancels: 0, onTimeCancels: 1 },
      days91To180: { completed: 1, noShows: 1, lateCancels: 0, onTimeCancels: 0 },
    };

    expect(flattenRecencyBuckets(recencyBuckets)).toEqual({
      completed: 6,
      noShows: 2,
      lateCancels: 1,
      onTimeCancels: 1,
    });
  });
});

describe("countNoShowsLast90Days", () => {
  it("counts no-shows from last 30 and 31-90 day buckets only", () => {
    const recencyBuckets: RecencyBuckets = {
      last30Days: { completed: 0, noShows: 2, lateCancels: 0, onTimeCancels: 0 },
      days31To90: { completed: 0, noShows: 1, lateCancels: 0, onTimeCancels: 0 },
      days91To180: { completed: 0, noShows: 5, lateCancels: 0, onTimeCancels: 0 },
    };

    expect(countNoShowsLast90Days(recencyBuckets)).toBe(3);
  });
});
