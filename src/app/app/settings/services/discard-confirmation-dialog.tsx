"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DiscardConfirmationDialogProps = {
  open: boolean;
  variant: "discard" | "restore-current";
  onKeepEditing: () => void;
  onConfirm: () => void;
};

export function DiscardConfirmationDialog({
  open,
  variant,
  onKeepEditing,
  onConfirm,
}: DiscardConfirmationDialogProps) {
  const title = "You have unsaved changes";
  const description =
    variant === "restore-current"
      ? "Keep editing to preserve them, or restore this service and replace them with the restored values."
      : "Keep editing to preserve them, or discard them and continue.";
  const confirmLabel =
    variant === "restore-current" ? "Restore service" : "Discard changes";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onKeepEditing()}>
      <DialogContent
        className="max-w-[400px] rounded-[32px] border-none p-8"
        showCloseButton={false}
        style={{
          background: "var(--al-surface-container-lowest)",
          boxShadow: "0 20px 50px rgba(0, 30, 64, 0.15)",
        }}
      >
        <DialogHeader className="space-y-3 text-left">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
            style={{ background: "var(--al-surface-container-low)" }}
          >
            <span
              className="material-symbols-outlined"
              style={{ color: "var(--al-primary)", fontSize: "24px" }}
            >
              {variant === "restore-current" ? "settings_backup_restore" : "edit_note"}
            </span>
          </div>
          <DialogTitle
            className="text-balance font-[family-name:var(--al-font-headline)] text-2xl font-extrabold tracking-tight"
            style={{ color: "var(--al-primary)" }}
          >
            {title}
          </DialogTitle>
          <DialogDescription
            className="text-pretty text-sm font-medium leading-relaxed"
            style={{ color: "var(--al-on-surface-variant)", opacity: 0.8 }}
          >
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-8 flex-col sm:flex-row gap-3">
          <Button
            onClick={onKeepEditing}
            type="button"
            variant="al-primary"
            className="w-full sm:w-auto px-8 py-6 rounded-2xl text-[11px] font-extrabold uppercase tracking-widest shadow-lg shadow-[var(--al-primary)]/20"
          >
            Keep editing
          </Button>
          <Button
            onClick={onConfirm}
            type="button"
            variant="ghost"
            className="w-full sm:w-auto px-4 py-3 rounded-2xl text-[11px] font-extrabold uppercase tracking-widest text-on-surface-variant opacity-60 hover:opacity-100"
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
