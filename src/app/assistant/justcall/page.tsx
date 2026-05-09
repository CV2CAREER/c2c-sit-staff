"use client";
import { useState, useMemo, useCallback } from "react";
import { RefreshCcwIcon } from "lucide-react";
import { GridColDef } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "antd";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TableWithHeaderClass from "@/components/Table";

// Types
type Trigger = {
  _id: number;
  trigger: string;
  template: string;
  status: "active" | "inactive";
};

// TemplateManager component
export default function TemplateManager() {
  const [selectedTrigger, setSelectedTrigger] = useState<Trigger | null>(null);
  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const queryClient = useQueryClient();

  const { data: triggers, isLoading: isTriggersLoading } = useQuery<Trigger[]>({
    queryKey: ["justcall-triggers"],
    queryFn: async () => {
      // Endpoint will be provided later - placeholder for now
      // const response = await axios.get("/api/admin/justcall");
      // return response.data;
      return [];
    },
  });

  const updateTriggerMutation = useMutation({
    mutationFn: (_updatedTrigger: {
      id: number;
      template?: string;
      status?: "active" | "inactive";
    }) => {
      // Endpoint will be provided later - placeholder for now
      // return axios.put("/api/admin/justcall", _updatedTrigger);
      return Promise.resolve();
    },
    onMutate: async (updatedTrigger) => {
      await queryClient.cancelQueries({ queryKey: ["justcall-triggers"] });
      const previousTriggers = queryClient.getQueryData<Trigger[]>([
        "justcall-triggers",
      ]);
      if (updatedTrigger.status) {
        queryClient.setQueryData<Trigger[]>(["justcall-triggers"], (old = []) =>
          old.map((t) =>
            t._id === updatedTrigger.id
              ? { ...t, status: updatedTrigger.status! }
              : t
          )
        );
      }
      return { previousTriggers };
    },
    onSuccess: () => {
      toast.success("Trigger updated successfully");
    },
    onError: (_err, _updatedTrigger, context) => {
      toast.error("Failed to update trigger");
      if (context?.previousTriggers) {
        queryClient.setQueryData(
          ["justcall-triggers"],
          context.previousTriggers
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["justcall-triggers"] });
    },
  });

  const handleReplace = useCallback((trigger: Trigger) => {
    setSelectedTrigger(trigger);
    setNewTemplateName(trigger.template); // Pre-fill with current template
    setIsReplaceOpen(true);
  }, []);

  const handleAssignTemplate = async () => {
    if (selectedTrigger) {
      updateTriggerMutation.mutate({
        id: selectedTrigger._id,
        template: newTemplateName,
      });
    }
    setIsReplaceOpen(false);
    setNewTemplateName("");
  };

  const handleSwitch = useCallback(
    (trigger: Trigger, newStatus: "active" | "inactive") => {
      updateTriggerMutation.mutate({ id: trigger._id, status: newStatus });
    },
    [updateTriggerMutation]
  );

  const columns: GridColDef<Trigger>[] = useMemo(
    () => [
      {
        field: "actions",
        headerName: "Actions",
        flex: 1,
        sortable: false,
        renderCell: (params) => (
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => handleReplace(params.row)}
              className="flex items-center px-3 py-2 hover:bg-gray-200 rounded-md transition-all"
            >
              <RefreshCcwIcon size={16} className="mr-1 text-green-500" />
              <span className="text-green-500 font-bold">Replace</span>
            </Button>
          </div>
        ),
      },
      { field: "trigger", headerName: "Trigger", flex: 1 },
      { field: "template", headerName: "Template", flex: 1, minWidth: 200 },
      {
        field: "status",
        headerName: "Status",
        flex: 1,
        renderCell: (params) => (
          <Switch
            checked={params.row.status === "active"}
            onChange={(checked) => {
              const newStatus = checked ? "active" : "inactive";
              handleSwitch(params.row, newStatus);
            }}
            checkedChildren="Active"
            unCheckedChildren="Inactive"
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div className="p-4">

      <div className="w-full h-[500px] mt-8">
        <TableWithHeaderClass
          rows={triggers || []}
            columns={columns}
          loading={isTriggersLoading || updateTriggerMutation.isPending}
          getRowId={(row) => row._id}
          disableRowSelectionOnClick
          sx={{
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#80D7FF",
            },
          }}
        />
      </div>

      {/* Replace Template Modal */}
      <Dialog open={isReplaceOpen} onOpenChange={setIsReplaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Replace Template for {selectedTrigger?.trigger}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="template-name" className="text-right">
                Template Name
              </Label>
              <Input
                id="template-name"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAssignTemplate}
              disabled={
                updateTriggerMutation.isPending ||
                !newTemplateName ||
                newTemplateName.length === 0
              }
            >
              {updateTriggerMutation.isPending
                ? "Assigning..."
                : "Assign Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}