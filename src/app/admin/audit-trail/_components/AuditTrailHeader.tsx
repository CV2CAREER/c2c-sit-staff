"use client";

import Header from "@/components/TableRedesign/TableHeader";
import PassKeyModal from "./PassKeyModal";
import { useState } from "react";
import { AdminUser } from "../_utils/api";
import PageHeader from "@/components/PageHeader/PageHeader";

interface AuditTrailHeaderProps {
  staffUsers: AdminUser[] | undefined;
  selectedUser: AdminUser | null;
  setSelectedUser: (user: AdminUser | null) => void;
  onSetPassKeySuccess: () => void;
  isLoading: boolean;
}

const AuditTrailHeader: React.FC<AuditTrailHeaderProps> = ({
  staffUsers,
  selectedUser,
  setSelectedUser,
  onSetPassKeySuccess,
  isLoading,
}) => {
  const [showPassKeyModal, setShowPassKeyModal] = useState<boolean>(false);

  const headerValues =
    staffUsers && staffUsers.length > 0
      ? [
          { id: "", Full_Name: "All Staff", email: "" },
          ...staffUsers.map((user) => ({
            ...user,
            Full_Name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          })),
        ]
      : [{ Full_Name: "All Staff", id: "", email: "" }];

  const listOfValues = headerValues.map((value: any) => String(value.id || ""));

  const listOfDisplayValues = headerValues.map(
    (value: any) => value.Full_Name || `${value.firstName ?? ""} ${value.lastName ?? ""}`.trim(),
  );

  return (
    <>
      <PageHeader title="Audit Trail" />
      <Header
        dropdownSearch={true}
        values={headerValues}
        defaultValue={selectedUser?.id || ""}
        listOfValues={listOfValues}
        listOfDisplayValues={listOfDisplayValues}
        onChange={(e: any) => {
          setSelectedUser(e);
        }}
      />

      <div className="flex flex-wrap justify-end">
        <button
          className="mt-4 border flex items-center bg-white border-blue text-blue capitalize px-4 py-3 h-[2.75rem] text-14 font-medium rounded-[0.25rem]"
          onClick={() => setShowPassKeyModal(true)}
          disabled={isLoading}
        >
          Set Pass Key
        </button>
      </div>

      <PassKeyModal
        visibility={showPassKeyModal}
        toggleVisibility={setShowPassKeyModal}
        onSetSuccess={onSetPassKeySuccess}
      />
    </>
  );
};

export default AuditTrailHeader;
