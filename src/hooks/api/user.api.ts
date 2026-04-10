import { useFetchData } from "../useApi";
import { FETCHUSER } from "@/constants/apiEndpoints/auth.endpoint";
import { IUser } from "@/types/user.types";

// --------------- USER QUERY: Fetch authenticated staff user ---------------

interface UserQueriesOptions {
  fetchUserData?: boolean;
}


export const useUserQueries = (options: UserQueriesOptions) => {
  const { fetchUserData = false } = options;

  const {
    data: userData,
    error: userError,
    isLoading: userLoading,
    isSuccess: userSuccess,
  } = useFetchData<{ user: IUser; token?: string }>({
    method: "GET",
    url: FETCHUSER,
    queryKey: ["staff-user"],
    enabled: fetchUserData,
  });

  return {
    userDomain: {
      userData: userData?.data,
      userSuccess,
      userError,
      userLoading,
    },
  };
};

// --------------- USER MUTATIONS placeholder (extend as needed) ---------------

export const useUserMutations = () => {
  return {};
};

