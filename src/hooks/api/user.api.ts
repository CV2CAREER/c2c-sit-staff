import { useFetchData } from "../useApi";
import { FETCHUSER } from "@/constants/apiEndpoints/auth.endpoint";
import { IUser } from "@/types/user.types";

// --------------- USER QUERY: Fetch authenticated staff user ---------------

interface UserQueriesOptions {
  fetchUserData?: boolean;
}

// Set to false to restore normal backend authentication
const BYPASS_AUTH = true;

const BYPASS_USER_DATA = {
  userDomain: {
    userData: {
      user: {
        _id: "dummy-staff-id",
        name: "Staff Bypass",
        firstName: "Staff",
        lastName: "Bypass",
        email: "staff-bypass@example.com",
        role: "admin",
      } as IUser,
    },
    userSuccess: true,
    userError: null,
    userLoading: false,
  },
};

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
    enabled: fetchUserData && !BYPASS_AUTH,
  });

  if (BYPASS_AUTH && fetchUserData) {
    return BYPASS_USER_DATA;
  }

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

