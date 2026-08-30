/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client";
import React from "react";
import { GridColDef } from "@mui/x-data-grid-pro";
import { Button } from "@/components/ui/button";
import { FiLoader } from "react-icons/fi";
import NotifyNilButton from "./NotifyNilButton";
import Link from "next/link";
import { useDowngradeCR, useUpgradeCR, useRestoreCR } from "../_api";
import { FaTrash } from "react-icons/fa6";

export const modifyCRArray = (
  modifiedArr: GridColDef[],
  dataState: "active" | "recycle",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setDataState: (prev: any) => void,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setSelectedRow: (prev: any) => void,
  setIsDeleteModalOpen: (prev: boolean) => void,
  allowEdit: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  refetch: (...args: any[]) => any
) => {
  modifiedArr = modifiedArr.filter(
    (el) => el.field !== "_id" && el.field !== "isDeleted" && el.field !== "__v"
  );

  if (dataState === "recycle") {
    modifiedArr.unshift({
      field: "actions",
      headerName: "Actions",
      width: 220,
      renderCell: (params) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const restoreCRMutation = useRestoreCR(params.row._id, setDataState);
        return (
          <div className="flex space-x-2">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                restoreCRMutation.mutate()
              }}
              className={`my-2 bg-green-500 text-white font-sharp-grotesk py-1.5 px-3 rounded-md text-xs transition duration-300 ease-in-out flex items-center ${
                restoreCRMutation.isPending
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-green-600"
              }`}
              disabled={restoreCRMutation.isPending}
            >
              {restoreCRMutation.isPending ? (
                <FiLoader className="animate-spin mr-1" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
              {restoreCRMutation.isPending ? "Restoring..." : "Restore"}
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRow(params.row);
                setIsDeleteModalOpen(true);
              }}
              className="my-2 bg-red-500 hover:bg-red-600 text-white font-sharp-grotesk py-1.5 px-3 rounded-md text-xs transition duration-300 ease-in-out flex items-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </Button>
          </div>
        );
      },
    });
  } else if (dataState === "active" && allowEdit) {
    modifiedArr.unshift({
      field: "actions",
      headerName: "Actions",
      width: 50,
      renderCell: (params) => (
        <div className="flex space-x-2">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedRow(params.row);
              setIsDeleteModalOpen(true);
            }}
            className="bg-red-500 hover:bg-red-600 text-white font-sharp-grotesk py-1"
          >
            <FaTrash className="h-4 w-4 mr-1" />
          </Button>
        </div>
      ),
    });
  } else {
    modifiedArr.unshift(
      {
        field: "notifyNIL",
        headerName: "Notify NIL",
        width: 160,
        // @ts-ignore
        renderCell: (params: any, i: number) => (
          <span>
            <NotifyNilButton
              params={params}
              isNILNotified={params.row.isNILNotified || false}
              fetchAllCR={refetch}
              key={i}
            />
          </span>
        ),
      },
      {
        field: "downgrade cr",
        headerName: "Downgrade CR",
        width: 160,
        renderCell: (params) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const downgradeMutation = useDowngradeCR(params.row._id, refetch);
          return (
            <div className="flex justify-between w-full">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  downgradeMutation.mutate();
                }}
                className={`my-2 bg-red-500 text-white font-sharp-grotesk py-1 px-2 rounded-md text-xs transition duration-300 ease-in-out flex items-center shadow-sm ${downgradeMutation.isPending || params.row.crType === "Proof of Concept" ? "opacity-50 cursor-not-allowed" : "hover:bg-red-600"}`}
                disabled={
                  downgradeMutation.isPending ||
                  params.row.crType === "Proof of Concept"
                }
              >
                {downgradeMutation.isPending ? (
                  <FiLoader className="animate-spin mr-1" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-6 mr-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 6 9 12.75l4.286-4.286a11.948 11.948 0 0 1 4.306 6.43l.776 2.898m0 0 3.182-5.511m-3.182 5.51-5.511-3.181"
                    />
                  </svg>
                )}
                {downgradeMutation.isPending ? " Downgrading..." : " Downgrade"}
              </Button>
            </div>
          );
        },
      },
      {
        field: "upgrade cr",
        headerName: "Upgrade CR",
        width: 160,
        renderCell: (params) => {
          // eslint-disable-next-line react-hooks/rules-of-hooks
          const upgradeMutation = useUpgradeCR(params.row._id, refetch);

          return (
            <div className="flex justify-between w-full">
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  upgradeMutation.mutate();
                }}
                className={`my-2 bg-green-500 text-white font-sharp-grotesk py-1 px-2 rounded-md text-xs transition duration-300 ease-in-out flex items-center shadow-sm ${upgradeMutation.isPending || params.row.crType === "Large" ? "opacity-50 cursor-not-allowed" : "hover:bg-green-600"}`}
                disabled={
                  upgradeMutation.isPending || params.row.crType === "Large"
                }
              >
                {upgradeMutation.isPending ? (
                  <FiLoader className="animate-spin mr-1" />
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="size-6 mr-2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"
                    />
                  </svg>
                )}
                {upgradeMutation.isPending ? "Upgrading..." : " Upgrade"}
              </Button>
            </div>
          );
        },
      }
    );
  }

  // Find and modifiy the card name col
  modifiedArr = modifiedArr.map((col) => {
    if (
      modifiedArr.filter((c) => c.headerName === "Card Name").includes(col)
    ) {
      return {
        ...col,
        renderCell: (params) => {
          return `${params.row.id}: ${params.row.description}`
        },
      };
    }
    return col;
  });

  const durationInHoursIndex = modifiedArr.findIndex(
    (el) => el.field === "durationInHours"
  );
  const durationInHoursColumnIndex = 6;

  // Find and modify the "Note Trail" column
  modifiedArr = modifiedArr.map((col) => {
    if (
      modifiedArr.filter((c) => c.headerName === "Note Trail").includes(col)
    ) {
      return {
        ...col,
        renderCell: (params) => {
          const notesArray = params.value || []; // Ensure it's an array
          return notesArray
            .map((note: { note: string }) => note.note)
            .join(", ");
        },
      };
    }
    return col;
  });

  if (durationInHoursIndex === -1) {
    modifiedArr.splice(6, 0, {
      field: "durationInHours",
      headerName: "Duration (Hours)",
      width: 150,
    });
  } else if (durationInHoursIndex !== durationInHoursColumnIndex) {
    const durationInHoursColumn = modifiedArr.splice(
      durationInHoursIndex,
      1
    )[0];
    modifiedArr.splice(durationInHoursColumnIndex, 0, durationInHoursColumn);
  }

  const counterIndex = modifiedArr.findIndex((el) => el.field === "counter");
  const counterColumnIndex = 7;

  if (counterIndex === -1) {
    modifiedArr.splice(counterColumnIndex, 0, {
      field: "counter",
      headerName: "Counter",
      width: 100,
    });
  } else if (counterIndex !== -1) {
    const counterColumn = modifiedArr.splice(counterIndex, 1)[0];
    modifiedArr.splice(counterColumnIndex, 0, counterColumn);
  }

  const nilIndex = modifiedArr.findIndex((el) => el.field === "NIL");
  const nilColumnIndex = 6;

  if (nilIndex === -1) {
    modifiedArr.splice(nilColumnIndex, 0, {
      field: "NIL",
      headerName: "Next in Line",
      width: 150,
    });
  } else if (nilIndex !== nilColumnIndex) {
    const nilColumn = modifiedArr.splice(nilIndex, 1)[0];
    modifiedArr.splice(nilColumnIndex, 0, nilColumn);
  }

  // Add createdBy column
  const createdByIndex = modifiedArr.findIndex(
    (el) => el.field === "createdBy"
  );
  if (createdByIndex === -1) {
    modifiedArr.splice(7, 0, {
      field: "createdBy",
      headerName: "Created By",
      width: 150,
    });
  } else if (createdByIndex !== 7) {
    const createdByColumn = modifiedArr.splice(createdByIndex, 1)[0];
    modifiedArr.splice(7, 0, createdByColumn);
  }

  // Find the index of currentStateImageURLs and futureStateImageURLs
  const currentStateIndex = modifiedArr.findIndex(
    (el) => el.field === "currentStateImageURLs"
  );
  const futureStateIndex = modifiedArr.findIndex(
    (el) => el.field === "futureStateImageURLs"
  );

  // If these columns exist, update them in place
  if (currentStateIndex !== -1) {
    modifiedArr[currentStateIndex] = {
      ...modifiedArr[currentStateIndex],
      headerName: "Current State Images",
      width: 200,
      renderCell: (params) => (
        <div>
          {params.value &&
            typeof params.value === "string" &&
            params.value?.split(", ").map((url, index) => (
              <Link
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline mr-2"
              >
                Image {index + 1}
              </Link>
            ))}
        </div>
      ),
    };
  }

  if (futureStateIndex !== -1) {
    modifiedArr[futureStateIndex] = {
      ...modifiedArr[futureStateIndex],
      headerName: "Future State Images",
      width: 200,
      renderCell: (params) => (
        <div>
          {params.value &&
            typeof params.value === "string" &&
            params.value?.split(", ").map((url, index) => (
              <Link
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline mr-2"
              >
                Image {index + 1}
              </Link>
            ))}
        </div>
      ),
    };
  }

  return modifiedArr;
};
