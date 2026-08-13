import { useFetchData, useMutateData } from "../../useApi";
import {
  CLIENT_JOURNEY_BY_CLIENT,
  CLIENT_JOURNEY_ATTEST,
  CLIENT_JOURNEY_REOPEN,
} from "@/constants/apiEndpoints/client-journey.endpoint";
import { ClientJourneyResponse, ClientJourneyStepRow } from "@/types/client-journey.types";
import { AdminQueriesOptions } from "./types";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

export const useClientJourneyQueries = (options: AdminQueriesOptions) => {
  const { data: clientJourney, isLoading: isClientJourneyLoading } =
    useFetchData<ClientJourneyResponse>({
      method: "GET",
      url: options.userId ? CLIENT_JOURNEY_BY_CLIENT(options.userId) : "",
      queryKey: ["admin-client-journey", options.userId],
      enabled: !!options.fetchClientJourney && !!options.userId,
    });

  return {
    clientJourney: clientJourney?.data ?? null,
    isClientJourneyLoading,
  };
};

export const useClientJourneyMutations = () => {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-client-journey"] });
  };

  const { mutate: attestStep, isPending: isAttesting } = useMutateData<
    ClientJourneyStepRow,
    { clientId: string; stepKey: string }
  >({
    method: "POST",
    mutationKey: ["attest-client-journey-step"],
    url: (data) => CLIENT_JOURNEY_ATTEST(data.clientId),
    onSuccess: () => {
      toast.success("Step attested");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to attest step");
    },
  });

  const { mutate: reopenStep, isPending: isReopening } = useMutateData<
    null,
    { clientId: string; stepKey: string }
  >({
    method: "POST",
    mutationKey: ["reopen-client-journey-step"],
    url: (data) => CLIENT_JOURNEY_REOPEN(data.clientId),
    onSuccess: () => {
      toast.success("Step reopened");
      invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to reopen step");
    },
  });

  return {
    attestStep,
    isAttesting,
    reopenStep,
    isReopening,
  };
};
