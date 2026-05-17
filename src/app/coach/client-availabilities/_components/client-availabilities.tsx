"use client";
import React, { useState } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useFetchData } from "@/hooks/useApi";
import { useCoachMutations } from "@/hooks/api/coach";
import { CLIENT_AVAILABILITIES } from "@/constants/apiEndpoints/coach.endpoint";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, CalendarCheck } from "lucide-react";
import toast from "react-hot-toast";

interface ClientAvailabilityClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ClientAvailability {
  id: string;
  date: string;
  day: string | null;
  timezone: string;
  startTime: string;
  endTime: string;
  sessionType: string;
  isAvailable: boolean;
  isDeleted: boolean;
  clientId: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  client: ClientAvailabilityClient;
}

type ClientAvailabilitiesResponse = ClientAvailability[];

const formatSessionType = (type: string) =>
  type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const ClientAvailabilities = () => {
  const [acceptTarget, setAcceptTarget] = useState<ClientAvailability | null>(null);
  const [meetingLink, setMeetingLink] = useState("");

  const [declineTarget, setDeclineTarget] = useState<ClientAvailability | null>(null);
  const [declineReason, setDeclineReason] = useState("");

  const { data, isLoading, refetch } = useFetchData<ClientAvailabilitiesResponse>({
    queryKey: ["client-availabilities"],
    url: CLIENT_AVAILABILITIES,
    method: "GET",
    enabled: true,
  });

  const { acceptClientAvailability, declineClientAvailability } = useCoachMutations();

  const rows: ClientAvailability[] = data?.data ?? [];

  const handleOpenAccept = (row: ClientAvailability) => {
    setAcceptTarget(row);
    setMeetingLink("");
  };

  const handleCloseAccept = () => {
    setAcceptTarget(null);
    setMeetingLink("");
  };

  const handleAccept = async () => {
    if (!acceptTarget) return;
    try {
      await acceptClientAvailability.mutateAsync({
        id: acceptTarget.id,
        ...(meetingLink.trim() ? { meetingLink: meetingLink.trim() } : {}),
      });
      toast.success("Availability accepted and session scheduled.");
      handleCloseAccept();
      refetch();
    } catch {
      toast.error("Failed to accept availability. Please try again.");
    }
  };

  const handleOpenDecline = (row: ClientAvailability) => {
    setDeclineTarget(row);
    setDeclineReason("");
  };

  const handleCloseDecline = () => {
    setDeclineTarget(null);
    setDeclineReason("");
  };

  const handleDecline = async () => {
    if (!declineTarget) return;
    if (!declineReason.trim()) {
      toast.error("Please provide a reason for declining.");
      return;
    }
    try {
      await declineClientAvailability.mutateAsync({
        id: declineTarget.id,
        reason: declineReason.trim(),
      });
      toast.success("Availability declined.");
      handleCloseDecline();
      refetch();
    } catch {
      toast.error("Failed to decline availability. Please try again.");
    }
  };

  const columns: GridColDef[] = [
    {
      field: "client",
      headerName: "Client",
      flex: 1.2,
      valueGetter: (_value, row) =>
        row.client ? `${row.client.firstName} ${row.client.lastName}` : "N/A",
    },
    {
      field: "email",
      headerName: "Email",
      flex: 1.5,
      valueGetter: (_value, row) => row.client?.email ?? "N/A",
    },
    {
      field: "date",
      headerName: "Date",
      flex: 0.9,
    },
    {
      field: "startTime",
      headerName: "Start",
      flex: 0.7,
    },
    {
      field: "endTime",
      headerName: "End",
      flex: 0.7,
    },
    {
      field: "sessionType",
      headerName: "Session Type",
      flex: 1.2,
      valueGetter: (_value, row) => formatSessionType(row.sessionType),
    },
    {
      field: "timezone",
      headerName: "Timezone",
      flex: 1,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.2,
      sortable: false,
      renderCell: (params) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleOpenAccept(params.row)}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <CheckCircle size={13} />
            Accept
          </button>
          <button
            onClick={() => handleOpenDecline(params.row)}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
          >
            <XCircle size={13} />
            Decline
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <CalendarCheck size={24} className="text-blue-600" />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Client Availabilities</h2>
          <p className="text-sm text-gray-500">Review and accept client-submitted availability slots.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <DataGrid
          rows={rows}
          columns={columns}
          getRowId={(row) => row.id}
          loading={isLoading}
          disableRowSelectionOnClick
          initialState={{ pagination: { paginationModel: { pageSize: 20 } } }}
          pageSizeOptions={[20, 50, 100]}
          sx={{
            border: "none",
            "& .MuiDataGrid-cell": { borderBottom: "1px solid #f0f0f0" },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f5f5f5",
              borderBottom: "2px solid #e0e0e0",
            },
          }}
        />
      </div>

      {/* Accept Modal */}
      <Dialog open={!!acceptTarget} onOpenChange={(open) => !open && handleCloseAccept()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Accept Availability</DialogTitle>
            <DialogDescription>
              {acceptTarget && (
                <>
                  Accepting{" "}
                  <span className="font-medium text-gray-800">
                    {acceptTarget.client.firstName} {acceptTarget.client.lastName}
                  </span>
                  &apos;s slot on{" "}
                  <span className="font-medium text-gray-800">{acceptTarget.date}</span>{" "}
                  from {acceptTarget.startTime} – {acceptTarget.endTime} ({acceptTarget.timezone}).
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 mt-2">
            <Label htmlFor="meetingLink" className="text-sm font-medium text-gray-700">
              Meeting Link <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="meetingLink"
              type="url"
              placeholder="https://meet.google.com/..."
              value={meetingLink}
              onChange={(e) => setMeetingLink(e.target.value)}
            />
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCloseAccept} disabled={acceptClientAvailability.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleAccept}
              disabled={acceptClientAvailability.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {acceptClientAvailability.isPending ? "Accepting..." : "Confirm Accept"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Modal */}
      <Dialog open={!!declineTarget} onOpenChange={(open) => !open && handleCloseDecline()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle size={18} className="text-red-500" />
              Decline Availability
            </DialogTitle>
            <DialogDescription>
              {declineTarget && (
                <>
                  Declining{" "}
                  <span className="font-medium text-gray-800">
                    {declineTarget.client.firstName} {declineTarget.client.lastName}
                  </span>
                  &apos;s slot on{" "}
                  <span className="font-medium text-gray-800">{declineTarget.date}</span>{" "}
                  from {declineTarget.startTime} – {declineTarget.endTime} ({declineTarget.timezone}).
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 mt-2">
            <Label htmlFor="declineReason" className="text-sm font-medium text-gray-700">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="declineReason"
              placeholder="Provide a reason for declining this availability..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="min-h-[100px] resize-none"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={handleCloseDecline} disabled={declineClientAvailability.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleDecline}
              disabled={declineClientAvailability.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {declineClientAvailability.isPending ? "Declining..." : "Confirm Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ClientAvailabilities;
