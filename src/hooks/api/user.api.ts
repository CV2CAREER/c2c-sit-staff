import { useToast } from "@/providers/toast.provider";
import { useAuthStore } from "@/store/user.store";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useFetchData } from "../useApi";

export const useUserMutations = () => {
  const queryClient = useQueryClient();
  const { setUser } = useAuthStore((state) => state);
  const router = useRouter();
  const toast = useToast();

  //   CODE SAMPLE

  //   forgot password
  //   const {
  //     mutate: forgotPassword,
  //     isSuccess: forgotPasswordSuccess,
  //     isError: forgotPasswordError,
  //     isPending: forgotPasswordLoading,
  //   } = useMutateData<{ token: string; user: IUser }, { email: string }>({
  //     method: "POST",
  //     mutationKey: ["forgot-password"],
  //     url: FORGOTPASSWORD,
  //     onSuccess: (response) => {
  //       if (!response.success) return;

  //       const { token, user } = response?.data;

  //       setOtpToken(token);
  //       setUser(user);

  //       toast.success("Reset OTP sent", response.message);

  //       router.push(`/reset-password?session=${token}&type=user`);
  //     },
  //     onError: (error) => {
  //       toast.error(error.message, "Something went wrong");
  //     },
  //   });

  //   return {
  //     forgotPasswordDomain: {
  //       forgotPassword,
  //       forgotPasswordSuccess,
  //       forgotPasswordError,
  //       forgotPasswordLoading,
  //     },
  //   };
};

// -----------------------------------------------
// -----------------------------------------------
// -----------------------------------------------
// -----------------------------------------------

interface UserQueriesOptions {
  fetchUserData?: boolean;
}

export const useUserQueries = (options: UserQueriesOptions) => {
  const { user: stateUser } = useAuthStore((s) => s);

  const { fetchUserData = false } = options;

  // user data
  //   const {
  //     data: userData,
  //     error: userError,
  //     isLoading: userLoading,
  //     isSuccess: userSuccess,
  //   } = useFetchData<{ user: IUser; token: string }>({
  //     method: "GET",
  //     // url: `${FETCHUSER}`,
  //     queryKey: [`user`],
  //     enabled: fetchUserData,
  //   });

  // user wallet

  return {
    // userDomain: {
    //   userData: userData?.data,
    //   userSuccess,
    //   userError,
    //   userLoading,
    // },
  };
};
