"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { createEventType, restoreEventType, updateEventType } from "./actions";
import { DiscardConfirmationDialog } from "./discard-confirmation-dialog";
import { EmptyPane } from "./empty-pane";
import { ServiceEditorForm } from "./service-editor-form";
import { ServiceListRow } from "./service-list-row";
import type {
  ConfirmState,
  PendingTarget,
  ServiceRow,
  ShopContext,
  ServiceEditorValues,
  ServiceField,
} from "./types";

type ServicesEditorShellProps = {
  services: ServiceRow[];
  shopContext: ShopContext;
};

function rowToValues(row: ServiceRow): ServiceEditorValues {
  return {
    name: row.name,
    description: row.description ?? "",
    durationMinutes: row.durationMinutes,
    bufferMinutes: row.bufferMinutes,
    depositAmountCents: row.depositAmountCents,
    isHidden: row.isHidden,
    isActive: row.isActive,
  };
}

function isDirtyValues(draft: ServiceEditorValues, baseline: ServiceEditorValues): boolean {
  return (
    draft.name !== baseline.name ||
    draft.description !== baseline.description ||
    draft.durationMinutes !== baseline.durationMinutes ||
    draft.bufferMinutes !== baseline.bufferMinutes ||
    draft.depositAmountCents !== baseline.depositAmountCents ||
    draft.isHidden !== baseline.isHidden ||
    draft.isActive !== baseline.isActive
  );
}

export function ServicesEditorShell({ services, shopContext }: ServicesEditorShellProps) {
  const [serviceRows, setServiceRows] = useState(services);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"empty" | "edit" | "create">("empty");
  const [baseline, setBaseline] = useState<ServiceEditorValues | null>(null);
  const [draft, setDraft] = useState<ServiceEditorValues | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ServiceField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pendingTarget, setPendingTarget] = useState<PendingTarget>(null);
  const [restorePendingId, setRestorePendingId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    pendingTarget: null,
    variant: "discard",
  });

  const selectedService =
    selectedId === null ? null : (serviceRows.find((service) => service.id === selectedId) ?? null);

  useEffect(() => {
    if (!dirty) {
      return;
    }

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  useEffect(() => {
    if (!restoreError) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRestoreError(null);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [restoreError]);

  function getCreateDefaults(): ServiceEditorValues {
    return {
      name: "",
      description: "",
      durationMinutes: shopContext.slotMinutes,
      bufferMinutes: null,
      depositAmountCents: null,
      isHidden: false,
      isActive: true,
    };
  }

  function applyTarget(target: PendingTarget) {
    if (!target) {
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSaveSuccess(false);
    setPendingTarget(null);

    switch (target.kind) {
      case "select": {
        const service = serviceRows.find((item) => item.id === target.id);
        if (!service) {
          return;
        }

        const values = rowToValues(service);
        setSelectedId(target.id);
        setBaseline(values);
        setDraft(values);
        setMode("edit");
        setDirty(false);
        return;
      }
      case "create": {
        const defaults = getCreateDefaults();
        setSelectedId(null);
        setBaseline(defaults);
        setDraft(defaults);
        setMode("create");
        setDirty(false);
        return;
      }
      case "empty": {
        setSelectedId(null);
        setBaseline(null);
        setDraft(null);
        setMode("empty");
        setDirty(false);
        return;
      }
      case "restore": {
        // BOUNDARY: R6 restore always returns a service to the standard public/bookable state.
        void handleRestore(target.id);
        return;
      }
    }
  }

  function handleNavIntent(target: PendingTarget) {
    if (savePending || restorePendingId !== null) {
      return;
    }

    if (!dirty) {
      applyTarget(target);
      return;
    }

    // BOUNDARY: R5.5 reserves the restore-specific confirmation copy for the dirty currently open row only.
    const variant =
      target?.kind === "restore" && target.id === selectedId ? "restore-current" : "discard";

    setPendingTarget(target);
    setConfirmState({
      open: true,
      pendingTarget: target,
      variant,
    });
  }

  function handleRowSelect(id: string) {
    handleNavIntent({ kind: "select", id });
  }

  function handleAddNew() {
    handleNavIntent({ kind: "create" });
  }

  function handleRestoreIntent(id: string) {
    handleNavIntent({ kind: "restore", id });
  }

  function handleFieldChange<K extends ServiceField>(field: K, value: ServiceEditorValues[K]) {
    setFieldErrors((current) => {
      if (!(field in current)) {
        return current;
      }

      return { ...current, [field]: undefined };
    });
    setFormError(null);
    setSaveSuccess(false);
    setDraft((current) => {
      if (!current) {
        return current;
      }

      const next = { ...current, [field]: value };
      setDirty(baseline ? isDirtyValues(next, baseline) : false);
      return next;
    });
  }

  async function handleSave() {
    if (!draft) {
      return;
    }

    setSavePending(true);
    setFieldErrors({});
    setFormError(null);
    setSaveSuccess(false);

    if (mode === "edit" && selectedId) {
      const result = await updateEventType(selectedId, draft);
      setSavePending(false);

      if (!result.ok) {
        if ("fieldErrors" in result) {
          setFieldErrors(result.fieldErrors);
        } else {
          setFormError(result.error);
        }
        return;
      }

      setServiceRows((current) =>
        current.map((service) =>
          service.id === selectedId
            ? {
                ...service,
                name: draft.name,
                description: draft.description || null,
                durationMinutes: draft.durationMinutes,
                bufferMinutes: draft.bufferMinutes as 0 | 5 | 10 | null,
                depositAmountCents: draft.depositAmountCents,
                isHidden: draft.isHidden,
                isActive: draft.isActive,
              }
            : service
        )
      );
      setBaseline(draft);
      setDirty(false);
      setSaveSuccess(true);
      window.setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
      return;
    }

    const createResult = await createEventType(draft);
    setSavePending(false);

    if (!createResult) {
      setFormError("Service could not be created");
      return;
    }

    if (!createResult.ok) {
      if ("fieldErrors" in createResult) {
        setFieldErrors(createResult.fieldErrors);
      } else {
        setFormError(createResult.error);
      }
      return;
    }

    const createdId = createResult.data.id;
    const newService: ServiceRow = {
      id: createdId,
      name: draft.name,
      description: draft.description || null,
      durationMinutes: draft.durationMinutes,
      bufferMinutes: draft.bufferMinutes as 0 | 5 | 10 | null,
      depositAmountCents: draft.depositAmountCents,
      isHidden: draft.isHidden,
      isActive: draft.isActive,
      isDefault: false,
    };

    setServiceRows((current) => [...current, newService]);
    setSelectedId(createdId);
    setMode("edit");
    setBaseline(draft);
    setDirty(false);
    setSaveSuccess(true);
    window.setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
  }

  async function handleRestore(id: string) {
    setRestorePendingId(id);
    setRestoreError(null);
    setFieldErrors({});
    setFormError(null);
    setSaveSuccess(false);

    const result = await restoreEventType(id);

    setRestorePendingId(null);

    if (!result.ok) {
      setRestoreError("error" in result ? result.error : "Restore failed");
      return;
    }

    setServiceRows((current) =>
      current.map((service) =>
        service.id === id
          ? {
              ...service,
              isHidden: false,
              isActive: true,
            }
          : service
      )
    );

    const service = serviceRows.find((item) => item.id === id);
    if (!service) {
      return;
    }

    // BOUNDARY: R6.3 requires the restored row to become selected and render fresh committed values.
    const restoredValues = rowToValues({
      ...service,
      isHidden: false,
      isActive: true,
    });
    setSelectedId(id);
    setMode("edit");
    setBaseline(restoredValues);
    setDraft(restoredValues);
    setDirty(false);
  }

  function handleCancel() {
    if (mode === "edit") {
      setDraft(baseline);
      setFieldErrors({});
      setFormError(null);
      setDirty(false);
      return;
    }

    handleNavIntent({ kind: "empty" });
  }

  function handleKeepEditing() {
    setPendingTarget(null);
    setConfirmState({
      open: false,
      pendingTarget: null,
      variant: "discard",
    });
  }

  function handleConfirmDiscard() {
    const target = pendingTarget ?? confirmState.pendingTarget;
    setPendingTarget(null);
    setConfirmState({
      open: false,
      pendingTarget: null,
      variant: "discard",
    });
    applyTarget(target);
  }

  const addNewDisabled = savePending || restorePendingId !== null;

  return (
    <div className="flex flex-col xl:flex-row gap-8 items-start">
      {/* Left column — service list. No section background per Stitch; cards carry their own shadow. */}
      <section className={cn("w-full xl:w-1/2 flex flex-col gap-4", mode !== "empty" && "max-xl:hidden")}>
        <div className="flex items-center justify-between gap-4">
          <h2
            className="text-xs font-bold uppercase tracking-widest opacity-60"
            style={{ color: "var(--al-on-surface-variant)" }}
          >
            Your Services
          </h2>
          <motion.button
            type="button"
            onClick={handleAddNew}
            disabled={addNewDisabled}
            className={cn(
              "flex items-center gap-1.5 text-sm font-bold hover:underline underline-offset-4",
              addNewDisabled && "cursor-not-allowed opacity-60",
            )}
            style={{ color: "var(--al-primary)" }}
            whileHover={!addNewDisabled ? { scale: 1.04 } : {}}
            whileTap={!addNewDisabled ? { scale: 0.96 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined"
              style={{ fontSize: "16px" }}
            >
              add
            </span>
            Add New
          </motion.button>
        </div>

        <div className="flex flex-col gap-3">
          {restoreError ? (
            <p
              className="rounded-2xl px-4 py-3 text-sm"
              style={{
                background: "var(--al-error-container)",
                color: "var(--al-on-error-container)",
              }}
            >
              {restoreError}
            </p>
          ) : null}
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {serviceRows.map((service) => (
                <motion.div
                  key={service.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ServiceListRow
                    service={service}
                    shopContext={shopContext}
                    isSelected={service.id === selectedId}
                    onSelect={handleRowSelect}
                    onRestore={handleRestoreIntent}
                    restorePending={restorePendingId === service.id}
                    savePending={savePending}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          {serviceRows.length === 0 && (
            <div
              className="xl:hidden rounded-2xl p-8 text-center"
              style={{ background: "var(--al-surface-container-low)" }}
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined mx-auto block mb-3"
                style={{ fontSize: "2rem", color: "var(--al-outline-variant)" }}
              >
                inventory_2
              </span>
              <p className="text-sm" style={{ color: "var(--al-on-surface-variant)" }}>
                No services yet. Click{" "}
                <strong style={{ color: "var(--al-primary)" }}>Add New</strong> to create your first.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Right column — sticky white card with split content + footer regions. */}
      <section
        className={cn(
          "w-full xl:w-1/2 xl:sticky xl:top-24 rounded-3xl border overflow-hidden flex flex-col",
          mode === "empty" && "max-xl:hidden",
        )}
        style={{
          background: "var(--al-surface-container-lowest)",
          borderColor: "rgba(195, 198, 209, 0.30)",
          boxShadow: "0 8px 32px rgba(26, 28, 27, 0.08)",
        }}
      >
        <AnimatePresence mode="wait">
          {mode === "empty" ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <EmptyPane hasServices={serviceRows.length > 0} />
            </motion.div>
          ) : draft ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 flex flex-col"
            >
              {/* Mobile back navigation — hidden on xl+ */}
              <div
                className="xl:hidden flex items-center px-6 pt-5 pb-4 border-b"
                style={{ borderColor: "rgba(195, 198, 209, 0.22)" }}
              >
                <button
                  type="button"
                  onClick={() => handleNavIntent({ kind: "empty" })}
                  disabled={savePending || restorePendingId !== null}
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-semibold transition-opacity",
                    (savePending || restorePendingId !== null) && "opacity-40 cursor-not-allowed",
                  )}
                  style={{ color: "var(--al-on-surface-variant)" }}
                >
                  <span
                    aria-hidden="true"
                    className="material-symbols-outlined"
                    style={{ fontSize: "18px" }}
                  >
                    arrow_back
                  </span>
                  <span>All services</span>
                </button>
              </div>

              <div className="p-8 flex-1 flex flex-col gap-6">
                <div>
                  <h3
                    className="font-[family-name:var(--al-font-headline)] text-2xl font-extrabold text-balance"
                    style={{ color: "var(--al-primary)" }}
                  >
                    {mode === "create" ? "New Service" : "Edit Service"}
                  </h3>
                  <p
                    className="text-sm mt-1 text-pretty"
                    style={{ color: "var(--al-on-surface-variant)" }}
                  >
                    {mode === "create"
                      ? "Set up the draft values for a new service before saving it."
                      : `Updating: ${selectedService?.name ?? "this service"}`}
                  </p>
                </div>

                <ServiceEditorForm
                  mode={mode}
                  draft={draft}
                  shopContext={shopContext}
                  fieldErrors={fieldErrors}
                  formError={formError}
                  onFieldChange={handleFieldChange}
                  onSave={handleSave}
                  onCancel={handleCancel}
                  savePending={savePending}
                  saveSuccess={saveSuccess}
                />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </section>

      <DiscardConfirmationDialog
        open={confirmState.open}
        variant={confirmState.variant}
        onKeepEditing={handleKeepEditing}
        onConfirm={handleConfirmDiscard}
      />
    </div>
  );
}
