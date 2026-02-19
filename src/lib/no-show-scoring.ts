export type NoShowRisk = "low" | "medium" | "high";

export interface AppointmentOutcomeCounts {
  completed: number;
  noShows: number;
  lateCancels: number;
  onTimeCancels: number;
}

export interface RecencyBuckets {
  last30Days: AppointmentOutcomeCounts;
  days31To90: AppointmentOutcomeCounts;
  days91To180: AppointmentOutcomeCounts;
}

export interface BookingContext {
  leadTimeHours: number;
  appointmentHour: number;
  paymentRequired: boolean;
}

const SCORING_CONSTANTS = {
  baseScore: 75,
  completedPoints: 5,
  completedCap: 25,
  noShowPenalty: -15,
  lateCancelPenalty: -5,
  onTimeCancelPenalty: -2,
  recencyMultipliers: {
    last30Days: 1.5,
    days31To90: 1,
    days91To180: 0.5,
  },
  bookingAdjustments: {
    shortLeadTimePenalty: -10,
    earlyMorningPenalty: -5,
    noPaymentPenalty: -5,
  },
  minScore: 0,
  maxScore: 100,
} as const;

const TIER_THRESHOLDS = {
  lowMinScore: 70,
  lowMaxNoShowsIn90Days: 0,
  highMaxScore: 39,
  highMinNoShowsIn90Days: 2,
} as const;

export function calculateNoShowScore(
  recencyBuckets: RecencyBuckets,
  bookingContext?: BookingContext
): number {
  const {
    baseScore,
    completedPoints,
    completedCap,
    noShowPenalty,
    lateCancelPenalty,
    onTimeCancelPenalty,
    recencyMultipliers,
    bookingAdjustments,
    minScore,
    maxScore,
  } = SCORING_CONSTANTS;

  let score = baseScore;
  let totalCompletedPoints = 0;

  const buckets = [
    { counts: recencyBuckets.last30Days, multiplier: recencyMultipliers.last30Days },
    { counts: recencyBuckets.days31To90, multiplier: recencyMultipliers.days31To90 },
    { counts: recencyBuckets.days91To180, multiplier: recencyMultipliers.days91To180 },
  ];

  for (const { counts, multiplier } of buckets) {
    totalCompletedPoints += counts.completed * completedPoints * multiplier;
    score += counts.noShows * noShowPenalty * multiplier;
    score += counts.lateCancels * lateCancelPenalty * multiplier;
    score += counts.onTimeCancels * onTimeCancelPenalty * multiplier;
  }

  score += Math.min(totalCompletedPoints, completedCap);

  if (bookingContext) {
    if (bookingContext.leadTimeHours < 24) {
      score += bookingAdjustments.shortLeadTimePenalty;
    }

    if (bookingContext.appointmentHour >= 6 && bookingContext.appointmentHour < 9) {
      score += bookingAdjustments.earlyMorningPenalty;
    }

    if (!bookingContext.paymentRequired) {
      score += bookingAdjustments.noPaymentPenalty;
    }
  }

  return Math.max(minScore, Math.min(maxScore, Math.round(score)));
}

export function assignNoShowRisk(score: number, noShowsLast90Days: number): NoShowRisk {
  const { lowMinScore, lowMaxNoShowsIn90Days, highMaxScore, highMinNoShowsIn90Days } =
    TIER_THRESHOLDS;

  if (score >= lowMinScore && noShowsLast90Days <= lowMaxNoShowsIn90Days) {
    return "low";
  }

  if (score <= highMaxScore || noShowsLast90Days >= highMinNoShowsIn90Days) {
    return "high";
  }

  return "medium";
}

export function flattenRecencyBuckets(recencyBuckets: RecencyBuckets): AppointmentOutcomeCounts {
  return {
    completed:
      recencyBuckets.last30Days.completed +
      recencyBuckets.days31To90.completed +
      recencyBuckets.days91To180.completed,
    noShows:
      recencyBuckets.last30Days.noShows +
      recencyBuckets.days31To90.noShows +
      recencyBuckets.days91To180.noShows,
    lateCancels:
      recencyBuckets.last30Days.lateCancels +
      recencyBuckets.days31To90.lateCancels +
      recencyBuckets.days91To180.lateCancels,
    onTimeCancels:
      recencyBuckets.last30Days.onTimeCancels +
      recencyBuckets.days31To90.onTimeCancels +
      recencyBuckets.days91To180.onTimeCancels,
  };
}

export function countNoShowsLast90Days(recencyBuckets: RecencyBuckets): number {
  return recencyBuckets.last30Days.noShows + recencyBuckets.days31To90.noShows;
}
