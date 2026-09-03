"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { MenuItem, Select } from "@mui/material";
import { Lock, RotateCcw } from "lucide-react";
import type { CommunicationTemplate, EmailTrigger } from "@/hooks/useCommunicationTemplates";

const DISABLED_VALUE = "__disabled__";

interface TriggersTabProps {
  triggers: EmailTrigger[];
  templates: CommunicationTemplate[];
  isLoading: boolean;
  onRebind: (triggerKey: string, templateId: string | null) => Promise<unknown>;
  onReset: (triggerKey: string) => Promise<unknown>;
}

export function TriggersTab({ triggers, templates, isLoading, onRebind, onReset }: TriggersTabProps) {
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const handleRebind = async (triggerKey: string, templateId: string | null) => {
    if (templateId === "") return;
    setPendingKey(triggerKey);
    const toastId = toast.loading(templateId === null ? "Disabling trigger..." : "Rebinding trigger...");
    try {
      await onRebind(triggerKey, templateId);
      toast.dismiss(toastId);
      toast.success(templateId === null ? "Trigger disabled — it will send nothing." : "Trigger rebound.");
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to update trigger.");
    } finally {
      setPendingKey(null);
    }
  };

  const handleReset = async (triggerKey: string) => {
    setPendingKey(triggerKey);
    const toastId = toast.loading("Resetting to default...");
    try {
      await onReset(triggerKey);
      toast.dismiss(toastId);
      toast.success("Trigger reset to default.");
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to reset trigger.");
    } finally {
      setPendingKey(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center bg-white p-6 h-[20vh]">
        <div className="h-8 w-8 rounded-full border-4 border-gray-200 border-t-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-gray-500">
        Each row is a real trigger event in the codebase. Rebinding it makes a different template take
        over sending for that event, or pick "— Send nothing —" to turn it off entirely — the trigger
        key itself never changes either way. Locked rows carry account-security or payout emails and
        can't be reassigned or disabled.
      </p>
      <div className="grid gap-2">
        {triggers.map((trigger) => {
          const isPending = pendingKey === trigger.triggerKey;
          return (
            <div
              key={trigger.triggerKey}
              className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-primary/10 bg-white p-3.5 shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900">{trigger.label}</h4>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{trigger.triggerKey}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {trigger.disabled ? (
                    <span className="text-red-600 font-medium">Disabled — sends nothing</span>
                  ) : (
                    <>Currently: {trigger.resolvedTemplate?.name ?? "—"}</>
                  )}
                  {trigger.isBound && !trigger.disabled && <span className="text-primary"> (custom)</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {trigger.reassignable ? (
                  <>
                    <Select
                      size="small"
                      className="h-9 min-w-[200px]"
                      displayEmpty
                      value={trigger.disabled ? DISABLED_VALUE : trigger.resolvedTemplate?.id ?? ""}
                      disabled={isPending}
                      renderValue={() =>
                        trigger.disabled ? "— Send nothing —" : trigger.resolvedTemplate?.name ?? "Choose a template"
                      }
                      onChange={(e) => {
                        const v = e.target.value as string;
                        void handleRebind(trigger.triggerKey, v === DISABLED_VALUE ? null : v);
                      }}
                    >
                      {templates.map((t) => (
                        <MenuItem key={t.id} value={t.id}>
                          {t.name}
                        </MenuItem>
                      ))}
                      <MenuItem value={DISABLED_VALUE}>
                        <em>— Send nothing —</em>
                      </MenuItem>
                    </Select>
                    {trigger.isBound && (
                      <button
                        type="button"
                        title="Reset to default"
                        disabled={isPending}
                        onClick={() => void handleReset(trigger.triggerKey)}
                        className="p-2 text-gray-500 hover:text-primary rounded-full hover:bg-primary/10 transition-colors disabled:opacity-40"
                      >
                        <RotateCcw size={15} />
                      </button>
                    )}
                  </>
                ) : (
                  <span
                    title="Account-security or payout email — can't be reassigned"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500"
                  >
                    <Lock size={12} /> Locked
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
