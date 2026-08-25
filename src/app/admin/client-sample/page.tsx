"use client";
import { useCallback,useMemo, useState } from "react";
import { Box } from "@mui/material";
import { StyledDataGridPro } from "@/utils/table";
import { MdMoreHoriz } from "react-icons/md";
import SampleForm from "./_components/form";
import Link from "next/link";
import {
  GridRenderCellParams,
  GridToolbar,
  GridValidRowModel,
} from "@mui/x-data-grid-pro";
import Tabs from "./_components/tabs";
import PageHeader from "@/components/PageHeader/PageHeader";
import LoadingSpinner from "@/components/reusable/LoadingSpinner";
import FilterComponent from "./_components/filter-component";
import { envOptions, jobsiteOptions } from "./_components/constants";
import LoadBalancerList from "@/components/LoadBalancer/LoadBalancer";

import { useAdminMutations, useAdminQueries } from "@/hooks/api/admin.api";
import { ClientSampleRow } from "@/types/client-sample.types";

export default function ClientSample() {
  const [tab, setTab] = useState(0); // 0 = Queued, 1 = Processing, 2 = Completed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [environment, setEnvironment] = useState<string>("");
  const [selectedJobsite, setSelectedJobsite] = useState<string>("");
  const [selectedEnv, setSelectedEnv] = useState<string>("");

  const { clientSampleTableDomain } = useAdminQueries({
    fetchClientSampleTable: true,
    sampleTableVariance: tab === 0 ? "queue" : tab === 1 ? "processing" : "completed",
    selectedEnv,
    selectedJobsite,
  });

  const { removeFromQueueMutation, retryClientSampleMutation } = useAdminMutations();

  const removeFromQueue = useCallback(
    (row: ClientSampleRow) => {
      removeFromQueueMutation.mutate({
        environment: row.env,
        email: row.jobsiteEmail,
        queue: row.aggregator,
      });
    },
    [removeFromQueueMutation]
  );

  const retry = useCallback(
    (row: ClientSampleRow) => {
      retryClientSampleMutation.mutate({
        queue: row.aggregator,
        email: row.email,
      });
    },
    [retryClientSampleMutation]
  );

  const OGColumns = useMemo(() => {
    return [
      {
        field: "name",
        headerName: "Name",
        renderCell: (params: GridRenderCellParams<GridValidRowModel>) => (
          <Link className="text-blue-600" href={`/admin/users/${params.row.uid}`}>
            {params.value}
          </Link>
        ),
        flex: 1,
        minWidth: 150,
        maxWidth: 150,
      },
      {
        field: "email",
        headerName: "Email",
        flex: 1,
        minWidth: 200,
        maxWidth: 300,
      },
      {
        field: "jobsiteEmail",
        headerName: "Jobsite Email",
        flex: 1,
        minWidth: 200,
        maxWidth: 300,
      },
      {
        field: "aggregator",
        headerName: "Aggregator",
        flex: 1,
        minWidth: 150,
        maxWidth: 250,
      },
      {
        field: "bot",
        headerName: "Bot Assigned",
        flex: 1,
        minWidth: 150,
        maxWidth: 250,
      },
      {
        field: "startTime",
        headerName: "Start Time",
        flex: 1,
        minWidth: 150,
        maxWidth: 250,
      },
      {
        field: "endTime",
        headerName: "End Time",
        flex: 1,
        minWidth: 150,
        maxWidth: 250,
      },
      {
        field: "progress",
        headerName: "Progress",
        renderCell: (params: any) => <span>{params.value}%</span>,
        flex: 1,
        minWidth: 100,
        maxWidth: 200,
      },
      {
        field: "status",
        headerName: "Status",
        renderCell: (params: any) => (
          <span
            className={`px-2 py-1 rounded-md ${
              params.value === "Success"
                ? "bg-[#D7FDD7] text-[#1EB62D]"
                : "bg-[#FFE4E4] text-[#B61E1E]"
            }`}
          >
            {params.value}
          </span>
        ),
        flex: 1,
        minWidth: 100,
        maxWidth: 200,
      },
      {
        field: "actions",
        headerName: "Actions",
        flex: 0.5,
        minWidth: 100,
        maxWidth: 150,
        renderCell: (params: any) => (
          <div className="relative">
            <button
              className="px-3 py-1 bg-white text-blue-600 rounded-md flex items-center"
              onClick={(e) => {
                e.preventDefault();
                if (typeof document !== "undefined") {
                  const dropdown = document.getElementById(
                    `dropdown-${params.row.id}`
                  );
                  if (dropdown) {
                    dropdown.classList.toggle("hidden");
                  }
                }
              }}
            >
              <MdMoreHoriz size={16} className="mr-2" />
            </button>
            <div
              id={`dropdown-${params.row.id}`}
              className="hidden fixed z-[1000] right-0 mt-2 me-4 bg-white rounded-md py-2 shadow-lg"
            >
              <ul>
                {tab === 0 && (
                  <li>
                    <button
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      onClick={() => removeFromQueue(params.row)}
                    >
                      Remove
                    </button>
                  </li>
                )}
                {tab === 2 && params.row.status === "Success" ? (
                  <li>
                    <Link
                      href={`/admin/master-sheet/client/${params.row.credentialId}?table=sample+Results`}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    >
                      View
                    </Link>
                  </li>
                ) : params.row.status === "Failed" ? (
                  <li>
                    <button
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      onClick={() => retry(params.row)}
                    >
                      Retry
                    </button>
                  </li>
                ) : null}
              </ul>
            </div>
          </div>
        ),
      },
    ];
  }, [tab, removeFromQueue, retry]);

  const columns = useMemo(() => {
    if (tab === 1) {
      return OGColumns.filter(
        (column) => column.field !== "endTime" && column.field !== "status"
      );
    } else if (tab === 2) {
      return OGColumns.filter((column) => column.field !== "progress");
    } else {
      return OGColumns.filter(
        (column) =>
          column.field !== "progress" &&
          column.field !== "startTime" &&
          column.field !== "endTime" &&
          column.field !== "status"
      );
    }
  }, [tab, OGColumns]);

  return (
    <div className="flex flex-col gap-8 mt-8">
      <PageHeader title="Client Sample" />

      <div className="bg-white rounded-sm p-6 flex flex-col gap-8">
        {/* Controls */}
        <SampleForm setEnvironment={setEnvironment} />

        <FilterComponent
          setSelectedJobsite={setSelectedJobsite}
          setSelectedEnv={setSelectedEnv}
          envOptions={envOptions}
          jobsiteOptions={jobsiteOptions}
        />

        {/* Tabs */}
        <Tabs tab={tab} setTab={setTab} />

        {/* Table */}
        <Box className="h-[700px]">
          <StyledDataGridPro
            rows={clientSampleTableDomain.data || []}
            columns={columns}
            initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
            checkboxSelection={false}
            disableRowSelectionOnClick
            className="bg-white shadow-md rounded-lg"
            paginationMode="server"
            pageSizeOptions={[500, 1000, 3000]}
            rowBufferPx={100}
            columnBufferPx={5}
            rowCount={(clientSampleTableDomain.data || []).length}
            slots={{
              toolbar: GridToolbar,
            }}
            loading={clientSampleTableDomain.isLoading}
            slotProps={{
              toolbar: {
                showQuickFilter: true,
                quickFilterProps: { debounceMs: 500 },
              } as any,
              loadingOverlay: LoadingSpinner as any,
            }}
            sx={{ overflow: "visible" }}
          />
        </Box>
      </div>

      <div className="bg-white rounded-sm p-6 flex flex-col gap-8">
        <LoadBalancerList />
      </div>
    </div>
  );
}