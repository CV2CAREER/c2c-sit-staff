"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCoachQueries, useCoachMutations } from "@/hooks/api/coach";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "antd";
import toast from "react-hot-toast";
import { Loader2, Save, Trash2, CheckCircle, ArrowLeft, Star, Clock, Calendar, Video, FileText, User, MapPin } from "lucide-react";
import GradingForm from "./GradingForm";

export default function ManageSession() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; type: "complete" | "cancel" }>({ open: false, type: "complete" });

  const { sessionDetailDomain } = useCoachQueries({ sessionId });
  const { updateSession, completeSession, cancelSession } = useCoachMutations();

  const session = sessionDetailDomain.data;
  const isLoading = sessionDetailDomain.isLoading;

  const [formData, setFormData] = useState({
    additionalInfo: "",
    meetingLink: "",
  });

  React.useEffect(() => {
    if (session) {
      setFormData({
        additionalInfo: session.additionalInfo || "",
        meetingLink: session.meetingLink || "",
      });
    }
  }, [session]);

  const handleUpdate = () => {
    updateSession.mutate(
      { id: sessionId, ...formData },
      {
        onSuccess: () => {
          toast.success("Session updated successfully");
          setIsEditing(false);
        },
        onError: () => toast.error("Failed to update session"),
      }
    );
  };

  const handleComplete = () => {
    completeSession.mutate(sessionId, {
      onSuccess: () => {
        toast.success("Session completed");
        router.push("/coach/grading");
      },
      onError: () => toast.error("Failed to complete session"),
    });
  };

  const handleDelete = () => {
    cancelSession.mutate(sessionId, {
      onSuccess: () => {
        toast.success("Session canceled");
        router.push("/coach/scheduling");
      },
      onError: () => toast.error("Failed to cancel session"),
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-blue-600" size={48} />
          <p className="text-gray-500 font-medium">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={40} className="text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Session Not Found</h3>
          <p className="text-gray-500 mt-2">The session you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push("/coach/scheduling")} className="mt-6 rounded-xl px-8">
            Back to Sessions
          </Button>
        </div>
      </div>
    );
  }

  const formattedDate = session.schedule?.date
    ? format(new Date(session.schedule.date), "EEEE, MMMM do, yyyy")
    : "Date not available";
  const sessionTypeLabels: Record<string, string> = {
    screening_preparation: "Screening Preparation",
    interview_panel: "Interview Preparation",
    career_consultation: "Career Consultation",
  };
  const sessionTypeLabel = sessionTypeLabels[session.sessionType] || session.sessionType?.replace(/_/g, " ") || "Session";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero / Client Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 px-8 py-10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="bg-black/5 backdrop-blur-sm w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-black/10">
                  <User size={36} className="text-black" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold text-black">
                    {session.client?.firstName || "N/A"} {session.client?.lastName || "N/A"}
                  </h1>
                  <p className="text-blue-200 text-lg mt-1">{sessionTypeLabel}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {session.isGraded && (
                  <div className="flex items-center gap-1.5 bg-yellow-400/20 backdrop-blur-sm text-yellow-200 px-4 py-2 rounded-xl text-sm font-bold border border-yellow-400/30">
                    <Star size={16} className="fill-yellow-400" />
                    GRADED
                  </div>
                )}
                <Badge
                  status={session.sessionStatus === 'completed' ? 'success' : session.sessionStatus === 'canceled' ? 'error' : 'processing'}
                  text={session.sessionStatus?.toUpperCase()}
                  className="!px-4 !py-2 !rounded-xl !text-sm !font-bold !bg-white/20 !backdrop-blur-sm !text-white !border !border-white/20"
                />
              </div>
            </div>
          </div>

          {/* Session Info Strip */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-100 bg-gray-50/80 px-8 py-5">
            <div className="flex items-center gap-3 py-3 md:py-0">
              <div className="bg-blue-100 p-2.5 rounded-xl">
                <Calendar size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date</p>
                <p className="font-semibold text-gray-800">{formattedDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3 md:py-0 md:px-6">
              <div className="bg-green-100 p-2.5 rounded-xl">
                <Clock size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Time</p>
                <p className="font-semibold text-gray-800">{session.time?.startTime || "N/A"} - {session.time?.endTime || "N/A"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 py-3 md:py-0 md:pl-6">
              <div className="bg-purple-100 p-2.5 rounded-xl">
                <Video size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Duration</p>
                <p className="font-semibold text-gray-800">{session.duration || 60} minutes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Preparation */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border-b border-gray-100 px-8 py-6">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-xl">
                    <FileText size={18} className="text-black" />
                  </div>
                  Coach Preparation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <Video size={14} />
                    Meeting Link
                  </label>
                  <Input
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                    disabled={!isEditing}
                    placeholder="https://zoom.us/j/..."
                    className="bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl h-12 text-base"
                  />
                  {formData.meetingLink && !isEditing && (
                    <a
                      href={formData.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold mt-1"
                    >
                      <Video size={14} />
                      Join Meeting
                    </a>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} />
                    Internal Notes
                  </label>
                  <Textarea
                    value={formData.additionalInfo}
                    onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Preparation notes for the session..."
                    className="min-h-[200px] bg-white border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-xl text-base"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
                  {!isEditing ? (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      className="rounded-xl h-12 px-8 border-gray-300 hover:bg-gray-50 font-semibold"
                    >
                      <FileText size={16} className="mr-2" />
                      Edit Details
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => setIsEditing(false)}
                        variant="ghost"
                        className="rounded-xl h-12 px-8 text-gray-500"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUpdate}
                        disabled={updateSession.isPending}
                        className="rounded-xl h-12 px-8 bg-blue-600 hover:bg-blue-700 font-semibold gap-2 shadow-lg shadow-blue-200 text-black"
                      >
                        {updateSession.isPending ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <Save size={18} />
                        )}
                        Save Changes
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Session Actions & Info */}
          <div className="space-y-6">
            <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50/50 border-b border-gray-100 px-6 py-6">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-3">
                  <div className="bg-orange-500 p-2 rounded-xl">
                    <CheckCircle size={16} className="text-white" />
                  </div>
                  Session Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <p className="text-sm text-gray-500 leading-relaxed">
                  Manage the lifecycle of this session. Completing a session will notify the client and finalize the records.
                </p>

                <div className="flex flex-col gap-3">
                  {session.sessionStatus !== 'completed' && (
                    <Button
                      onClick={() => setConfirmModal({ open: true, type: "complete" })}
                      disabled={completeSession.isPending}
                      className="w-full h-14 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-base gap-2 shadow-lg shadow-green-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {completeSession.isPending ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <CheckCircle size={20} />
                      )}
                      Mark as Completed
                    </Button>
                  )}

                  {session.sessionStatus !== 'canceled' && (
                    <Button
                      onClick={() => setConfirmModal({ open: true, type: "cancel" })}
                      disabled={cancelSession.isPending}
                      variant="outline"
                      className="w-full h-14 rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold text-base gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      {cancelSession.isPending ? (
                        <Loader2 className="animate-spin" size={20} />
                      ) : (
                        <Trash2 size={20} />
                      )}
                      Cancel Session
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Session Details Card */}
            <Card className="rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50/30 border-b border-gray-100 px-6 py-6">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-3">
                  <div className="bg-gray-600 p-2 rounded-xl">
                    <FileText size={16} className="text-white" />
                  </div>
                  Session Info
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Type</span>
                    <span className="text-sm font-semibold text-gray-800">{sessionTypeLabel}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Status</span>
                    <Badge
                      status={session.sessionStatus === 'completed' ? 'success' : session.sessionStatus === 'canceled' ? 'error' : 'processing'}
                      text={session.sessionStatus?.toUpperCase()}
                      className="!text-xs !font-bold"
                    />
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Timezone</span>
                    <span className="text-sm font-semibold text-gray-800">{session.timezone || "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-sm text-gray-500">Prep Status</span>
                    <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                      session.prepStatus === "completed"
                        ? "bg-green-100 text-green-700"
                        : session.prepStatus === "in_progress"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {session.prepStatus?.replace("_", " ") || "Not Started"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-sm text-gray-500">Validation</span>
                    <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-full ${
                      session.validationStatus === "approved"
                        ? "bg-green-100 text-green-700"
                        : session.validationStatus === "rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-500"
                    }`}>
                      {session.validationStatus || "Pending"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Grading Section */}
        {session.sessionStatus === 'completed' && (
          <GradingForm
            sessionId={sessionId}
            initialGrading={session.grading}
            onSuccess={() => {
              sessionDetailDomain.refetch();
            }}
          />
        )}
      </div>

      {/* Confirmation Modal */}
      <Dialog open={confirmModal.open} onOpenChange={(open) => setConfirmModal({ ...confirmModal, open })}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {confirmModal.type === "complete" ? "Complete Session" : "Cancel Session"}
            </DialogTitle>
            <DialogDescription className="text-gray-500 pt-2">
              {confirmModal.type === "complete"
                ? "Are you sure you want to mark this session as completed? This will notify the client and finalize the records."
                : "Are you sure you want to cancel this session? This action cannot be undone and will notify the client."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmModal({ ...confirmModal, open: false })}
              className="rounded-xl h-12"
            >
              No, Keep It
            </Button>
            <Button
              onClick={() => {
                setConfirmModal({ ...confirmModal, open: false });
                if (confirmModal.type === "complete") {
                  handleComplete();
                } else {
                  handleDelete();
                }
              }}
              className={`rounded-xl h-12 font-bold ${
                confirmModal.type === "complete"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {confirmModal.type === "complete" ? "Yes, Complete" : "Yes, Cancel Session"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}