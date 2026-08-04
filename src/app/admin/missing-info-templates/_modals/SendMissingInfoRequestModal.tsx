"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Rselect from "react-select";
import { MissingInfoTemplate } from "@/hooks/api/missing-info-template.api";

interface Client {
  id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
}

interface SendMissingInfoRequestModalProps {
  open: boolean;
  onClose: () => void;
  template: MissingInfoTemplate;
  clients: Client[];
  onSend: (payload: {
    clientId: string;
    templateId: string;
    jobApplicationId?: string;
    personalMessage?: string;
    channel: "email" | "whatsapp";
  }) => void;
  isSending: boolean;
}

const rsStyles = {
  control: (p: any) => ({
    ...p,
    backgroundColor: "#F9FAFB",
    color: "#1F2937",
    border: "1px solid #E5E9EF",
    borderRadius: "8px",
    minHeight: "38px",
    boxShadow: "none",
    fontSize: "13px",
    "&:hover": { borderColor: "#9ca3af" },
  }),
  option: (p: any, s: any) => ({
    ...p,
    backgroundColor: s.isFocused ? "#f3f4f6" : "white",
    color: "#1F2937",
    cursor: "pointer",
    fontSize: "13px",
    "&:active": { backgroundColor: "#e5e7eb" },
  }),
  singleValue: (p: any) => ({ ...p, color: "#1F2937" }),
  menu: (p: any) => ({ ...p, zIndex: 9999, borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }),
  placeholder: (p: any) => ({ ...p, color: "#9ca3af", fontSize: "13px" }),
};

export default function SendMissingInfoRequestModal({
  open,
  onClose,
  template,
  clients,
  onSend,
  isSending,
}: SendMissingInfoRequestModalProps) {
  const [selectedClient, setSelectedClient] = useState<Client | undefined>(undefined);
  const [jobApplicationUrl, setJobApplicationUrl] = useState("");
  const [personalMessage, setPersonalMessage] = useState("");
  const [channel, setChannel] = useState<"email" | "whatsapp">("whatsapp");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!selectedClient) errs.clientId = "Please select a client";
    if (channel === "whatsapp" && selectedClient && !selectedClient.whatsappNumber) {
      errs.channel = "Client has no WhatsApp number. Choose Email instead.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSend({
      clientId: selectedClient!.id,
      templateId: template.id,
      jobApplicationId: jobApplicationUrl || undefined,
      personalMessage: personalMessage || undefined,
      channel,
    });
  };

  const handleClose = () => {
    setSelectedClient(undefined);
    setJobApplicationUrl("");
    setPersonalMessage("");
    setChannel("whatsapp");
    setErrors({});
    onClose();
  };

  const fieldCount = template.fields?.length ?? 0;
  const refereeCount = template.type === "referee_block"
    ? Math.max(...(template.fields?.map((f) => f.refereeBlockIndex ?? 0) ?? [0]))
    : 0;

  const clientOptions = clients.map((c) => ({
    ...c,
    label: `${c.firstName ?? ""} ${c.middleName ?? ""} ${c.lastName ?? ""}`.trim() + ` — ${c.email}`,
    value: c.id,
  }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[460px] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[17px] text-[#10365A]">
            Send missing-info request
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-0 py-2">
          <Label className="text-[12px] font-semibold text-[#1F2937] mt-0 mb-1.5">Client *</Label>
          <Rselect
            styles={rsStyles}
            value={selectedClient ? { ...selectedClient, label: `${selectedClient.firstName ?? ""} ${selectedClient.middleName ?? ""} ${selectedClient.lastName ?? ""}`.trim() + ` — ${selectedClient.email}`, value: selectedClient.id } : null}
            options={clientOptions}
            getOptionLabel={(u: any) => u?.label || ""}
            getOptionValue={(u: any) => u?.value || ""}
            onChange={(value) => setSelectedClient(value ?? undefined)}
            placeholder="Search for a client..."
            isClearable
          />
          {errors.clientId && <p className="text-[11px] text-red-500 mt-1">{errors.clientId}</p>}

          <Label className="text-[12px] font-semibold text-[#1F2937] mt-3.5 mb-1.5">Template *</Label>
          <Input
            value={`${template.name} (${template.type === "referee_block" ? `${refereeCount} referees` : `${fieldCount} fields`})`}
            disabled
            className="border border-[#E5E9EF] bg-[#F9FAFB] rounded-lg text-[13px]"
          />

          <Label className="text-[12px] font-semibold text-[#1F2937] mt-3.5 mb-1.5">Linked to job application</Label>
          <Input
            type="url"
            value={jobApplicationUrl}
            onChange={(e) => setJobApplicationUrl(e.target.value)}
            placeholder="https://www.cvtocareer.com/..."
            className="border border-[#E5E9EF] bg-[#F9FAFB] rounded-lg text-[13px]"
          />
          <p className="text-[11px] text-[#9CA3AF] mt-1">Helps the client understand why this info is needed</p>

          <Label className="text-[12px] font-semibold text-[#1F2937] mt-3.5 mb-1.5">Personal message to client (optional)</Label>
          <Textarea
            value={personalMessage}
            onChange={(e) => setPersonalMessage(e.target.value)}
            placeholder="e.g. Hi Itoro — Bunnings needs your referees by Friday to progress your application…"
            rows={3}
            className="border border-[#E5E9EF] bg-[#F9FAFB] rounded-lg text-[13px] min-h-[60px] resize-y"
          />

          <Label className="text-[12px] font-semibold text-[#1F2937] mt-3.5 mb-1.5">Send via *</Label>
          <div className="flex gap-2.5 mt-1">
            <button
              type="button"
              onClick={() => setChannel("whatsapp")}
              className={`flex-1 border rounded-lg px-3 py-2.5 text-[13px] font-medium flex items-center gap-2 transition-colors ${
                channel === "whatsapp"
                  ? "border-[#0B96D6] bg-[#EAF6FF] text-[#10365A] font-semibold"
                  : "border-[#E5E9EF] bg-white text-[#6B7280]"
              }`}
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setChannel("email")}
              className={`flex-1 border rounded-lg px-3 py-2.5 text-[13px] font-medium flex items-center gap-2 transition-colors ${
                channel === "email"
                  ? "border-[#0B96D6] bg-[#EAF6FF] text-[#10365A] font-semibold"
                  : "border-[#E5E9EF] bg-white text-[#6B7280]"
              }`}
            >
              Email
            </button>
          </div>
          <p className="text-[11px] text-[#9CA3AF] mt-1">WhatsApp is recommended — highest open rate</p>
          {errors.channel && <p className="text-[11px] text-red-500 mt-1">{errors.channel}</p>}

          <Label className="text-[12px] font-semibold text-[#1F2937] mt-3.5 mb-1.5">Reminder if no response</Label>
          <Input
            value="After 48 hours"
            disabled
            className="border border-[#E5E9EF] bg-[#F9FAFB] rounded-lg text-[13px] text-[#9CA3AF]"
          />
        </div>

        <DialogFooter className="gap-2.5 mt-1">
          <Button variant="outline" onClick={handleClose} className="border border-[#E5E9EF] text-[#10365A] font-semibold text-[13px]">
            Save as draft
          </Button>
          <Button onClick={handleSubmit} disabled={isSending} className="bg-[#0B96D6] hover:bg-[#0a86c0] text-white font-semibold text-[13px]">
            {isSending ? "Sending..." : "Send request →"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
