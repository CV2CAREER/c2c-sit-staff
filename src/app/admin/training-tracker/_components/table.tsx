// src/app/_components/table.jsx
"use client";

import { Suspense, useState, useMemo, useCallback } from "react";
import Box from "@mui/material/Box";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  GridRowModesModel,
  GridRowModes,
  GridColDef,
  GridActionsCellItem,
  GridEventListener,
  GridRowId,
  GridRowModel,
  GridRowEditStopReasons,
  GridToolbarExport,
} from "@mui/x-data-grid-pro";
import moment from "moment";
import dynamic from "next/dynamic";

// Shadcn UI components
import { Button } from "@/components/ui/button";
import LoadingModal from "@/components/ui/loading-modal";

// React Icons
import { FaEdit, FaTrash, FaSave, FaTimes, FaUndo } from "react-icons/fa";
import { IoAddCircle } from "react-icons/io5";

// Hooks
import { useTrainingTrackerQueries, useTrainingTrackerMutations } from "@/hooks/api/admin/training-tracker";
import { TrainingTrackerData, ColumnHeader } from "../_schemas/trainingTracker";

// Utilities
import toast from "react-hot-toast";
import { orderTable } from "@/utils/table";
import { getBaseColumns } from "./tableColumns";
import TableWithHeaderClass from "@/components/Table";
import CreateModal from "./create-modal";
import ConfirmModal from "./confirm-modal";

const EditRowModal = dynamic(() => import("./edit-modal"));

export default function TrainingTrackerDatagrid({
  allowEdit,
  sessionNumber,
  isDeleted,
}: {
  allowEdit?: boolean;
  sessionNumber: number | null;
  isDeleted: boolean;
}) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const {
    trainingDataDomain,
    coachesDomain,
    usersFullNameDomain,
  } = useTrainingTrackerQueries({
    fetchTrainingTracker: true,
    trainingSessionNumber: sessionNumber,
    trainingIsDeleted: isDeleted,
    fetchUsersFullName: true,
  });

  const {
    createMutation,
    updateMutation,
    softDeleteMutation,
    permanentDeleteMutation,
    restoreMutation,
  } = useTrainingTrackerMutations();

  const isTrainingData = trainingDataDomain.data;
  const globalLoading = trainingDataDomain.isLoading;
  const user = usersFullNameDomain.data;

  const activeCoach = useMemo(() => {
    if (user.length > 0 && coachesDomain.data.length > 0) {
      return coachesDomain.data
        .map((coach: any) => {
          const coachUserId =
            coach?.user?._id ||
            coach?.user?.id ||
            coach?.userId ||
            (typeof coach?.user === "string" ? coach.user : undefined);
          const coachUser = user.find(
            (u: any) => u?._id === coachUserId || u?.id === coachUserId,
          );
          return coachUser
            ? {
                _id: coachUserId,
                id: coachUserId,
                fullName: `${coachUser.firstName} ${coachUser.lastName}`,
              }
            : null;
        })
        .filter(Boolean);
    }
    return [];
  }, [user, coachesDomain.data]);

  const [rowModesModel, setRowModesModel] = useState<any>({});
  const [localLoading, setLocalLoading] = useState(false);
  const [createModalIsOpen, setCreateModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<TrainingTrackerData | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant: "danger" | "warning";
    confirmLabel?: string;
  }>({ isOpen: false, title: "", description: "", onConfirm: () => {}, variant: "danger" });

  const closeConfirmModal = useCallback(() => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const [newRowData, setNewRowData] = useState<any>({
    traineeId: "",
    coachId: "",
    sessionNumber: sessionNumber ?? 1,
    date: new Date().toISOString().split("T")[0],
    status: "Pending",
    notes: "",
    progress: "Pro-Bono",
    reworkType: "Nil",
    preferredCraft: "",
    undergrad: "",
    postgrad: "",
    training: "",
    experience: "",
    overarchingRoleAndIndustryIdentified: false,
    personalDataGrouping: false,
    narrativeBasedGroupings: false,
    professionalSummary: false,
    technicalSkills: false,
    softSkills: false,
    jobDescriptionModification: false,
    factBasedGroupings: false,
    businessNameBusinessLocation: false,
    roleTitle: false,
    dateFormat: false,
    educationFormat: false,
    additionals: false,
    colourHighlightNewText: false,
    layoutModification: false,
    findReplaceAnd: false,
    paragraphing: false,
    alignment: false,
    textSpacing: false,
    differentiationOfEachRoleTitle: false,
    roleNarrativeDifferentiation: false,
    dateSerializationRationalization: false,
    roleSegmentation: false,
    developmentStatus: "Not-Reviewed",
    reviewer1: "Not-Reviewed",
    grammerreadabilityEase: false,
    smeTechnicalContent: false,
    reviewer2: "Not-Reviewed",
    clientRequirementsAssessment: false,
    reviewer3: "Not-Reviewed",
    dispatchToClient: false,
    coachingContact: "",
    coachingBooking: "",
    start: "00.00",
    duration: 30,
    sessionType: "Screening",
    surveyvideo: "NO",
    wmtycDecomposition: 0,
    smeTechnicalDepth: 0,
    deliverablesQuantification: 0,
    locationYearroleInTimeExample: 0,
    selfPronounUsage: 0,
    businessDeliverables: 0,
    grammardictioncommunication: 0,
    personabilitylikeabilityhumor: 0,
    respectcurtesy: 0,
    appearance: 0,
    pleasantriessmallTalk: 0,
    sessionObjectives: 0,
    professionIntroduction: 0,
    kpiDescriptionWithExamples: 0,
    cvresumeRendition: 0,
    respectcourtesyempathyhumility: 0,
    kpiCollaborativeScoring: 0,
    recordingAvailabilitySurvey: 0,
    maximumNumberOfQuestions: 0,
    complementingpositiveFeedback: 0,
    clientMultipleGosOnAllQs: 0,
    timeUtilization: 0,
    clientStoryResponses: 0,
    partingQuestions: 0,
    timeKeeping: 0,
    fillerPhrases: 0,
    intermittentClarificationRequest: 0,
  });

  const getUserFullName = useCallback(
    (userId: string) => {
      const foundUser = user.find((u: any) => (u._id || u.id) === userId);
      return foundUser
        ? `${foundUser.firstName} ${foundUser.lastName}`
        : "Unknown User";
    },
    [user]
  );

  const getCoachFullName = useCallback(
    (coachId: string) => {
      const foundCoach = activeCoach?.find((c: any) => (c._id || c.id) === coachId);
      return foundCoach ? foundCoach.fullName : "Unknown Coach";
    },
    [activeCoach]
  );

  const openEditModal = useCallback((row: TrainingTrackerData) => {
    setSelectedRow(row);
    setEditModalIsOpen(true);
  }, []);

  function EditToolbar() {
    const handleClick = () => {
      setCreateModalIsOpen(true);
      setNewRowData((prev: any) => ({
        ...prev,
        sessionNumber: sessionNumber ?? 1,
      }));
    };

    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, p: 0.5 }}>
        <Button
          className="flex items-center px-2 py-1.5 my-1.5 rounded-lg transition-all capitalize font-medium text-sm hover:shadow-lg bg-[#D7F7D4] text-[#5CBF54]"
          onClick={handleClick}
        >
          <IoAddCircle className="mr-1.5" />
          Add record
        </Button>
        <GridToolbarExport />
      </Box>
    );
  }

  const handleRowEditStop: GridEventListener<"rowEditStop"> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleEditClick = useCallback(
    (id: GridRowId) => () => {
      setRowModesModel((prevModel: any) => ({
        ...prevModel,
        [id]: { mode: GridRowModes.Edit },
      }));
    },
    []
  );

  const handleSaveClick = useCallback(
    (id: GridRowId) => () => {
      setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
    },
    [rowModesModel]
  );

  const handleDeleteClick = useCallback(
    (id: GridRowId) => () => {
      setConfirmModal({
        isOpen: true,
        title: "Move to Recycle Bin",
        description: "Are you sure you want to move this record to the recycle bin?",
        onConfirm: () => {
          softDeleteMutation.mutate({ trackerId: id as string });
          closeConfirmModal();
        },
        variant: "danger",
        confirmLabel: "Move to Bin",
      });
    },
    [softDeleteMutation, closeConfirmModal]
  );

  const handlePermanentDeleteClick = useCallback(
    (id: GridRowId) => () => {
      setConfirmModal({
        isOpen: true,
        title: "Permanently Delete",
        description: "Are you sure you want to permanently delete this record? This action cannot be undone.",
        onConfirm: () => {
          permanentDeleteMutation.mutate({ trackerId: id as string });
          closeConfirmModal();
        },
        variant: "danger",
        confirmLabel: "Delete Forever",
      });
    },
    [permanentDeleteMutation, closeConfirmModal]
  );

  const handleCancelClick = useCallback(
    (id: GridRowId) => () => {
      setRowModesModel({
        ...rowModesModel,
        [id]: { mode: GridRowModes.View, ignoreModifications: true },
      });
    },
    [rowModesModel]
  );

  const processRowUpdate = async (newRow: GridRowModel, oldRow?: GridRowModel) => {
    setLocalLoading(true);
    try {
      if (!oldRow) {
        oldRow = { ...newRow, id: newRow._id, isNew: true };
      }
      const updatedRow: any = { ...newRow, id: newRow._id, isNew: false };

      const hasChanged = Object.keys(newRow).some((key) => {
        if (key === "id" || key === "isNew" || key === "assessment") return false;
        if (key.includes("Date") || key.includes("coaching")) {
          const newDate = newRow[key] ? moment(newRow[key]).format("YYYY-MM-DD") : "";
          const oldDate = oldRow?.[key] ? moment(oldRow[key]).format("YYYY-MM-DD") : "";
          return newDate !== oldDate;
        }
        return newRow[key] !== oldRow?.[key];
      });

      if (!hasChanged && !oldRow.isNew) {
        toast("No changes detected.", { icon: "ℹ️" });
        return oldRow;
      }

      if (oldRow.isNew) {
        createMutation.mutate(updatedRow);
      } else {
        updateMutation.mutate({ newRow: updatedRow, trackerId: updatedRow._id });
      }

      return { ...updatedRow, id: updatedRow._id };
    } catch {
      toast.error("An error occurred during row update.");
      return oldRow;
    } finally {
      setLocalLoading(false);
    }
  };

  const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  const rows = useMemo(() => {
    if (isTrainingData && isTrainingData.length === 0) {
      return [];
    }
    return isTrainingData.map((item: any) => ({
      ...item,
      id: item._id,
      assessment:
        (Number(item.wmtycDecomposition) || 0) +
        (Number(item.smeTechnicalDepth) || 0) +
        (Number(item.deliverablesQuantification) || 0) +
        (Number(item.locationYearroleInTimeExample) || 0) +
        (Number(item.selfPronounUsage) || 0) +
        (Number(item.businessDeliverables) || 0) +
        (Number(item.grammardictioncommunication) || 0) +
        (Number(item.personabilitylikeabilityhumor) || 0) +
        (Number(item.respectcurtesy) || 0) +
        (Number(item.appearance) || 0),
    }));
  }, [isTrainingData]);

  const getActions = useCallback(
    ({ id, row }: { id: any; row: any }) => {
      const isInEditMode = rowModesModel[id as keyof typeof rowModesModel]?.mode === GridRowModes.Edit;

      if (isInEditMode) {
        return [
          <GridActionsCellItem
            icon={<FaSave />}
            label="Save"
            style={{ color: "#2196f3" }}
            onClick={handleSaveClick(id)}
            key="save-action"
          />,
          <GridActionsCellItem
            icon={<FaTimes />}
            label="Cancel"
            className="textPrimary"
            onClick={handleCancelClick(id)}
            color="inherit"
            key="cancel-action"
          />,
        ];
      }

      return isDeleted
        ? [
            <GridActionsCellItem
              icon={<FaUndo />}
              label="Restore"
              onClick={() =>
                setConfirmModal({
                  isOpen: true,
                  title: "Restore Record",
                  description: "Are you sure you want to restore this record?",
                  onConfirm: () => {
                    restoreMutation.mutate({ trackerId: row._id, userId: row.traineeId });
                    closeConfirmModal();
                  },
                  variant: "warning",
                  confirmLabel: "Restore",
                })
              }
              color="inherit"
              key="restore-action"
            />,
            <GridActionsCellItem
              icon={<FaTrash />}
              label="Permanently Delete"
              onClick={handlePermanentDeleteClick(id)}
              color="inherit"
              key="permanent-delete-action"
            />,
          ]
        : [
            <GridActionsCellItem
              icon={<FaEdit />}
              label="Edit"
              className="textPrimary"
              onClick={() => openEditModal(row as TrainingTrackerData)}
              color="inherit"
              key="edit-action"
            />,
            <GridActionsCellItem
              icon={<FaTrash />}
              label="Delete"
              onClick={handleDeleteClick(id)}
              color="inherit"
              key="delete-action"
            />,
          ];
    },
    [rowModesModel, handleSaveClick, handleCancelClick, restoreMutation, handlePermanentDeleteClick, openEditModal, handleDeleteClick, isDeleted, closeConfirmModal]
  );

  const tableName = "CRUD_TABLE";
  const columns = useMemo((): GridColDef[] => {
    const baseColumns = getBaseColumns(
      getActions,
      getUserFullName,
      getCoachFullName,
      user,
      activeCoach
    );

    const orderedColumns = orderTable(tableName, baseColumns);

    if (!isMobile) {
      return orderedColumns;
    }

    const mobileWidths: Record<string, number> = {
      coachId: 150,
      notes: 180,
      appearance: 140,
      partingQuestions: 170,
      maximumNumberOfQuestions: 180,
      clientStoryResponses: 170,
      timeKeeping: 150,
      fillerPhrases: 160,
      intermittentClarificationRequest: 190,
    };

    return orderedColumns.map((col) => {
      const mobileWidth = mobileWidths[col.field];
      if (!mobileWidth) return col;

      const currentWidth = typeof col.width === "number" ? col.width : mobileWidth;
      return {
        ...col,
        width: Math.min(currentWidth, mobileWidth),
      };
    });
  }, [getActions, getUserFullName, getCoachFullName, user, activeCoach, isMobile]);

  return (
    <Box sx={{ height: 600, width: "100%" }}>
      <TableWithHeaderClass
        rows={rows}
        columns={columns}
        density={isMobile ? "compact" : "standard"}
        columnHeaderHeight={isMobile ? 40 : 56}
        rowHeight={isMobile ? 40 : undefined}
        checkboxSelection={allowEdit}
        getRowId={(row) => row.id}
        editMode="row"
        rowModesModel={rowModesModel}
        onRowModesModelChange={handleRowModesModelChange}
        onRowEditStop={handleRowEditStop}
        onRowClick={(params: any) => {
          if (allowEdit) {
            openEditModal((params.row ?? params) as TrainingTrackerData);
          }
        }}
        processRowUpdate={processRowUpdate}
        loading={globalLoading || localLoading}
        slots={{
          toolbar: EditToolbar,
        }}
        showToolbar={true}
        initialState={{
          pagination: {
            paginationModel: { pageSize: 10 },
          },
        }}
        pageSizeOptions={[5, 10, 25]}
        disableRowSelectionOnClick
        sx={{
          ...(isMobile
            ? {
                "& .MuiDataGrid-columnHeader, & .MuiDataGrid-cell": {
                  px: 0.75,
                },
                "& .MuiDataGrid-columnHeaderTitle": {
                  fontSize: "0.72rem",
                  lineHeight: 1.15,
                },
                "& .MuiDataGrid-cell": {
                  fontSize: "0.75rem",
                },
              }
            : {}),
        }}
      />

      <CreateModal
        isOpen={createModalIsOpen}
        onClose={() => setCreateModalIsOpen(false)}
        setNewRowData={setNewRowData}
        newRowData={newRowData}
        user={user}
        activeCoach={activeCoach}
        processRowUpdate={processRowUpdate}
        sessionNumber={sessionNumber}
      />

      {editModalIsOpen && (
        <Suspense fallback={<LoadingModal />}>
          <EditRowModal
            isOpen={editModalIsOpen}
            onClose={() => setEditModalIsOpen(false)}
            columnHeaders={columns as ColumnHeader[]}
            rowData={selectedRow}
            activeCoach={activeCoach}
            user={user}
          />
        </Suspense>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        confirmLabel={confirmModal.confirmLabel}
      />
    </Box>
  );
}
