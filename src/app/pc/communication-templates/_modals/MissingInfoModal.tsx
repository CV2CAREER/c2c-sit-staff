"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Send } from "lucide-react";
import Rselect from "react-select";
import CustomModal from "@/components/CustomModal/CustomModal";

interface NotifyUser {
  id: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email: string;
  phoneNumber?: string | null;
}

interface NotifyPayload {
  userId: string;
  missingInfoType: string;
  missingInfoUrl: string;
  mode: "email" | "whatsapp";
}

interface MissingInfoModalProps {
  open: boolean;
  onClose: () => void;
  users: NotifyUser[];
  onSend: (payload: NotifyPayload) => Promise<void>;
  isSending: boolean;
}

const jobReferencesUrl = typeof window !== "undefined" ? window.location.origin : "";

const missingInfoOptions = [
  { id: "Date_of_birth", label: "Date of birth", url: jobReferencesUrl },
  { id: "your_address", label: "Your Address", url: jobReferencesUrl },
  { id: "preferred_personal_pronouns", label: "Preferred Personal Pronouns", url: jobReferencesUrl },
  { id: "referral_information", label: "Referral Information", url: jobReferencesUrl },
];

const rsStyles = {
  control: (p: any) => ({
    ...p,
    backgroundColor: "white",
    color: "black",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    minHeight: "42px",
    boxShadow: "none",
    "&:hover": { borderColor: "#9ca3af" },
  }),
  option: (p: any, s: any) => ({
    ...p,
    backgroundColor: s.isFocused ? "#f3f4f6" : "white",
    color: "black",
    cursor: "pointer",
    "&:active": { backgroundColor: "#e5e7eb" },
  }),
  singleValue: (p: any) => ({ ...p, color: "black" }),
  menu: (p: any) => ({ ...p, zIndex: 9999, borderRadius: "8px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }),
  placeholder: (p: any) => ({ ...p, color: "#9ca3af" }),
};

export function MissingInfoModal({ open, onClose, users, onSend, isSending }: MissingInfoModalProps) {
  const [selectedUser, setSelectedUser] = useState<NotifyUser | undefined>(undefined);
  const [selectedInfoType, setSelectedInfoType] = useState("");
  const [infoTypes, setInfoTypes] = useState(missingInfoOptions);
  const [notificationMethod, setNotificationMethod] = useState<"email" | "whatsapp">("email");

  const selectedInfo = infoTypes.find((info) => info.id === selectedInfoType);

  const handleClose = () => {
    setSelectedUser(undefined);
    setSelectedInfoType("");
    setInfoTypes(missingInfoOptions);
    setNotificationMethod("email");
    onClose();
  };

  const handleSend = async () => {
    if (!selectedUser) return toast.error("Select a client to notify.");
    if (!selectedInfoType) return toast.error("Select missing information type.");
    if (!selectedInfo) return toast.error("Invalid missing information type.");
    if (notificationMethod === "whatsapp" && !selectedUser.phoneNumber) {
      return toast.error("Client phone number is required for WhatsApp notifications.");
    }

    await onSend({
      userId: selectedUser.id,
      missingInfoType: selectedInfoType,
      missingInfoUrl: selectedInfo.url,
      mode: notificationMethod,
    });

    handleClose();
  };

  return (
    <CustomModal toggleVisibility={handleClose} visibility={open}>
      <div className="bg-white p-6 rounded-xl space-y-6 max-w-md w-full">
        <h2 className="text-xl font-semibold text-gray-800">
          Notify Client of Missing Information
        </h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">Select a client</label>
          <Rselect
            styles={rsStyles}
            value={selectedUser}
            options={users}
            getOptionLabel={(u: any) =>
              `${u?.firstName ?? ""} ${u?.middleName ?? ""} ${u?.lastName ?? ""}`.trim()
            }
            getOptionValue={(u: any) => u?.id || ""}
            onChange={(value) => setSelectedUser(value ?? undefined)}
            placeholder="Search for a client..."
            isClearable
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">Missing Information</label>
          <select
            value={selectedInfoType}
            onChange={(e) => setSelectedInfoType(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
          >
            <option value="">Select missing information type</option>
            {infoTypes.map((info) => (
              <option key={info.id} value={info.id}>
                {info.label}
              </option>
            ))}
          </select>
        </div>

        {selectedInfo && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-600">
              Required URL (will be included in the notification)
            </label>
            <input
              type="text"
              value={selectedInfo.url}
              onChange={(e) =>
                setInfoTypes((prev) =>
                  prev.map((info) =>
                    info.id === selectedInfoType ? { ...info, url: e.target.value } : info,
                  ),
                )
              }
              className="w-full p-3 border border-gray-300 rounded-lg text-sm text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              placeholder="Enter the URL that will be sent to the client"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-600">Notify Client Via</label>
          <select
            value={notificationMethod}
            onChange={(e) => setNotificationMethod(e.target.value as "email" | "whatsapp")}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
          >
            <option value="email">Email</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>

        <button
          onClick={() => void handleSend()}
          disabled={!selectedUser || !selectedInfoType || isSending}
          className="w-full inline-flex items-center justify-center gap-2 border border-blue-300 text-blue-800 px-4 py-2 rounded-md hover:bg-blue-800 hover:text-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          {isSending
            ? "Sending..."
            : `Send ${notificationMethod.charAt(0).toUpperCase() + notificationMethod.slice(1)} to Client`}
        </button>
      </div>
    </CustomModal>
  );
}
