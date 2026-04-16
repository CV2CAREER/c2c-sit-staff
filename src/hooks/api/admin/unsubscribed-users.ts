import { useFetchData, useMutateData } from "../../useApi";
import { UNSUBSCRIBED_USERS_BASE, UNSUBSCRIBED_USERS_DELETE } from "@/constants/apiEndpoints/unsubscribed-users.endpoint";
import { UnsubscribedUser } from "@/types/unsubscribed-users.types";
import { AdminQueriesOptions } from "./types";
import { toast } from "react-hot-toast";
import { useQueryClient } from "@tanstack/react-query";

export const useUnsubscribedUsersQueries = (options: AdminQueriesOptions) => {
  const { data: unsubscribedUsers, isLoading: isUnsubscribedUsersLoading } = useFetchData<UnsubscribedUser[]>({
    method: "GET",
    url: UNSUBSCRIBED_USERS_BASE,
    queryKey: ["admin-unsubscribed-users"],
    enabled: !!options.fetchUnsubscribedUsers,
  });

  return {
    unsubscribedUsers: unsubscribedUsers?.data || [],
    isUnsubscribedUsersLoading,
  };
};

export const useUnsubscribedUsersMutations = () => {
  const queryClient = useQueryClient();

  const { mutate: deleteUnsubscribedUser, isPending: isDeletingUnsubscribedUser } = useMutateData<any, { userId: string }>({
    method: "DELETE",
    mutationKey: ["delete-unsubscribed-user"],
    url: (data) => UNSUBSCRIBED_USERS_DELETE(data.userId),
    onSuccess: () => {
      toast.success("User removed from unsubscribed list");
      queryClient.invalidateQueries({ queryKey: ["admin-unsubscribed-users"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove user");
    },
  });

  return {
    deleteUnsubscribedUser,
    isDeletingUnsubscribedUser,
  };
};
