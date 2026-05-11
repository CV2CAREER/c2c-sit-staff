"use client";

import React from "react";
import Table from "@/components/newTable/Table";
import { useCoachQueries } from "@/hooks/api/coach";
import Link from "next/link";
import { format } from "date-fns";

interface GradingDataTableProps {
  gradingState: "All" | "Ungraded" | "Graded";
}

const GradingDataTable = ({ gradingState }: GradingDataTableProps) => {
  const { sessionsDomain } = useCoachQueries({
    fetchSessions: true,
    limit: 100,
  });

  const sessions = sessionsDomain.data?.populatedSessions || [];

  const filteredSessions = React.useMemo(() => {
    if (gradingState === "Ungraded") {
      return sessions.filter((s: any) => !s.isGraded && s.sessionStatus?.toLowerCase() === "completed");
    }
    if (gradingState === "Graded") {
      return sessions.filter((s: any) => s.isGraded);
    }
    return sessions;
  }, [sessions, gradingState]);

  const modifyArray = (cols: any[]) => {
    return cols.map((col) => {
      if (col.field === "date") {
        return {
          ...col,
          renderCell: (params: any) => (
            <span>{params.value ? format(new Date(params.value), "MMM dd, yyyy") : "N/A"}</span>
          ),
        };
      }
      if (col.field === "time") {
        return {
          ...col,
          headerName: "Time",
          renderCell: (params: any) => {
            const time = params.value;
            if (time?.startTime && time?.endTime) {
              return <span>{time.startTime} - {time.endTime}</span>;
            }
            return <span>N/A</span>;
          },
        };
      }
      if (col.field === "isGraded") {
        return {
          ...col,
          headerName: "Grading Status",
          renderCell: (params: any) => (
            <div className="flex items-center gap-2">
              {params.value ? (
                <span className="text-green-600 font-semibold text-xs">Graded</span>
              ) : (
                <Link 
                  href={`/coach/grading/${params.row.id}`}
                  className="text-blue-600 hover:underline font-semibold text-xs bg-blue-50 px-2 py-1 rounded"
                >
                  Grade Session
                </Link>
              )}
            </div>
          ),
        };
      }
      return col;
    });
  };

  const helpers = {}; // Standard helper object for NewTable

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <Table
        data={filteredSessions}
        helpers={helpers}
        modifyArray={modifyArray}
        tableName="CoachGradingTable"
        isLoading={sessionsDomain.isLoading}
        checkBoxSelection={false}
      />
    </div>
  );
};

export default GradingDataTable;
