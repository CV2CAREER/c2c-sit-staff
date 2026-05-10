"use client";

import React from "react";
import Link from "next/link";

interface CoachSessionCardProps {
  data: {
    id: string;
    sessionStatus: string;
    sessionType: string;
    "client.firstName": string;
    "client.lastName": string;
    "schedule.date": string;
    "schedule.day": string;
    time: {
      startTime: string;
      endTime: string;
    };
  };
}

const sessionStatusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  canceled: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
  uncompleted: "bg-gray-100 text-gray-700 border-gray-200",
};

const CoachSessionCard = ({ data }: CoachSessionCardProps) => {
  const statusStyle = sessionStatusStyles[data.sessionStatus.toLowerCase()] || "bg-gray-100 text-gray-700";
  
  const scheduleDate = data["schedule.date"]?.split("T")[0] || "Unknown Date";
  const scheduleDay = data["schedule.day"] || "Unknown Day";
  const startTime = data.time.startTime || "Unknown Time";
  const endTime = data.time.endTime || "Unknown Time";
  const sessionTypeLabels: Record<string, string> = {
    screening_preparation: "Screening Preparation",
    interview_panel: "Interview Preparation",
    career_consultation: "Career Consultation",
  };
  const sessionTypeLabel = sessionTypeLabels[data.sessionType] || data.sessionType?.replace(/_/g, " ") || "Session";
  


  return (
    <Link 
      href={`/coach/${data.id}`}
      className="block group bg-white hover:bg-gray-50 border border-gray-200 rounded-xl p-5 shadow-sm transition-all duration-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-3 mb-4">
        <h4 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
          {`${data?.["client.firstName"]} ${data?.["client.lastName"]}`}
        </h4>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${statusStyle}`}>
          {data?.sessionStatus}
        </span>
      </div>
      
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <span className="font-semibold">{scheduleDate}</span>
          <span className="text-gray-300">|</span>
          <span>{scheduleDay}</span>
          <span className="text-gray-300">|</span>
          <span>{startTime} - {endTime}</span>
        </div>
        
        <div className="pt-3 border-t border-gray-100">
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest mb-1">Session Type</p>
          <p className="font-bold text-gray-800">
            {sessionTypeLabel}
          </p>
        </div>
      </div>
    </Link>
  );
};

export default CoachSessionCard;
