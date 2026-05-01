"use client";

import React from "react";
import { useCoachQueries } from "@/hooks/api/coach";
import StatCard from "@/app/admin/dashboard/_components/stats-card";
import CoachSessionCard from "./_components/CoachSessionCard";
import { Calendar, CheckCircle, Clock, BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";

const CoachDashboardPage = () => {
  const { sessionsDomain } = useCoachQueries({
    fetchSessions: true,
    limit: 6,
  });

  const sessions = sessionsDomain.data?.populatedSessions || [];
  const isLoading = sessionsDomain.isLoading;

  // Filter for pending/upcoming sessions
  const upcomingSessions = sessions.filter((s: any) => 
    ["pending", "scheduled"].includes(s.sessionStatus.toLowerCase())
  );

  const DASHBOARD_CARDS_DATA = [
    {
      title: "Total Sessions",
      value: sessions.length || 0,
      icon: <Calendar size={20} className="text-blue-500" />,
    },
    {
      title: "Completed",
      value: sessions.filter((s: any) => s.sessionStatus.toLowerCase() === "completed").length || 0,
      icon: <CheckCircle size={20} className="text-green-500" />,
    },
    {
      title: "Upcoming",
      value: upcomingSessions.length || 0,
      icon: <Clock size={20} className="text-yellow-500" />,
    },
    {
      title: "Graded",
      value: sessions.filter((s: any) => s.isGraded).length || 0, // Assuming isGraded exists
      icon: <BookOpen size={20} className="text-purple-500" />,
    },
  ];

  return (
    <section className="flex flex-col gap-8 mt-6">
      {/* Welcome & Quick Actions */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Coach Dashboard</h2>
          <p className="text-gray-500 mt-1">Manage your upcoming sessions and track student progress.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/coach/scheduling">
            <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors shadow-sm">
              <Calendar size={18} />
              Set Availability
            </button>
          </Link>
          <Link href="/coach/training-tracker">
            <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-semibold transition-colors">
              <ExternalLink size={18} />
              Training Tracker
            </button>
          </Link>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-6">
        {DASHBOARD_CARDS_DATA.map((card, idx) => (
          <StatCard
            key={idx}
            title={card.title}
            value={card.value}
            icon={card.icon}
            isLoading={isLoading}
          />
        ))}
      </section>

      {/* Booked Sessions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-gray-800">Booked Sessions</h3>
          <Link href="/coach/scheduling" className="text-sm font-semibold text-blue-600 hover:underline">
            View all sessions
          </Link>
        </div>
        
        <div className="p-6">
          {isLoading ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-40 bg-gray-50 animate-pulse rounded-xl border border-gray-100"></div>
                ))}
             </div>
          ) : upcomingSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcomingSessions.map((session: any) => (
                <CoachSessionCard key={session._id} data={session} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
               <Calendar size={48} className="text-gray-200 mb-4" />
               <p className="text-lg font-medium">No upcoming sessions</p>
               <p className="text-sm">You'll see them here once students book with you.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CoachDashboardPage;
