"use client";

import React, { useMemo, useState } from "react";
import { GroupAdd, GroupRemove } from "@mui/icons-material";
import Select from "react-select";
import CustomModal from "@/components/CustomModal/CustomModal";
import LoadingSpinner from "@/components/reusable/LoadingSpinner";
import MasterPassword from "./MasterPassword";
import ViewRulesModal from "./ViewRules";
import { ViewUserAccess } from "./viewLevels";
import { useAccessControl } from "@/hooks/useAccessControl";
import { usePermissions } from "@/hooks/usePermissions";

interface AccessLevel {
  _id: string;
  name: string;
  description: string;
  personas: string[];
  rules?: any[];
}

interface User {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

const customSelectStyles = {
  control: (provided: any) => ({
    ...provided,
    backgroundColor: "white",
    color: "black",
  }),
  option: (provided: any, state: { isFocused: boolean }) => ({
    ...provided,
    backgroundColor: state.isFocused ? "#f0f0f0" : "white",
    color: "black",
  }),
};

export default function AccessLevelsPage() {
  const [selectedAccessLevel, setSelectedAccessLevel] = useState<AccessLevel | null>(null);
  const [selectedAssignAccess, setSelectedAssignAccess] = useState<AccessLevel | null>(null);
  const [selectedAssignClient, setSelectedAssignClient] = useState<User | null>(null);
  const [selectedRemoveAccess, setSelectedRemoveAccess] = useState<AccessLevel | null>(null);
  const [selectedRemoveAccessClient, setSelectedRemoveAccessClient] = useState<User | null>(null);
  const [viewAccessUser, setViewAccessUser] = useState<User | null>(null);
  const { isAdmin } = usePermissions();

  const baseAccess = useAccessControl({ selectedAccessLevelId: selectedRemoveAccess?._id ?? null });
  const viewedUserAccess = useAccessControl({ selectedUserId: viewAccessUser?._id ?? null });

  const isMutating =
    baseAccess.assignAccess.isPending ||
    baseAccess.removeAccess.isPending ||
    baseAccess.createRule.isPending ||
    baseAccess.updateRule.isPending ||
    baseAccess.deleteRule.isPending;

  const allUsers = useMemo(() => baseAccess.allUsers, [baseAccess.allUsers]);

  return (
    <div className="bg-white rounded-sm p-6">
      <div className="flex flex-wrap">
        <MasterPassword />
      </div>

      {baseAccess.isLoading ? (
        <div className="w-full p-6 space-y-6 bg-white rounded-sm shadow-sm">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="w-full overflow-x-auto">
          <table
            className="w-full capitalize"
            style={{
              borderCollapse: "collapse",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              borderRadius: "8px",
            }}
          >
            <thead>
              <tr style={{ background: "#80d7ff" }}>
                <th className="border border-gray-300 p-3 text-black">Access Level</th>
                <th className="border border-gray-300 p-3 text-black">Description</th>
                <th className="border border-gray-300 p-3 text-black">Personas</th>
                <th className="border border-gray-300 p-3 text-black">Actions</th>
              </tr>
            </thead>
            <tbody>
              {baseAccess.accessLevels.map((item, index) => (
                <tr key={item._id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="border border-gray-300 p-2.5">{item.name}</td>
                  <td className="border border-gray-300 p-2.5">{item.description}</td>
                  <td className="border border-gray-300 p-2.5 truncate" style={{ maxWidth: "475px" }} title={(item.personas ?? []).join(", ")}>
                    {(item.personas ?? []).join(", ")}
                  </td>
                  <td className="border border-gray-300 p-2.5" style={{ minWidth: "235px" }}>
                    <button className="bg-gray-300 p-2 rounded-sm text-sm" onClick={() => setSelectedAccessLevel(item)}>
                      View Rules
                    </button>
                    {isAdmin ? (
                      <div className="inline-block ml-4">
                        <div onClick={() => setSelectedAssignAccess(item)} className="inline-block hover:bg-gray-200 p-2 cursor-pointer rounded-md">
                          <GroupAdd style={{ color: "green" }} />
                        </div>
                        <div onClick={() => setSelectedRemoveAccess(item)} className="inline-block ml-5 hover:bg-gray-200 p-2 cursor-pointer rounded-md">
                          <GroupRemove style={{ color: "red" }} />
                        </div>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Users</h3>
        <div className="grid gap-3">
          {allUsers.slice(0, 10).map((user) => (
            <button
              key={user._id}
              className="text-left border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              onClick={() => setViewAccessUser(user)}
            >
              <p className="font-semibold">{[user.firstName, user.lastName].filter(Boolean).join(" ")}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </button>
          ))}
        </div>
      </div>

      <CustomModal toggleVisibility={() => setSelectedAccessLevel(null)} visibility={!!selectedAccessLevel}>
        <ViewRulesModal accessLevel={selectedAccessLevel} close={() => setSelectedAccessLevel(null)} />
      </CustomModal>

      <CustomModal toggleVisibility={() => setSelectedAssignAccess(null)} visibility={!!selectedAssignAccess}>
        <div className="p-6 bg-white rounded-md shadow-md w-full max-w-md mx-auto">
          <p className="text-lg font-bold text-gray-800 mb-4">Assign {selectedAssignAccess?.name} access</p>
          <Select
            styles={customSelectStyles}
            value={selectedAssignClient}
            options={allUsers}
            getOptionLabel={(user: any) => `${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
            getOptionValue={(user: any) => user?._id}
            onChange={(value) => setSelectedAssignClient(value as User)}
          />
          <button
            onClick={() => {
              if (selectedAssignClient?._id && selectedAssignAccess?._id) {
                baseAccess.assignAccess.mutate(
                  { userId: selectedAssignClient._id, accessLevel: selectedAssignAccess._id },
                  { onSuccess: () => setSelectedAssignClient(null) },
                );
              }
            }}
            disabled={isMutating || !selectedAssignClient}
            className="mt-4 px-4 py-2 rounded text-white font-medium transition bg-blue hover:bg-[#009dff] disabled:bg-gray-400"
          >
            {baseAccess.assignAccess.isPending ? "Assigning..." : "Submit"}
          </button>
        </div>
      </CustomModal>

      <CustomModal toggleVisibility={() => setSelectedRemoveAccess(null)} visibility={!!selectedRemoveAccess}>
        <div className="p-6 bg-white rounded-md shadow-md w-full max-w-md mx-auto">
          <p className="text-lg font-bold text-gray-800 mb-4">Remove {selectedRemoveAccess?.name} access</p>
          <Select
            styles={customSelectStyles}
            value={selectedRemoveAccessClient}
            options={baseAccess.accessUsers}
            getOptionLabel={(user: any) => `${user?.firstName || ""} ${user?.lastName || ""}`.trim()}
            getOptionValue={(user: any) => user?._id}
            onChange={(value) => setSelectedRemoveAccessClient(value as User)}
            isOptionDisabled={(user: any) => !!selectedRemoveAccess?.personas?.includes(user.role)}
          />
          <button
            onClick={() => {
              if (selectedRemoveAccessClient?._id && selectedRemoveAccess?._id) {
                baseAccess.removeAccess.mutate(
                  { userId: selectedRemoveAccessClient._id, accessLevel: selectedRemoveAccess._id },
                  { onSuccess: () => setSelectedRemoveAccessClient(null) },
                );
              }
            }}
            disabled={isMutating || !selectedRemoveAccessClient}
            className="mt-4 px-4 py-2 rounded text-white font-medium transition bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
          >
            {baseAccess.removeAccess.isPending ? "Removing..." : "Remove Access"}
          </button>
        </div>
      </CustomModal>

      <CustomModal toggleVisibility={() => setViewAccessUser(null)} visibility={!!viewAccessUser}>
        <ViewUserAccess user={viewAccessUser} accessLevels={baseAccess.accessLevels} userAccessLevels={viewedUserAccess.userAccessLevels} />
      </CustomModal>
    </div>
  );
}
