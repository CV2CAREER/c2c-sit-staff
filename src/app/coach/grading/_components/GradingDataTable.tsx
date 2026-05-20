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
    let list = sessions;
    if (gradingState === "Ungraded") {
      list = sessions.filter((s: any) => !s.isGraded);
    }
    if (gradingState === "Graded") {
      list = sessions.filter((s: any) => s.isGraded);
    }
    // Map to only the 7 desired fields (plus _id for row identification)
    return list.map((s: any) => ({
      _id: s.id,
      name: `${s["client.firstName"] ?? ""} ${s["client.lastName"] ?? ""}`.trim(),
      date: s.sessionDate ? new Date(s.sessionDate) : null,
      startTime: s.time?.startTime ?? null,
      endTime: s.time?.endTime ?? null,
      sessionType: s.sessionType,
      status: s.isGraded ? "Graded" : "Ungraded",
      score: s.grading != null ? `${s.grading.score}/${s.grading.maxScore}` : "—",
    }));
  }, [sessions, gradingState]);

  const modifyArray = (cols: any[]) => {
    const hiddenFields = ["_id", "note", "updatedBy", "nominatedDeveloper"];
    return cols.map((col) => {
      if (hiddenFields.includes(col.field)) {
        return {
          ...col,
          width: 0,
          headerName: "",
          sortable: false,
          filterable: false,
          renderCell: () => null,
        };
      }
      if (col.field === "date") {
        return {
          ...col,
          headerName: "Date",
          width: 130,
          renderCell: (params: any) => (
            <span>{params.value ? format(new Date(params.value), "MMM dd, yyyy") : "N/A"}</span>
          ),
        };
      }
      if (col.field === "startTime") {
        return {
          ...col,
          headerName: "Start Time",
          width: 110,
          renderCell: (params: any) => <span>{params.value ?? "N/A"}</span>,
        };
      }
      if (col.field === "endTime") {
        return {
          ...col,
          headerName: "End Time",
          width: 110,
          renderCell: (params: any) => <span>{params.value ?? "N/A"}</span>,
        };
      }
      if (col.field === "sessionType") {
        return {
          ...col,
          headerName: "Session Type",
          width: 180,
          renderCell: (params: any) => (
            <span className="capitalize">{params.value?.replace(/_/g, " ") ?? "N/A"}</span>
          ),
        };
      }
      if (col.field === "status") {
        return {
          ...col,
          headerName: "Status",
          width: 160,
          renderCell: (params: any) => {
            const row = params.row;
            if (row.status === "Graded") {
              return <span className="text-green-600 font-semibold text-xs">Graded</span>;
            }
            return (
              <Link
                href={`/coach/${row._id}`}
                className="text-blue-600 hover:underline font-semibold text-xs bg-blue-50 px-2 py-1 rounded"
              >
                Grade Session
              </Link>
            );
          },
        };
      }
      return col;
    });
  };

  const helpers = {};

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