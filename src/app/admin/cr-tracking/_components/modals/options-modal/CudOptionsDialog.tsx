// components/CudOptionsDialog.tsx
"use client";
import React, { useState, Suspense, lazy, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  CudOptionsDialogProps,
  OptionsContentProps,
  AllCrOptionsResponse,
} from "./types";
import { useCRTrackingQueries } from "@/hooks/api/admin/cr-tracking";
import VisuallyHidden from "@/components/ui/visually-hidden";

// Lazy load the content components for each tab
const LazyAddOptionsContent = lazy(() => import("./AddOptionsContent"));
const LazyUpdateOptionsContent = lazy(() => import("./UpdateOptionsContent"));
const LazyDeleteOptionsContent = lazy(() => import("./DeleteOptionsContent"));

const CudOptionsDialog: React.FC<CudOptionsDialogProps> = ({
  isOpen,
  onClose,
  initialTab,
}) => {
  const [activeTab, setActiveTab] = useState<"add" | "update" | "delete">(
    initialTab || "add"
  );

  // ── Domain Hook ──
  const { crOptionsDomain } = useCRTrackingQueries({
    fetchCRTrackingOptions: isOpen,
  });

  const data = crOptionsDomain.data as AllCrOptionsResponse | undefined;
  const isLoading = crOptionsDomain.isLoading;

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || "add");
    }
  }, [isOpen, initialTab]);

  const handleSuccess = () => {};

  // Extract data from the consolidated response for passing to child components
  const owners = data?.allCROwnersData || [];
  const changes = data?.allCRChangesData || [];
  const severities = data?.allCRSeveritiesData || [];
  const families = data?.allCRFamiliesData || [];
  const stages = data?.allCRStagesData || [];
  const types = data?.allCRTypesData || [];
  const impactedPersonas = data?.allCRImpactedPersonasData || [];
  const impactedProviders = data?.allCRImpactedProvidersData || [];
  const impactedNodes = data?.allCRImpactedNodesData || [];

  // Props to pass down to content components
  const commonContentProps: OptionsContentProps = {
    onCloseModal: onClose,
    onSuccess: handleSuccess,
    owners,
    changes,
    severities,
    families,
    stages,
    types,
    impactedPersonas,
    impactedProviders,
    impactedNodes,
  };

  if (isLoading && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-xl flex items-center justify-center">
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-800">
                Manage CR Options
              </DialogTitle>
            </DialogHeader>
          </VisuallyHidden>
          <p className="text-lg font-semibold">Loading CR Options...</p>
        </DialogContent>
      </Dialog>
    );
  }

  if (!data && isOpen) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-xl flex flex-col items-center justify-center text-red-600">
          <VisuallyHidden>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-gray-800">
                Manage CR Options
              </DialogTitle>
            </DialogHeader>
          </VisuallyHidden>
          <p className="text-lg font-semibold mb-2">
            Error loading CR Options
          </p>
          <button
            onClick={() => onClose()}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
          >
            Close
          </button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">
            Manage CR Options
          </DialogTitle>
        </DialogHeader>
        <Tabs
          defaultValue={activeTab}
          onValueChange={(value: string) =>
            setActiveTab(value as "add" | "update" | "delete")
          }
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="add">Add</TabsTrigger>
            <TabsTrigger value="update">Update</TabsTrigger>
            <TabsTrigger value="delete">Delete</TabsTrigger>
          </TabsList>
          <Suspense
            fallback={
              <div className="text-center p-8">Loading tab content...</div>
            }
          >
            <TabsContent value="add">
              <LazyAddOptionsContent {...commonContentProps} />
            </TabsContent>
            <TabsContent value="update">
              <LazyUpdateOptionsContent {...commonContentProps} />
            </TabsContent>
            <TabsContent value="delete">
              <LazyDeleteOptionsContent {...commonContentProps} />
            </TabsContent>
          </Suspense>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default CudOptionsDialog;
