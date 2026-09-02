"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { CommunicationTemplate } from "@/hooks/useCommunicationTemplates";

interface TestSendModalProps {
  open: boolean;
  onClose: () => void;
  template: CommunicationTemplate | null;
  resolveTestSend: (templateId: string) => Promise<{
    templateId: string;
    triggerKeyUsed: string | null;
    variables: Record<string, string>;
  }>;
  sendTestEmail: (payload: {
    templateId: string;
    values: Record<string, string>;
    triggerKeyUsed?: string | null;
  }) => Promise<{ success: boolean; recipientEmail: string }>;
}

export function TestSendModal({ open, onClose, template, resolveTestSend, sendTestEmail }: TestSendModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [triggerKeyUsed, setTriggerKeyUsed] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!open || !template) return;
    setValues({});
    setTriggerKeyUsed(null);
    setIsResolving(true);
    resolveTestSend(template.id)
      .then((data) => {
        setValues(data.variables);
        setTriggerKeyUsed(data.triggerKeyUsed);
      })
      .catch((e: any) => {
        toast.error(e?.message || "Failed to resolve preview values");
      })
      .finally(() => setIsResolving(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template?.id]);

  const handleSend = async () => {
    if (!template) return;
    setIsSending(true);
    const toastId = toast.loading("Sending test email...");
    try {
      const result = await sendTestEmail({ templateId: template.id, values, triggerKeyUsed });
      toast.dismiss(toastId);
      toast.success(`Test email sent to ${result.recipientEmail}`);
      onClose();
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e?.message || "Failed to send test email");
    } finally {
      setIsSending(false);
    }
  };

  const variableNames = Object.keys(values);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Test Send</DialogTitle>
          <p className="text-sm text-gray-500 mt-1">
            {template?.name} — sent only to the configured test address, never a real customer or your
            own inbox. Edit any value below before sending.
          </p>
        </DialogHeader>

        {isResolving ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 rounded-full border-4 border-gray-200 border-t-primary animate-spin" />
          </div>
        ) : variableNames.length === 0 ? (
          <p className="text-sm text-gray-400 py-4">This template has no variables to fill in.</p>
        ) : (
          <div className="grid gap-3 py-2">
            {variableNames.map((name) => (
              <div key={name} className="grid gap-1.5">
                <label className="text-xs font-mono text-gray-500">{name}</label>
                <Input
                  value={values[name] ?? ""}
                  onChange={(e) => setValues((prev) => ({ ...prev, [name]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSending}>
            Cancel
          </Button>
          <Button className="gap-2" onClick={() => void handleSend()} disabled={isSending || isResolving}>
            <Send size={14} /> {isSending ? "Sending..." : "Send Test Email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
