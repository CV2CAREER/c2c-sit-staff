"use client";

import React, { useMemo, useState } from "react";
import { useCoachQueries } from "@/hooks/api/coach";
import CoachSessionCard from "../../dashboard/_components/CoachSessionCard";
import { Filter, Calendar, CheckSquare, XCircle, List } from "lucide-react";

type ScreenViewType =
  | "All Sessions"
  | "Screening"
  | "Interview"
  | "Completed"
  | "Canceled";

const SCREEN_VIEWS: { label: ScreenViewType; icon: React.ReactNode }[] = [
  { label: "All Sessions", icon: <List size={14} /> },
  { label: "Screening", icon: <Filter size={14} /> },
  { label: "Interview", icon: <Filter size={14} /> },
  { label: "Completed", icon: <CheckSquare size={14} /> },
  { label: "Canceled", icon: <XCircle size={14} /> },
];

const ScheduledEvents = () => {
  const [activeView, setActiveView] = useState<ScreenViewType>("All Sessions");
  const { sessionsDomain } = useCoachQueries({ fetchSessions: true, limit: 100 });

  const sessions = sessionsDomain.data?.populatedSessions || [];

  const filteredData = useMemo(() => {
    switch (activeView) {
      case "Screening":
        return sessions.filter((s: any) => s.sessionType?.toLowerCase() === "screening_preparation");
      case "Interview":
        return sessions.filter((s: any) => s.sessionType?.toLowerCase() === "interview_panel");
      case "Completed":
        return sessions.filter((s: any) => s.sessionStatus?.toLowerCase() === "completed");
      case "Canceled":
        return sessions.filter((s: any) => ["canceled", "cancelled"].includes(s.sessionStatus?.toLowerCase()));
      default:
        return sessions;
    }
  }, [sessions, activeView]);

  return (
    <div className="flex flex-col gap-6">
      {/* View Filters */}
      <div className="flex flex-wrap gap-2">
        {SCREEN_VIEWS.map((view) => (
          <button
            key={view.label}
            onClick={() => setActiveView(view.label)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              activeView === view.label
                ? "bg-blue-600 text-black shadow-blue-100"
                : "bg-white text-gray-600 border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30"
            }`}
          >
            {view.icon}
            {view.label}
            <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                activeView === view.label ? "bg-blue-500 text-black" : "bg-gray-100 text-black"
            }`}>
              {view.label === "All Sessions" ? sessions.length : 
               view.label === "Screening" ? sessions.filter((s: any) => s.sessionType?.toLowerCase() === "screening_preparation").length :
               view.label === "Interview" ? sessions.filter((s: any) => s.sessionType?.toLowerCase() === "interview_panel").length :
               view.label === "Completed" ? sessions.filter((s: any) => s.sessionStatus?.toLowerCase() === "completed").length :
               sessions.filter((s: any) => ["canceled", "cancelled"].includes(s.sessionStatus?.toLowerCase())).length}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sessionsDomain.isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-50 animate-pulse rounded-xl border border-gray-100" />
          ))
        ) : filteredData.length > 0 ? (
          filteredData.map((session: any) => (
            <CoachSessionCard key={session._id} data={session} />
          ))
        ) : (
          <div className="col-span-full bg-white rounded-xl border border-dashed border-gray-200 p-16 text-center text-gray-500">
            <Calendar size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="text-lg font-medium">No sessions found in this category</p>
            <p className="text-sm">When client book a session with you, they will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduledEvents;
