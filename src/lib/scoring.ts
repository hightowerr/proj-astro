export type Tier = "top" | "neutral" | "risk";

export interface AppointmentCounts {
  settled: number;
  voided: number;
  refunded: number;
  lateCancels: number;
}

export interface RecencyData {
  last30Days: AppointmentCounts;
  days31To90: AppointmentCounts;
  over90Days: AppointmentCounts;
}

export interface ScoringStats {
  settled: number;
  voided: number;
  refunded: number;
  lateCancels: number;
  lastActivityAt: string | null;
  voidedLast90Days: number;
}

const SCORING_CONSTANTS = {
  baseScore: 50,
  settledPoints: 10,
  settledCap: 50,
  voidedPenalty: -20,
  refundedPenalty: -5,
  lateCancelPenalty: -10,
  recencyMultipliers: {
    last30Days: 2,
    days31To90: 1,
    over90Days: 0.5,
  },
  minScore: 0,
  maxScore: 100,
} as const;

const TIER_THRESHOLDS = {
  topMinScore: 80,
  topMaxVoidsIn90Days: 0,
  riskMaxScore: 39,
  riskMinVoidsIn90Days: 2,
} as const;

export function calculateScore(recencyData: RecencyData): number {
  const {
    baseScore,
    settledPoints,
    settledCap,
    voidedPenalty,
    refundedPenalty,
    lateCancelPenalty,
    recencyMultipliers,
    minScore,
    maxScore,
  } = SCORING_CONSTANTS;

  let score = baseScore;
  let settledContribution = 0;

  const buckets = [
    { counts: recencyData.last30Days, multiplier: recencyMultipliers.last30Days },
    { counts: recencyData.days31To90, multiplier: recencyMultipliers.days31To90 },
    { counts: recencyData.over90Days, multiplier: recencyMultipliers.over90Days },
  ];

  for (const { counts, multiplier } of buckets) {
    settledContribution += counts.settled * settledPoints * multiplier;
    score += counts.voided * voidedPenalty * multiplier;
    score += counts.refunded * refundedPenalty * multiplier;
    score += counts.lateCancels * lateCancelPenalty * multiplier;
  }

  score += Math.min(settledContribution, settledCap);
  return Math.max(minScore, Math.min(maxScore, Math.round(score)));
}

export function assignTier(score: number, voidedLast90Days: number): Tier {
  const {
    topMinScore,
    topMaxVoidsIn90Days,
    riskMaxScore,
    riskMinVoidsIn90Days,
  } = TIER_THRESHOLDS;

  if (score >= topMinScore && voidedLast90Days <= topMaxVoidsIn90Days) {
    return "top";
  }

  if (score <= riskMaxScore || voidedLast90Days >= riskMinVoidsIn90Days) {
    return "risk";
  }

  return "neutral";
}

export function flattenRecencyData(recencyData: RecencyData): AppointmentCounts {
  return {
    settled:
      recencyData.last30Days.settled +
      recencyData.days31To90.settled +
      recencyData.over90Days.settled,
    voided:
      recencyData.last30Days.voided +
      recencyData.days31To90.voided +
      recencyData.over90Days.voided,
    refunded:
      recencyData.last30Days.refunded +
      recencyData.days31To90.refunded +
      recencyData.over90Days.refunded,
    lateCancels:
      recencyData.last30Days.lateCancels +
      recencyData.days31To90.lateCancels +
      recencyData.over90Days.lateCancels,
  };
}
