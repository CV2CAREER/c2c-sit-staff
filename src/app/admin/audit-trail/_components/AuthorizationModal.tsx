"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeClosed } from "lucide-react";
import CloseIcon from "@mui/icons-material/Close";
import CustomModalNew from "@/components/CustomModal/CustomModalNew";
import { toast } from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import { verifyPassKey } from "../_utils/api";

interface AuthorizationModalProps {
  visibility: boolean;
  onAuthorizationSuccess: () => void;
}

const AuthorizationModal: React.FC<AuthorizationModalProps> = ({
  visibility,
  onAuthorizationSuccess,
}) => {
  const router = useRouter();
  const accessPass = useRef<HTMLInputElement>(null);
  const [isShowPassword, setShowPassword] = useState<boolean>(false);

  const verifyPassKeyMutation = useMutation({
    mutationFn: (passKey: string) => verifyPassKey(passKey),
    onSuccess: (isValid) => {
      if (isValid) {
        toast.success("Authorization successful");
        onAuthorizationSuccess();
      } else {
        toast.error("Authorization failed");
      }
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Authorization failed");
    },
  });

  const handleSubmitPassKey = () => {
    const enteredPass = accessPass?.current?.value?.trim();

    if (!enteredPass) {
      toast.error("Enter pass key to continue.");
      return;
    }

    verifyPassKeyMutation.mutate(enteredPass);
  };

  return (
    <CustomModalNew
      visibility={visibility}
      classNameToModifyModalPosition="center"
    >
      <div className="bg-white h-96 p-6 rounded-2xl z-1500 pointer-events-auto">
        <div className="flex w-full justify-end">
          <CloseIcon onClick={() => router.back()} className="cursor-pointer" />
        </div>
        <h5 className="text-24 text-center font-medium font-sharp-grotesk p-12">
          You need to be Authorized to continue
        </h5>
        <div className="flex items-center relative">
          <input
            className="w-full border border-gray-300 rounded-md p-2"
            type={isShowPassword ? "text" : "password"}
            placeholder="Enter Pass Key"
            ref={accessPass}
            disabled={verifyPassKeyMutation.isPending}
          />
          {isShowPassword ? (
            <Eye
              className="absolute right-3 cursor-pointer"
              onClick={() => setShowPassword(false)}
            />
          ) : (
            <EyeClosed
              className="absolute right-3 cursor-pointer"
              onClick={() => setShowPassword(true)}
            />
          )}
        </div>
        <div className="flex justify-center mt-6">
          <button
            className={`border w-full max-w-xs flex items-center bg-blue border-blue text-white capitalize px-4 py-3 h-[2.75rem] rounded-[0.25rem] text-14 font-medium hover:cursor-pointer justify-center text-center ${
              verifyPassKeyMutation.isPending ? "opacity-50 cursor-not-allowed" : ""
            }`}
            onClick={handleSubmitPassKey}
            disabled={verifyPassKeyMutation.isPending}
          >
            {verifyPassKeyMutation.isPending ? "Loading..." : "Submit"}
          </button>
        </div>
      </div>
    </CustomModalNew>
  );
};

export default AuthorizationModal;
