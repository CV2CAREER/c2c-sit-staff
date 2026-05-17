"use client";

import { useState } from "react";
import { CheckCircle, XCircle, RefreshCw, Clock, Globe, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useCoachMutations } from "@/hooks/api/coach";
import toast from "react-hot-toast";

type ModalType = "accept" | "decline" | "reschedule" | null;

interface ClientAvailabilityCardProps {
  availability: any;
}

export default function ClientAvailabilityCard({ availability }: ClientAvailabilityCardProps) {
  const [modal, setModal] = useState<ModalType>(null);
  const [meetingLink, setMeetingLink] = useState("");
  const [declineReason, setDeclineReason] = useState("");
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleStart, setRescheduleStart] = useState("");
  const [rescheduleEnd, setRescheduleEnd] = useState("");
  const [rescheduleNote, setRescheduleNote] = useState("");

  const { acceptClientAvailability, declineClientAvailability } = useCoachMutations();

  const id = availability._id || availability.id;
  const clientName =
    availability.client
      ? `${availability.client.firstName} ${availability.client.lastName}`
      : availability.clientName || "Client";
  const clientEmail = availability.client?.email || availability.email || "";
  const date = availability.date || "";
  const startTime = availability.startTime || availability.start || "";
  const endTime = availability.endTime || availability.end || "";
  const timezone = availability.timezone || "";
  const sessionType = availability.sessionType || "";

  const handleAccept = () => {
    toast.loading("Accepting availability...", { id: "ca-accept" });
    acceptClientAvailability.mutate(
      { id, meetingLink: meetingLink || undefined },
      {
        onSuccess: (res: any) => {
          toast.success(res?.message || "Availability accepted.", { id: "ca-accept" });
          setModal(null);
          setMeetingLink("");
        },
        onError: (err: any) => {
          toast.error(err?.message || "Failed to accept.", { id: "ca-accept" });
        },
      }
    );
  };

  const handleDecline = () => {
    if (!declineReason.trim()) {
      toast.error("Please provide a reason.");
      return;
    }
    toast.loading("Declining availability...", { id: "ca-decline" });
    declineClientAvailability.mutate(
      { id, reason: declineReason },
      {
        onSuccess: (res: any) => {
          toast.success(res?.message || "Availability declined.", { id: "ca-decline" });
          setModal(null);
          setDeclineReason("");
        },
        onError: (err: any) => {
          toast.error(err?.message || "Failed to decline.", { id: "ca-decline" });
        },
      }
    );
  };

  const handleReschedule = () => {
    if (!rescheduleDate || !rescheduleStart || !rescheduleEnd) {
      toast.error("Please fill in date, start time, and end time.");
      return;
    }
    const reason = [
      `Coach proposed reschedule to ${rescheduleDate} from ${rescheduleStart} to ${rescheduleEnd}.`,
      rescheduleNote ? `Note: ${rescheduleNote}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    toast.loading("Sending reschedule request...", { id: "ca-reschedule" });
    declineClientAvailability.mutate(
      { id, reason },
      {
        onSuccess: (res: any) => {
          toast.success(res?.message || "Reschedule request sent.", { id: "ca-reschedule" });
          setModal(null);
          setRescheduleDate("");
          setRescheduleStart("");
          setRescheduleEnd("");
          setRescheduleNote("");
        },
        onError: (err: any) => {
          toast.error(err?.message || "Failed to send reschedule request.", { id: "ca-reschedule" });
        },
      }
    );
  };

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex-row gap-4">
        {/* Left: details */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Client name */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <User size={13} className="text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{clientName}</p>
              {clientEmail && (
                <p className="text-[15px] text-gray-400 truncate">{clientEmail}</p>
              )}
            </div>
          </div>

          {/* Session details */}
          <div className="flex flex-col gap-1 text-gray-600 pl-1">
            {date && (
              <div className="flex items-center gap-1.5">
                <Clock size={11} className="text-gray-400 flex-shrink-0" />
                <span className="font-medium">{date}</span>
                {startTime && endTime && (
                  <span className="text-gray-400">{startTime} – {endTime}</span>
                )}
              </div>
            )}
            {timezone && (
              <div className="flex items-center gap-1.5">
                <Globe size={11} className="text-gray-400 flex-shrink-0" />
                <span>{timezone}</span>
              </div>
            )}
            {sessionType && (
              <span className="self-start mt-1 mb-2 px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full text-[15px] font-medium capitalize">
                {sessionType.replace(/_/g, " ")}
              </span>
            )}
          </div>
        </div>

        {/* Right: action buttons column */}
        <div className="flex flex-col gap-1.5 justify-center flex-shrink-0">
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-green-50 text-green-700 hover:bg-green-100 border border-green-100"
            variant="ghost"
            onClick={() => setModal("accept")}
          >
            <CheckCircle size={11} className="mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-100"
            variant="ghost"
            onClick={() => setModal("decline")}
          >
            <XCircle size={11} className="mr-1" />
            Decline
          </Button>
          <Button
            size="sm"
            className="h-7 px-3 text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100"
            variant="ghost"
            onClick={() => setModal("reschedule")}
          >
            <RefreshCw size={11} className="mr-1" />
            Reschedule
          </Button>
        </div>
      </div>

      {/* Accept Modal */}
      <Dialog open={modal === "accept"} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Accept Availability</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-gray-600">
              Accept <span className="font-medium">{clientName}</span>&apos;s request for{" "}
              {date && <span className="font-medium">{date}</span>}
              {startTime && endTime && ` (${startTime} – ${endTime})`}.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="meetingLink" className="text-sm">
                Meeting Link <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="meetingLink"
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleAccept}
              disabled={acceptClientAvailability.isPending}
            >
              {acceptClientAvailability.isPending ? "Accepting..." : "Accept"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Modal */}
      <Dialog open={modal === "decline"} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Decline Availability</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-gray-600">
              Provide a reason for declining <span className="font-medium">{clientName}</span>&apos;s request.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="declineReason" className="text-sm">Reason *</Label>
              <Textarea
                id="declineReason"
                placeholder="e.g. I am unavailable at this time..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={declineClientAvailability.isPending}
            >
              {declineClientAvailability.isPending ? "Declining..." : "Decline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={modal === "reschedule"} onOpenChange={(open) => !open && setModal(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Propose Reschedule</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-sm text-gray-600">
              Suggest a new time for <span className="font-medium">{clientName}</span>&apos;s session.
            </p>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rescheduleDate" className="text-sm">New Date *</Label>
              <Input
                id="rescheduleDate"
                type="date"
                value={rescheduleDate}
                onChange={(e) => setRescheduleDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rescheduleStart" className="text-sm">Start Time *</Label>
                <Input
                  id="rescheduleStart"
                  type="time"
                  value={rescheduleStart}
                  onChange={(e) => setRescheduleStart(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="rescheduleEnd" className="text-sm">End Time *</Label>
                <Input
                  id="rescheduleEnd"
                  type="time"
                  value={rescheduleEnd}
                  onChange={(e) => setRescheduleEnd(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rescheduleNote" className="text-sm">
                Note <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Textarea
                id="rescheduleNote"
                placeholder="Add any additional context..."
                value={rescheduleNote}
                onChange={(e) => setRescheduleNote(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleReschedule}
              disabled={declineClientAvailability.isPending}
            >
              {declineClientAvailability.isPending ? "Sending..." : "Send Proposal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
