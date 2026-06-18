"use client";
import PageHeader from "@/components/PageHeader/PageHeader";
import { Button } from "@/components/ui/button";
import { useFetchData, useMutateData } from "@/hooks/useApi";
import { CircleAlert, Loader2 } from "lucide-react";
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
  redirectUrl: string;
}

export default function ViewAsUserAdminPage() {
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const loadingToastRef = useRef<string | undefined>(undefined);

  const { data, isLoading, isError } = useFetchData<ClientNamesData>({
    url: "/api/v1/user/clients/names",
    method: "GET",
    queryKey: ["admin", "client-names"],
    enabled: true,
  });

  const { mutate: viewAsUser, isPending } = useMutateData<
    ViewAsUserResponse,
    ViewAsUserRequest
  >({
    url: "/api/v1/view-as-user",
    method: "POST",
    mutationKey: ["admin", "view-as-user"],
    onSuccess: (res) => {
      toast.dismiss(loadingToastRef.current);
      toast.success("Successfully initiated view as user.");
      if (res.data?.redirectUrl) {
        window.open(res.data.redirectUrl, "_blank");
      }
    },
    onError: (err) => {
      toast.dismiss(loadingToastRef.current);
      setError(err.message || "Failed to initiate view as user.");
      toast.error("Failed to initiate view as user.");
    },
  });

  const users: UserOption[] =
    data?.data?.clients?.map((client) => ({
      value: client.email,
      label: client.label,
      email: client.email,
    })) ?? [];

  const handleLoginAsUser = () => {
    if (!selectedUser) {
      setError("Please select a user first.");
      return;
    }

    setError(null);
    loadingToastRef.current = toast.loading("Initiating view as user...");
    viewAsUser({ targetEmail: selectedUser.email });
  };

  return (
    <section className="flex flex-col gap-4 mt-4">
      <PageHeader title="View As User" />

      <div className="mb-6">
        <label
          htmlFor="user-select"
          className="block text-lg font-medium text-gray-700 mb-2"
        >
          Select User:
        </label>
        <Select
          id="user-select"
          options={users}
          value={selectedUser}
          onChange={(option) => setSelectedUser(option as UserOption)}
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
          onClick={handleLoginAsUser}
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
            "Login as User"
          )}
        </Button>
      </div>
    </section>
  );
}
