export interface CustomerSearchResult {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  tier: "top" | "neutral" | "risk" | null;
  href: string;
}

export interface AppointmentSearchResult {
  id: string;
  startsAt: Date;
  status: "pending" | "booked" | "ended";
  customerName: string;
  eventTypeName: string | null;
  href: string;
}

export interface SearchResponse {
  query: string;
  customers: CustomerSearchResult[];
  appointments: AppointmentSearchResult[];
}
