import { useQueryClient } from "@tanstack/react-query";
import { useMutateData } from "../useApi";
import { SIGNUP } from "@/constants/apiEndpoints/auth.endpoint";
import { IUserRegistration } from "@/types/auth.types";

export const useAuthMutations = () => {
  const queryClient = useQueryClient();

  //   sign up user
  const {
    mutate: registerUser,
    isSuccess: registerUserSuccess,
    isError: registerUserError,
    isPending: registerUserLoading,
  } = useMutateData<{ token: string; email: string }, IUserRegistration>({
    method: "POST",
    mutationKey: ["registerUser"],
    url: SIGNUP,
    onSuccess: (response) => {
      if (!response.success) return;

      const { token, email } = response?.data;

      //   toast.success("Verification OTP sent", response.message);

      //   router.push(`/verification?session=${token}&type=user`);
    },
    onError: (error) => {
      //   toast.error(error.message, "Something went wrong");
    },
  });

  return {
    registerDomain: {
      registerUser,
      registerUserSuccess,
      registerUserError,
      registerUserLoading,
    },
  };
};
