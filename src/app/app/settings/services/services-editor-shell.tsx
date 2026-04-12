"use client";

import { startTransition, useEffect, useState } from "react";
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

function getDefaultCreateDuration(services: ServiceRow[], fallbackDurationMinutes: number): number {
  if (services.length === 0) {
    return fallbackDurationMinutes;
  }

  const durationCounts = new Map<number, { count: number; firstIndex: number }>();

  services.forEach((service, index) => {
    const current = durationCounts.get(service.durationMinutes);
    if (current) {
      current.count += 1;
      return;
    }

    durationCounts.set(service.durationMinutes, { count: 1, firstIndex: index });
  });

  let selectedDuration = fallbackDurationMinutes;
  let selectedCount = 0;
  let selectedFirstIndex = Number.POSITIVE_INFINITY;

  durationCounts.forEach((entry, durationMinutes) => {
    if (
      entry.count > selectedCount ||
      (entry.count === selectedCount && entry.firstIndex < selectedFirstIndex)
    ) {
      selectedDuration = durationMinutes;
      selectedCount = entry.count;
      selectedFirstIndex = entry.firstIndex;
    }
  });

  return selectedDuration;
}

export function ServicesEditorShell({ services, shopContext }: ServicesEditorShellProps) {
  const emptyModeHint = "Select a service to edit, or click Add New.";
  const [awaitingServerSync, setAwaitingServerSync] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<"empty" | "edit" | "create">("empty");
  const [baseline, setBaseline] = useState<ServiceEditorValues | null>(null);
  const [draft, setDraft] = useState<ServiceEditorValues | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [saveSuccessLabel, setSaveSuccessLabel] = useState<"Created" | "Refined">("Refined");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ServiceField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [postCreateShareId, setPostCreateShareId] = useState<string | null>(null);
  const [pendingTarget, setPendingTarget] = useState<PendingTarget>(null);
  const [restorePendingId, setRestorePendingId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    open: false,
    pendingTarget: null,
    variant: "discard",
  });

  const selectedService =
    selectedId === null ? null : (services.find((service) => service.id === selectedId) ?? null);
  const selectedServiceValues = selectedService ? rowToValues(selectedService) : null;
  const shouldUseServerSelectedValues =
    mode === "edit" &&
    !dirty &&
    !awaitingServerSync &&
    selectedServiceValues !== null;
  const editorBaseline = shouldUseServerSelectedValues ? selectedServiceValues : baseline;
  const editorDraft = shouldUseServerSelectedValues ? selectedServiceValues : draft;

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

  useEffect(() => {
    if (
      !awaitingServerSync ||
      mode !== "edit" ||
      baseline === null ||
      !selectedServiceValues
    ) {
      return;
    }

    if (!isDirtyValues(selectedServiceValues, baseline)) {
      startTransition(() => {
        setAwaitingServerSync(false);
      });
    }
  }, [awaitingServerSync, baseline, mode, selectedServiceValues]);

  function getCreateDefaults(): ServiceEditorValues {
    return {
      name: "",
      description: "",
      durationMinutes: getDefaultCreateDuration(services, shopContext.slotMinutes),
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
    setPostCreateShareId(null);
    setPendingTarget(null);

    switch (target.kind) {
      case "select": {
        const service = services.find((item) => item.id === target.id);
        if (!service) {
          return;
        }

        const values = rowToValues(service);
        setAwaitingServerSync(false);
        setSelectedId(target.id);
        setBaseline(values);
        setDraft(values);
        setMode("edit");
        setDirty(false);
        return;
      }
      case "create": {
        const defaults = getCreateDefaults();
        setAwaitingServerSync(false);
        setSelectedId(null);
        setBaseline(defaults);
        setDraft(defaults);
        setMode("create");
        setDirty(false);
        return;
      }
      case "empty": {
        setAwaitingServerSync(false);
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
    if (!editorDraft) {
      return;
    }

    setFieldErrors((current) => {
      if (!(field in current)) {
        return current;
      }

      return { ...current, [field]: undefined };
    });
    setFormError(null);
    setSaveSuccess(false);
    setPostCreateShareId(null);
    const next = { ...editorDraft, [field]: value };
    setDraft(next);
    setDirty(editorBaseline ? isDirtyValues(next, editorBaseline) : false);
  }

  async function handleSave() {
    if (!editorDraft) {
      return;
    }

    const draftToSave = editorDraft;
    setSavePending(true);
    setFieldErrors({});
    setFormError(null);
    setSaveSuccess(false);

    if (mode === "edit" && selectedId) {
      const result = await updateEventType(selectedId, draftToSave);
      setSavePending(false);

      if (!result.ok) {
        if ("fieldErrors" in result) {
          setFieldErrors(result.fieldErrors);
        } else {
          setFormError(result.error);
        }
        return;
      }

      setAwaitingServerSync(true);
      setPostCreateShareId(null);
      setBaseline(draftToSave);
      setDraft(draftToSave);
      setDirty(false);
      setSaveSuccessLabel("Refined");
      setSaveSuccess(true);
      window.setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
      return;
    }

    const createResult = await createEventType(draftToSave);
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
    setAwaitingServerSync(true);
    setSelectedId(createdId);
    setMode("edit");
    setBaseline(draftToSave);
    setDraft(draftToSave);
    setDirty(false);
    setSaveSuccessLabel("Created");
    setSaveSuccess(true);
    setPostCreateShareId(draftToSave.isActive ? createdId : null);
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

    const service = services.find((item) => item.id === id);
    if (!service) {
      return;
    }

    // BOUNDARY: R6.3 requires the restored row to become selected and render fresh committed values.
    const restoredValues = rowToValues({
      ...service,
      isHidden: false,
      isActive: true,
    });
    setAwaitingServerSync(true);
    setPostCreateShareId(null);
    setSelectedId(id);
    setMode("edit");
    setBaseline(restoredValues);
    setDraft(restoredValues);
    setDirty(false);
  }

  function handleCancel() {
    if (mode === "edit") {
      setAwaitingServerSync(false);
      setBaseline(editorBaseline);
      setDraft(editorBaseline);
      setFieldErrors({});
      setFormError(null);
      setPostCreateShareId(null);
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
  const postCreateShareLink =
    mode === "edit" && selectedId !== null && postCreateShareId === selectedId
      ? `${shopContext.bookingBaseUrl}?service=${selectedId}`
      : null;
  const serviceSummary = services.reduce(
    (summary, service) => {
      summary.total += 1;
      if (service.isActive) {
        summary.active += 1;
      }
      if (service.isHidden) {
        summary.hidden += 1;
      }
      if (!service.isActive) {
        summary.inactive += 1;
      }
      return summary;
    },
    { total: 0, active: 0, hidden: 0, inactive: 0 }
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 30,
      },
    },
  } as const;

  return (
    <div className="flex flex-col xl:flex-row gap-12 items-start">
      {/* Left column — service list. No section background per Stitch; cards carry their own shadow. */}
      <section className={cn("w-full xl:w-1/2 space-y-6", mode !== "empty" && "max-xl:hidden")}>
        <div className="flex items-center justify-between mb-2">
          <h2
            className="text-[10px] font-extrabold uppercase tracking-[0.2em] opacity-50 text-on-surface-variant"
          >
            Your Services
          </h2>
          <button
            type="button"
            onClick={handleAddNew}
            disabled={addNewDisabled}
            className={cn(
              "flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-al-primary hover:underline underline-offset-4 transition-colors",
              addNewDisabled && "cursor-not-allowed opacity-40",
            )}
          >
            <span
              aria-hidden="true"
              className="material-symbols-outlined text-sm"
            >
              add
            </span>
            Add New Service
          </button>
        </div>
        {mode === "empty" && services.length > 0 ? (
          <p className="xl:hidden text-sm text-on-surface-variant">
            {emptyModeHint}
          </p>
        ) : null}

        <div className="flex flex-col gap-4">
          {restoreError ? (
            <p
              className="rounded-2xl px-6 py-4 text-sm font-medium bg-al-error-container text-al-on-error-container"
            >
              {restoreError}
            </p>
          ) : null}
          <motion.div
            className="flex flex-col gap-4"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <AnimatePresence initial={false}>
              {services.map((service) => (
                <motion.div
                  key={service.id}
                  layout
                  variants={itemVariants}
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
          </motion.div>
          {services.length === 0 && (
            <div
              className="xl:hidden rounded-[2rem] p-12 text-center bg-al-surface-low"
            >
              <span
                aria-hidden="true"
                className="material-symbols-outlined mx-auto block mb-4 opacity-20 text-5xl text-al-primary"
              >
                inventory_2
              </span>
              <p className="text-sm font-medium text-on-surface-variant">
                No services yet. Click{" "}
                <strong className="text-al-primary">Add New</strong> to create your first.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Right column — sticky white card with split content + footer regions. */}
      <section
        className={cn(
          "w-full xl:w-1/2 xl:sticky xl:top-24",
          mode === "empty" && "max-xl:hidden",
        )}
      >
        <div
          className="bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden flex flex-col shadow-[0px_40px_80px_rgba(26,28,27,0.08)]"
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
                <EmptyPane
                  addNewDisabled={addNewDisabled}
                  hasServices={services.length > 0}
                  onAddNew={handleAddNew}
                  orientationHint={emptyModeHint}
                  summary={serviceSummary}
                />
              </motion.div>
            ) : editorDraft ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 flex flex-col"
              >
                {/* Mobile back navigation — hidden on xl+ */}
                <div
                  className="xl:hidden flex items-center px-8 pt-6 pb-4 border-b"
                  style={{ borderColor: "var(--al-outline-variant)20" }}
                >
                  <button
                    type="button"
                    onClick={() => handleNavIntent({ kind: "empty" })}
                    disabled={savePending || restorePendingId !== null}
                    className={cn(
                      "flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-on-surface-variant transition-opacity",
                      (savePending || restorePendingId !== null) && "opacity-40 cursor-not-allowed",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className="material-symbols-outlined text-sm"
                    >
                      arrow_back
                    </span>
                    <span>All services</span>
                  </button>
                </div>

                <div className="p-10 md:p-12 flex-1 flex flex-col">
                  <div className="mb-10">
                    <h3
                      className="font-manrope text-3xl font-extrabold tracking-tight mb-2 text-al-primary"
                    >
                      {mode === "create" ? "New Service" : "Edit Service"}
                    </h3>
                    <p
                      className="text-sm font-medium opacity-70 text-on-surface-variant"
                    >
                      {mode === "create"
                        ? "Set up the draft values for a new service before saving it."
                        : `Updating: ${editorDraft.name}`}
                    </p>
                  </div>

                  <ServiceEditorForm
                    advancedOptionsKey={`${mode}:${selectedId ?? "new"}`}
                    mode={mode}
                    draft={editorDraft}
                    shopContext={shopContext}
                    fieldErrors={fieldErrors}
                    formError={formError}
                    onFieldChange={handleFieldChange}
                    onSave={handleSave}
                    onCancel={handleCancel}
                    postCreateShareLink={postCreateShareLink}
                    savePending={savePending}
                    saveSuccess={saveSuccess}
                    saveSuccessLabel={saveSuccessLabel}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
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
