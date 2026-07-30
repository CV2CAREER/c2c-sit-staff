'use client';
import { useState } from "react";
import toast from "react-hot-toast";
import AppModal from "./AppModal";
import { useAdminQueries, useAdminMutations } from "@/hooks/api/admin.api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2, SendHorizontal, Users2, UserCog } from "lucide-react";

interface Props {
  visibility: boolean;
  togggleVisibility: (state: boolean) => void;
}

type User = {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string;
};

const DispatchClient = ({ visibility, togggleVisibility }: Props) => {
  const [selectedClients, setSelectedClients] = useState<User[]>([]);
  const [selectedVa, setSelectedVa] = useState<User | undefined>();

  const { clientsDomain, pcsDomain } = useAdminQueries({
    fetchClients: visibility,
    fetchPCs: visibility,
  });

  const { dispatchClientMutation } = useAdminMutations();

  const clientsData = clientsDomain.data;
  const users = Array.isArray(clientsData) ? clientsData : (clientsData?.users ?? []);

  const pcsData = pcsDomain.data;
  const vas = Array.isArray(pcsData) ? pcsData : [];

  const handleDispatch = () => {
    if (!selectedVa) return toast.error("Select a PC");
    if (!selectedClients.length)
      return toast.error("Select at least one client");

    dispatchClientMutation.mutate(
      {
        pcId: selectedVa.id,
        userIds: selectedClients.map((c) => c.id),
      },
      {
        onSuccess: (data: any) => {
          togggleVisibility(false);
          toast.success(data?.message ?? "Clients dispatched successfully");
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.message ?? "Client dispatch failed");
        },
      }
    );
  };

  const toggleClient = (client: User) => {
    const exists = selectedClients.find((c) => c.id === client.id);
    if (exists) {
      setSelectedClients((prev) => prev.filter((c) => c.id !== client.id));
    } else {
      setSelectedClients((prev) => [...prev, client]);
    }
  };

  const isInitialLoading = clientsDomain.isLoading || pcsDomain.isLoading;

  return (
    <AppModal isOpen={visibility} onClose={() => togggleVisibility(false)}>
      <div className="">
        <div className="flex items-center gap-2.5 mb-6">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <SendHorizontal size={18} className="text-primary" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Dispatch to PC</h2>
            <p className="text-sm text-gray-500">Assign selected clients to a Placement Controller.</p>
          </div>
        </div>

        {isInitialLoading ? (
          <div className="flex items-center justify-center h-full min-h-[200px]">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
            <span className="ml-2 text-sm text-gray-600">
              Loading clients and PCs...
            </span>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {/* Multi-select Clients */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Users2 size={15} className="text-primary" />
                  Select Clients
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start border-input font-normal text-gray-700 hover:border-primary/40 hover:bg-primary/5 hover:text-gray-700"
                    >
                      {selectedClients.length
                        ? `${selectedClients.length} client(s) selected`
                        : "Select clients"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="max-h-60 overflow-y-auto w-[300px]">
                    {(users ?? []).map((user: any) => (
                      <div
                        key={user.id}
                        className="flex items-center space-x-2 py-1"
                      >
                        <Checkbox
                          id={user.id}
                          checked={selectedClients.some(
                            (c) => c.id === user.id,
                          )}
                          onCheckedChange={() => toggleClient(user)}
                        />
                        <label htmlFor={user.id} className="text-sm">
                          {user.firstName} {user.lastName}
                        </label>
                      </div>
                    ))}
                  </PopoverContent>
                </Popover>
              </div>

              {/* Single-select PC */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <UserCog size={15} className="text-primary" />
                  Select PC to dispatch to
                </label>
                <Select
                  value={selectedVa?.id}
                  onValueChange={(val) => {
                    const found = vas?.find((va: any) => va.id === val);
                    setSelectedVa(found);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a PC" />
                  </SelectTrigger>
                  <SelectContent>
                    {vas?.map((va: any) => (
                      <SelectItem key={va.id} value={va.id}>
                        {va.firstName} {va.middleName || ''} {va.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end mt-6 pt-4 border-t border-gray-100">
              <Button
                onClick={handleDispatch}
                disabled={
                  !selectedClients.length || !selectedVa || dispatchClientMutation.isPending
                }
              >
                {dispatchClientMutation.isPending ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2 text-white" />
                    Dispatching...
                  </>
                ) : (
                  <>
                    <SendHorizontal size={16} className="mr-2" /> Dispatch to PC
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </AppModal>
  );
};

export default DispatchClient;
