import { MessageSquare, MessageSquareOff } from "lucide-react";

interface SmsStatusBadgeProps {
  smsOptIn: boolean;
}

export function SmsStatusBadge({ smsOptIn }: SmsStatusBadgeProps) {
  if (smsOptIn) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200"
        title="SMS enabled - can receive reminders and confirmations"
      >
        <MessageSquare className="h-3 w-3" />
        SMS
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-xs text-rose-200"
      title="SMS disabled - cannot receive reminders and confirmations"
    >
      <MessageSquareOff className="h-3 w-3" />
      No SMS
    </span>
  );
}
