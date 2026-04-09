import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Suspense, useState } from "react";
import dynamic from "next/dynamic";
import Spinner from "@/components/ui/spinner";
import { transformCrOptions } from "@/utils/crTracking";
import { CROptionType } from "../../forms/form0";
import { useCRTrackingStore } from "@/store/crTrackingStore";
import { DialogDescription } from "@radix-ui/react-dialog";
import { useCRTrackingQueries } from "@/hooks/api/admin/cr-tracking";

const CRTrackingForm = dynamic(() => import("../../forms/form0"));
const CRTrackingPage1Form = dynamic(() => import("../../forms/form1"));

interface Props {
  open: boolean;
  setOpen: (value: boolean) => void;
}

export interface OptionsResponse {
  allCRStagesData: CROptionType[];
  allCRTypesData: CROptionType[];
  allCROwnersData: CROptionType[];
  allCRChangesData: CROptionType[];
  allCRSeveritiesData: CROptionType[];
  allCRFamiliesData: CROptionType[];
  allCRImpactedPersonasData: CROptionType[];
  allCRImpactedProvidersData: CROptionType[];
  allCRImpactedNodesData: CROptionType[];
}

const CreateCRTrackingModalContent = ({ open, setOpen }: Props) => {
  const [step, setStep] = useState(0);

  const { formData } = useCRTrackingStore();

  const { crOptionsDomain } = useCRTrackingQueries({
    fetchCRTrackingOptions: open,
  });

  const data = crOptionsDomain.data as OptionsResponse | undefined;
  const isLoading = crOptionsDomain.isLoading;

  return (
    <Dialog open={open} onOpenChange={() => setOpen(false)}>
      <DialogContent className="min-w-[90vw] md:min-w-[60vw] lg:min-w-[50vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Change Request</DialogTitle>
          <DialogTitle>Step {step + 1}</DialogTitle>
          {step === 1 && (
            <DialogDescription className="flex justify-between">
              <div>{formData?.status}</div>
              <div>{formData?.description}</div>
            </DialogDescription>
          )}
        </DialogHeader>
        {isLoading ? (
          <Spinner size="h-72" />
        ) : (
          <>
            {step === 0 && (
              <Suspense fallback={<Spinner size="h-72" />}>
                <CRTrackingForm
                  onNext={() => setStep(1)}
                  onClose={() => setOpen(false)}
                  CRTypes={transformCrOptions(data?.allCRTypesData) || []}
                  stageList={transformCrOptions(data?.allCRStagesData) || []}
                  owners={data?.allCROwnersData || []}
                  severityList={
                    transformCrOptions(data?.allCRSeveritiesData) || []
                  }
                  familyList={transformCrOptions(data?.allCRFamiliesData) || []}
                  changeList={transformCrOptions(data?.allCRChangesData) || []}
                  personasList={data?.allCRImpactedPersonasData || []}
                  impactedProviders={data?.allCRImpactedProvidersData || []}
                  impactedNodes={data?.allCRImpactedNodesData || []}
                  developers={
                    data?.allCROwnersData?.filter(
                      (o) => o.role?.toLowerCase() === "developer"
                    ) || []
                  }
                />
              </Suspense>
            )}
            {step === 1 && (
              <Suspense fallback={<Spinner size="h-72" />}>
                <CRTrackingPage1Form
                  onClose={() => setOpen(false)}
                  onBack={() => setStep(0)}
                />
              </Suspense>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CreateCRTrackingModalContent;
