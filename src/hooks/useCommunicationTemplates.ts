import { useMemo } from "react";
import { useFetchData } from "@/hooks/useApi";
import * as endpoints from "@/constants/apiEndpoints/admin.endpoint";

type CommunicationTemplateUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email: string;
  role?: string;
  phoneNumber?: string | null;
  isEmailVerified?: boolean;
};

export function useCommunicationTemplates(fetchUsers = true) {
  const usersQuery = useFetchData<{ users: CommunicationTemplateUser[]; count: number }>({
    method: "GET",
    url: endpoints.USER_ALL,
    queryKey: ["communication-templates-users"],
    enabled: fetchUsers,
  });

  const clientUsers = useMemo(() => {
    const users = usersQuery.data?.data?.users ?? [];
    return users
      .filter((user) => user.role === "client" && user.isEmailVerified !== false)
      .sort((a, b) => {
        const nameA = `${a.firstName ?? ""} ${a.middleName ?? ""} ${a.lastName ?? ""}`.trim().toLowerCase();
        const nameB = `${b.firstName ?? ""} ${b.middleName ?? ""} ${b.lastName ?? ""}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [usersQuery.data]);

  return {
    usersDomain: {
      data: clientUsers,
      total: clientUsers.length,
      isLoading: usersQuery.isLoading,
      isSuccess: usersQuery.isSuccess,
      isError: usersQuery.isError,
      error: usersQuery.error,
      refetch: usersQuery.refetch,
    },
    templatesDomain: {
      data: [],
      isLoading: false,
      isSuccess: true,
      isError: false,
      error: null,
    },
    backendStatus: {
      templatesReady: false,
      notificationsReady: false,
      usersReady: true,
    },
  };
}
