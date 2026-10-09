"use client";
import PageHeader from "@/components/PageHeader/PageHeader";
import { Button } from "@/components/ui/button";
import { useFetchData, useMutateData } from "@/hooks/useApi";
import { CircleAlert, Eye, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import Select from "react-select";

interface UserOption {
  value: string;
  label: string;
  email: string;
}

interface ClientNamesData {
  clients: { fullName: string; email: string; label: string }[];
  count: number;
}

interface ViewAsUserRequest {
  targetEmail: string;
}

interface ViewAsUserResponse {
  success: boolean;
  redirectUrl?: string;
  email?: string;
}

/**
 * Shared by /admin/view-as-user and /pc/view-as-user.
 *
 * The staff backend returns a single-use link into the customer app
 * (CLIENT_APP_DOMAIN). The customer app redeems it for a read-only session,
 * so staff see exactly what the client sees without being able to change
 * anything.
 */
export default function ViewAsUserPanel({ queryScope }: { queryScope: string }) {
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadingToastRef = useRef<string | undefined>(undefined);
  // Opened synchronously on click — browsers block window.open() calls made
  // after an await, so we reserve the tab first and navigate it on success.
  const pendingTabRef = useRef<Window | null>(null);

  const { data, isLoading, isError } = useFetchData<ClientNamesData>({
    url: "/api/v1/user/clients/names",
    method: "GET",
    queryKey: [queryScope, "client-names"],
    enabled: true,
  });

  const closePendingTab = () => {
    pendingTabRef.current?.close();
    pendingTabRef.current = null;
  };

  const { mutate: viewAsUser, isPending } = useMutateData<
    ViewAsUserResponse,
    ViewAsUserRequest
  >({
    url: "/api/v1/view-as-user",
    method: "POST",
    mutationKey: [queryScope, "view-as-user"],
    onSuccess: (res) => {
      toast.dismiss(loadingToastRef.current);
      const redirectUrl = res.data?.redirectUrl;

      if (!redirectUrl) {
        closePendingTab();
        setError("The server did not return a customer link for this user.");
        return;
      }

      const tab = pendingTabRef.current;
      pendingTabRef.current = null;

      if (tab && !tab.closed) {
        tab.location.href = redirectUrl;
        tab.focus();
      } else if (!window.open(redirectUrl, "_blank")) {
        toast.error("Popup blocked. Please allow popups for this site.");
        return;
      }

      toast.success(`Opened view-only session for ${res.data?.email ?? selectedUser?.email}`);
    },
    onError: (err) => {
      toast.dismiss(loadingToastRef.current);
      closePendingTab();
      setError(err.message || "Failed to initiate view as user.");
      toast.error("Failed to initiate view as user.");
    },
  });

  const users: UserOption[] =
    data?.data?.clients
      ?.filter((client) => !!client.email)
      .map((client) => ({
        value: client.email,
        label: client.label,
        email: client.email,
      })) ?? [];

  const handleViewAsUser = () => {
    if (!selectedUser?.email) {
      setError("Please select a user first.");
      return;
    }

    setError(null);
    pendingTabRef.current = window.open("about:blank", "_blank");
    loadingToastRef.current = toast.loading("Preparing view-only session...");
    viewAsUser({ targetEmail: selectedUser.email });
  };

  return (
    <section className="flex flex-col gap-4 mt-4">
      <PageHeader title="View As User" />

      <p className="text-sm text-gray-600">
        Opens the client&apos;s customer portal in a new tab in{" "}
        <strong>view-only</strong> mode. You will see exactly what they see,
        but no changes can be saved. The session expires after 2 hours.
      </p>

      <div className="mb-6">
        <label
          htmlFor="user-select"
          className="block text-lg font-medium text-gray-700 mb-2"
        >
          Select User:
        </label>
        <Select
          inputId="user-select"
          options={users}
          value={selectedUser}
          onChange={(option) => {
            setSelectedUser(option as UserOption | null);
            setError(null);
          }}
          placeholder="Search or select a user..."
          isLoading={isLoading}
          isClearable
          isSearchable
          className="basic-single"
          classNamePrefix="select"
        />
        {isError && (
          <p className="text-red-500 mt-2 flex items-center text-sm">
            <CircleAlert className="mr-1" size={14} /> Failed to load clients.
          </p>
        )}
      </div>

      <div className="text-center">
        {error && (
          <p className="text-red-500 mb-4 flex items-center justify-center">
            <CircleAlert className="mr-2" size={16} /> {error}
          </p>
        )}
        <Button
          onClick={handleViewAsUser}
          disabled={!selectedUser || isPending}
          variant="default"
          size="lg"
          className="w-full sm:w-auto"
        >
          {isPending ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} /> Processing...
            </>
          ) : (
            <>
              <Eye className="mr-2" size={18} /> View as User
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
