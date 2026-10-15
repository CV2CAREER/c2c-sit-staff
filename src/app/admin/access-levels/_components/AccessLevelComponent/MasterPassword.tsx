"use client";

import React, { useState } from "react";
import { EyeClosedIcon, EyeIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useAccessControl } from "@/hooks/useAccessControl";

const KEY_SLOTS = [1, 2, 3];

export default function MasterPassword() {
  const [slot, setSlot] = useState(1);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { masterKeys, updateMasterPassword } = useAccessControl();

  const keyInfo = (n: number) => masterKeys.find((key) => key.slot === n);
  const noKeySet = masterKeys.length > 0 && masterKeys.every((key) => !key.isSet);

  const openModal = (n: number) => {
    setSlot(n);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
    setOldPassword("");
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!oldPassword && !noKeySet) {
      setError("Please enter any one of the current master keys.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setSuccess("");

    updateMasterPassword.mutate(
      { slot, currentKey: oldPassword, newPassword: password },
      {
        onSuccess: (response) => {
          const message = response.message || "Password updated successfully.";
          toast.success(message);
          setSuccess(message);
          closeModal();
        },
        onError: (mutationError) => {
          setError(mutationError.message || "An error occurred while updating the password.");
        },
      },
    );
  };

  return (
    <div className="mt-6 w-full p-6 rounded-3xl bg-white sm:mr-4">
      <button onClick={() => openModal(1)} className="bg-blue text-white rounded-md p-3 md:w-auto">
        Change Master Key
      </button>
      <span className="text-gray-500 text-sm mt-2 block">
        *There are 3 master keys. Any one of them can log in to a customer account, and any one can be used to change the others.
      </span>

      <div className="mt-4 space-y-2">
        {KEY_SLOTS.map((n) => {
          const info = keyInfo(n);
          return (
            <div key={n} className="flex flex-wrap items-center justify-between gap-2 border border-gray-200 rounded-md p-3">
              <div>
                <span className="font-semibold">Key {n}</span>
                <span className="text-gray-500 text-sm block">
                  {info?.isSet
                    ? `Last changed ${info.updated ? new Date(info.updated).toLocaleDateString() : "N/A"} by ${info.updatedBy || "Unknown"}`
                    : "Not set yet"}
                </span>
              </div>
              <button onClick={() => openModal(n)} className="bg-blue text-white rounded-md px-4 py-2 text-sm">
                {info?.isSet ? "Change" : "Set"}
              </button>
            </div>
          );
        })}
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-11/12 md:w-1/3">
            <h4 className="text-lg font-bold mb-4">Change Master Key</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 block mb-1">Key to change</label>
                <select
                  value={slot}
                  onChange={(event) => setSlot(Number(event.target.value))}
                  className="border border-gray-300 rounded-md p-3 w-full"
                >
                  {KEY_SLOTS.map((n) => (
                    <option key={n} value={n}>
                      Key {n}
                      {keyInfo(n)?.isSet ? "" : " (not set)"}
                    </option>
                  ))}
                </select>
              </div>

              {noKeySet ? null : (
                <div className="relative">
                  <input
                    spellCheck
                    type={showOldPassword ? "text" : "password"}
                    value={oldPassword}
                    onChange={(event) => setOldPassword(event.target.value)}
                    placeholder="Any current master key (Key 1, 2 or 3)"
                    className="border border-gray-300 rounded-md p-3 w-full"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowOldPassword((prev) => !prev)}>
                    {showOldPassword ? <EyeIcon /> : <EyeClosedIcon />}
                  </button>
                </div>
              )}

              <div className="relative">
                <input
                  spellCheck
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={`New Key ${slot}`}
                  className="border border-gray-300 rounded-md p-3 w-full"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowPassword((prev) => !prev)}>
                  {showPassword ? <EyeIcon /> : <EyeClosedIcon />}
                </button>
              </div>

              <div className="relative">
                <input
                  spellCheck
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm Password"
                  className="border border-gray-300 rounded-md p-3 w-full"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowConfirmPassword((prev) => !prev)}>
                  {showConfirmPassword ? <EyeIcon /> : <EyeClosedIcon />}
                </button>
              </div>

              <div className="flex justify-end space-x-3">
                <button type="button" onClick={closeModal} className="bg-gray-500 text-white rounded-md px-4 py-2" disabled={updateMasterPassword.isPending}>
                  Cancel
                </button>
                <button type="submit" className="bg-blue text-white rounded-md px-4 py-2" disabled={updateMasterPassword.isPending}>
                  {updateMasterPassword.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
            {error ? <p className="text-red-500 mt-4">{error}</p> : null}
            {success ? <p className="text-green-500 mt-4">{success}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
