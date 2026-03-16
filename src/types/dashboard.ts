import type { Tier } from "@/lib/scoring";

export interface DashboardAppointment {
  id: string;
  startsAt: Date;
  endsAt: Date;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerTier: Tier | null;
  customerScore: number | null;
  voidedLast90Days: number;
  confirmationStatus: "none" | "pending" | "confirmed" | "expired";
  bookingUrl: string | null;
  smsOptIn: boolean;
}

export interface DashboardMonthlyStats {
  depositsRetained: number;
  refundsIssued: number;
}

export interface DashboardTierDistribution {
  top: number;
  neutral: number;
  risk: number;
}

export interface DashboardFilters {
  tier?: Tier | "all";
  timeRange?: number;
}

export interface DashboardSort {
  field: "time" | "score" | "tier";
  direction: "asc" | "desc";
}

export interface DashboardData {
  highRiskAppointments: DashboardAppointment[];
  totalUpcoming: number;
  depositsAtRisk: number;
  monthlyStats: DashboardMonthlyStats;
  tierDistribution: DashboardTierDistribution;
  allAppointments: DashboardAppointment[];
}
