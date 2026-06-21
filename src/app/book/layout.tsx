import { BookingNav } from "@/components/booking/booking-nav";

export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <BookingNav />
      {children}
    </>
  );
}
