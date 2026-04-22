"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

type ContactPopoverProps = {
  phone: string;
  email: string;
  onClose: () => void;
};

export function ContactPopover({ phone, email, onClose }: ContactPopoverProps) {
  const timeoutRef = useRef<number | null>(null);
  const [copiedField, setCopiedField] = useState<"phone" | "email" | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, [onClose]);

  const handleCopy = async (value: string, field: "phone" | "email") => {
    try {
      await copyToClipboard(value);
      setCopiedField(field);
      toast.success(field === "phone" ? "Phone copied!" : "Email copied!");

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setCopiedField(null);
        timeoutRef.current = null;
      }, 2000);
    } catch {
      toast.error(field === "phone" ? "Failed to copy phone" : "Failed to copy email");
    }
  };

  return (
    <div
      className="absolute right-0 top-full z-20 mt-2 hidden w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-al-outline-variant/30 bg-al-surface-lowest p-4 shadow-xl md:block"
      role="dialog"
      aria-label="Customer contact details"
    >
      <ContactDetailsPanel
        phone={phone}
        email={email}
        copiedField={copiedField}
        onCopy={handleCopy}
      />
    </div>
  );
}

type ContactDialogProps = {
  phone: string;
  email: string;
  onClose: () => void;
};

export function ContactDialog({ phone, email, onClose }: ContactDialogProps) {
  const timeoutRef = useRef<number | null>(null);
  const [copiedField, setCopiedField] = useState<"phone" | "email" | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async (value: string, field: "phone" | "email") => {
    try {
      await copyToClipboard(value);
      setCopiedField(field);
      toast.success(field === "phone" ? "Phone copied!" : "Email copied!");

      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setCopiedField(null);
        timeoutRef.current = null;
      }, 2000);
    } catch {
      toast.error(field === "phone" ? "Failed to copy phone" : "Failed to copy email");
    }
  };

  return (
    <DialogContent
      className="w-[calc(100%-2rem)] max-w-md p-5 text-foreground"
      onPointerDownOutside={onClose}
      onEscapeKeyDown={onClose}
    >
      <DialogHeader>
        <DialogTitle>Customer contact</DialogTitle>
        <DialogDescription className="text-al-on-surface-variant">
          Use the details below to call, text, or email the customer.
        </DialogDescription>
      </DialogHeader>
      <ContactDetailsPanel
        phone={phone}
        email={email}
        copiedField={copiedField}
        onCopy={handleCopy}
      />
    </DialogContent>
  );
}

function ContactDetailsPanel({
  phone,
  email,
  copiedField,
  onCopy,
}: {
  phone: string;
  email: string;
  copiedField: "phone" | "email" | null;
  onCopy: (value: string, field: "phone" | "email") => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      <ContactRow
        icon={<Phone className="h-4 w-4 text-al-on-surface-variant" />}
        label="Phone"
        value={phone}
        copied={copiedField === "phone"}
        onCopy={() => void onCopy(phone, "phone")}
      />
      <ContactRow
        icon={<Mail className="h-4 w-4 text-al-on-surface-variant" />}
        label="Email"
        value={email}
        copied={copiedField === "email"}
        onCopy={() => void onCopy(email, "email")}
      />
    </div>
  );
}

function ContactRow({
  icon,
  label,
  value,
  copied,
  onCopy,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border border-al-outline-variant/30 bg-al-surface-low p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon}
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-al-on-surface-variant">
            {label}
          </span>
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-al-outline-variant/30 bg-al-surface-lowest text-al-on-surface-variant transition hover:border-al-outline-variant/50 hover:bg-al-surface-container hover:text-foreground"
          aria-label={`Copy ${label.toLowerCase()}`}
          title={`Copy ${label.toLowerCase()}`}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
      <p className="mt-2 break-all pr-10 text-sm text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}
