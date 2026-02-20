import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PhoneMockupProps = {
  className?: string;
  children: ReactNode;
};

export function PhoneMockup({ className, children }: PhoneMockupProps) {
  return (
    <div className={cn("relative", className)}>
      <div className="relative mx-auto h-[520px] w-[260px] overflow-hidden rounded-[2.5rem] border-[8px] border-gray-800 bg-gray-900 shadow-[0_22px_55px_rgba(0,0,0,0.5)] lg:h-[560px] lg:w-[280px]">
        <div className="absolute top-0 left-1/2 z-10 h-[25px] w-[120px] -translate-x-1/2 transform rounded-b-xl bg-gray-900" />
        <div className="h-full w-full overflow-hidden rounded-[2rem] bg-white">{children}</div>
      </div>
    </div>
  );
}
