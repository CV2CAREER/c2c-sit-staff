"use client";

import React, { useState } from "react";
import { EyeClosedIcon, EyeIcon } from "lucide-react";
import toast from "react-hot-toast";
import { useAccessControl } from "@/hooks/useAccessControl";

export default function MasterPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { masterPasswordInfo, updateMasterPassword } = useAccessControl();

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

    if (!oldPassword) {
      setError("Please enter the old password.");
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
      { oldPassword, newPassword: password },
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
      <button onClick={() => setIsModalOpen(true)} className="bg-blue text-white rounded-md p-3 md:w-auto">
        Change Master Password
      </button>
      <span className="text-gray-500 text-sm mt-2 block">
        *Last changed {masterPasswordInfo?.updated ? new Date(masterPasswordInfo.updated).toLocaleDateString() : "N/A"} by {masterPasswordInfo?.updatedBy || "Unknown"}
      </span>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-11/12 md:w-1/3">
            <h4 className="text-lg font-bold mb-4">Change Master Password</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <input
                  spellCheck
                  type={showOldPassword ? "text" : "password"}
                  value={oldPassword}
                  onChange={(event) => setOldPassword(event.target.value)}
                  placeholder="Old Password"
                  className="border border-gray-300 rounded-md p-3 w-full"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setShowOldPassword((prev) => !prev)}>
                  {showOldPassword ? <EyeIcon /> : <EyeClosedIcon />}
                </button>
              </div>

              <div className="relative">
                <input
                  spellCheck
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="New Password"
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
