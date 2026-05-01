"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useCoachQueries, useCoachMutations } from "@/hooks/api/coach";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "antd";
import toast from "react-hot-toast";
import { Loader2, Save, Trash2, CheckCircle, ArrowLeft, Star } from "lucide-react";
import GradingForm from "./GradingForm";

export default function ManageSession() {
  const { sessionId } = useParams() as { sessionId: string };
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);

  const { sessionDetailDomain } = useCoachQueries({ sessionId });
  const { updateSession, completeSession, deleteSchedule } = useCoachMutations();

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
    if (confirm("Are you sure you want to mark this session as completed?")) {
      completeSession.mutate(sessionId, {
        onSuccess: () => {
          toast.success("Session completed");
          router.push("/coach/grading");
        },
        onError: () => toast.error("Failed to complete session"),
      });
    }
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to cancel this session?")) {
      deleteSchedule.mutate(sessionId, {
        onSuccess: () => {
          toast.success("Session canceled");
          router.push("/coach/scheduling");
        },
        onError: () => toast.error("Failed to cancel session"),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!session) {
    return <div className="text-center py-12 text-gray-500">Session not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {session.client?.firstName} {session.client?.lastName}
            </h2>
            <p className="text-gray-500 font-medium">
              {format(new Date(session.time?.startTime || new Date()), "PPP")} | {format(new Date(session.time?.startTime || new Date()), "p")} - {format(new Date(session.time?.endTime || new Date()), "p")}
            </p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
           {session.isGraded && (
             <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold border border-yellow-100">
               <Star size={14} className="fill-yellow-700" />
               GRADED
             </div>
           )}
           <Badge 
             status={session.sessionStatus === 'completed' ? 'success' : session.sessionStatus === 'canceled' ? 'error' : 'processing'} 
             text={session.sessionStatus?.toUpperCase()} 
             className="px-3 py-1 rounded-full bg-gray-100 font-bold"
           />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-2xl border-none shadow-sm bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-lg">Coach Preparation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Meeting Link</label>
              <Input
                value={formData.meetingLink}
                onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                disabled={!isEditing}
                placeholder="https://zoom.us/j/..."
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Internal Notes</label>
              <Textarea
                value={formData.additionalInfo}
                onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                disabled={!isEditing}
                placeholder="Preparation notes for the session..."
                className="min-h-[150px] bg-white"
              />
            </div>
            <div className="flex gap-2 justify-end">
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="outline" className="rounded-xl">Edit Details</Button>
              ) : (
                <>
                  <Button onClick={() => setIsEditing(false)} variant="ghost" className="rounded-xl">Cancel</Button>
                  <Button onClick={handleUpdate} disabled={updateSession.isPending} className="rounded-xl bg-blue-600 gap-2">
                    {updateSession.isPending ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                    Save Changes
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Session Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-500">Manage the lifecycle of this session. Completing a session will notify the client and finalize the records.</p>
            
            <div className="flex flex-col gap-3">
              {session.sessionStatus !== 'completed' && (
                <Button 
                  onClick={handleComplete} 
                  disabled={completeSession.isPending}
                  className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
                >
                  <CheckCircle size={20} />
                  Mark as Completed
                </Button>
              )}
              
              {session.sessionStatus !== 'canceled' && (
                <Button 
                  onClick={handleDelete} 
                  variant="outline"
                  className="w-full h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50 font-bold gap-2"
                >
                  <Trash2 size={20} />
                  Cancel Session
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {session.sessionStatus === 'completed' && (
        <GradingForm 
          sessionId={sessionId} 
          initialGrading={session.grading}
          onSuccess={() => {
            // Refetch session detail to update UI
            sessionDetailDomain.refetch();
          }}
        />
      )}
    </div>
  );
}
