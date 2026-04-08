"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Eye, MessageSquare, Phone, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ContactDialog } from "@/components/dashboard/contact-popover";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

type ActionButtonsProps = {
  appointmentId: string;
  customerPhone: string;
  customerEmail: string;
  bookingUrl: string | null;
  confirmationStatus: "none" | "pending" | "confirmed" | "expired";
};

export function ActionButtons({
  appointmentId,
  customerPhone,
  customerEmail,
  bookingUrl,
  confirmationStatus,
}: ActionButtonsProps) {
  const router = useRouter();
  const [showContact, setShowContact] = useState(false);
  const [loadingAction, setLoadingAction] = useState<"remind" | "confirm" | null>(
    null
  );

  const postAction = async (
    action: "remind" | "confirm",
    defaultSuccessMessage: string
  ) => {
    setLoadingAction(action);

    try {
      const response = await fetch(`/api/appointments/${appointmentId}/${action}`, {
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string; message?: string; status?: string; success?: boolean }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? payload?.message ?? `Failed to ${action} appointment`);
      }

      // Show detailed feedback based on status
      if (payload?.status === "sent") {
        toast.success(payload.message ?? defaultSuccessMessage);
      } else if (payload?.status === "already_sent") {
        toast.info(payload.message ?? "Already sent");
      } else if (payload?.status === "consent_missing") {
        toast.error(payload.message ?? "Customer has not opted in to SMS");
      } else {
        toast.success(payload?.message ?? defaultSuccessMessage);
      }

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${action} appointment`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCancel = () => {
    if (!bookingUrl) {
      toast.error("No manage link is available for this appointment");
      return;
    }

    router.push(bookingUrl);
  };

  return (
    <Dialog open={showContact} onOpenChange={setShowContact}>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          className="border-white/15 bg-white/5 text-white"
        >
          <Link href={`/app/appointments/${appointmentId}`}>
            <Eye className="h-4 w-4" />
            View
          </Link>
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-white/15 bg-white/5 text-white"
          onClick={() => setShowContact(true)}
          aria-expanded={showContact}
          aria-haspopup="dialog"
        >
          <Phone className="h-4 w-4" />
          Contact
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-sky-500/30 bg-sky-500/10 text-sky-100 hover:border-sky-400/40 hover:bg-sky-500/15 hover:text-white"
          disabled={loadingAction !== null}
          onClick={() => void postAction("remind", "Reminder sent")}
        >
          <MessageSquare className="h-4 w-4" />
          {loadingAction === "remind" ? "Sending..." : "Remind"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:border-emerald-400/40 hover:bg-emerald-500/15 hover:text-white"
          disabled={loadingAction !== null || confirmationStatus === "confirmed"}
          onClick={() => void postAction("confirm", "Confirmation request sent")}
        >
          <CheckCircle2 className="h-4 w-4" />
          {loadingAction === "confirm" ? "Sending..." : "Confirm"}
        </Button>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-rose-500/30 bg-rose-500/10 text-rose-100 hover:border-rose-400/40 hover:bg-rose-500/15 hover:text-white"
          onClick={handleCancel}
        >
          <XCircle className="h-4 w-4" />
          Cancel
        </Button>
      </div>

      <ContactDialog
        phone={customerPhone}
        email={customerEmail}
        onClose={() => setShowContact(false)}
      />
    </Dialog>
  );
}
