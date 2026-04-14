"use client";

import { useState } from "react";
import CustomModal from "@/components/CustomModal/CustomModal";
import { useMutation } from "@tanstack/react-query";
import { setDbPassKey } from "../_utils/api";
import { toast } from "react-hot-toast";

interface PassKeyModalProps {
  visibility: boolean;
  toggleVisibility: (visible: boolean) => void;
  onSetSuccess: () => void;
}

const PassKeyModal: React.FC<PassKeyModalProps> = ({
  visibility,
  toggleVisibility,
  onSetSuccess,
}) => {
  const [passKey, setPassKey] = useState("");

  const setPassKeyMutation = useMutation({
    mutationFn: setDbPassKey,
    onSuccess: (data) => {
      toast.success(data.message);
      toggleVisibility(false);
      onSetSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to set pass key.");
    },
  });

  const handleSubmitPassKey = () => {
    if (!passKey.trim()) {
      toast.error("Pass key cannot be empty.");
      return;
    }
    setPassKeyMutation.mutate(passKey);
  };

  return (
    <CustomModal visibility={visibility} toggleVisibility={toggleVisibility}>
      <div className="bg-white h-96 p-6 rounded-2xl">
        <h2 className="text-24 font-medium font-sharp-grotesk mb-4">
          Set Pass Key
        </h2>
        <div className="flex flex-col items-center justify-center">
          <input
            className="w-3/4 h-12 rounded-md border-none bg-[#F0FBFF] mt-12 mb-24 p-2"
            type="password"
            placeholder="Enter New Pass Key"
            value={passKey}
            onChange={(e) => setPassKey(e.target.value)}
            disabled={setPassKeyMutation.isPending}
          />
        </div>

        <div className="flex items-center gap-4 justify-center">
          <button
            className={`mr-2 border w-[90%] mobile:w-auto flex justify-between lg:justify-normal items-center text-white border-blue bg-blue capitalize px-6 py-3 h-[2.39rem] rounded-[0.25rem] text-14 font-medium ${
              setPassKeyMutation.isPending
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            onClick={handleSubmitPassKey}
            disabled={setPassKeyMutation.isPending}
          >
            {setPassKeyMutation.isPending ? "Loading..." : "Submit"}
          </button>

          <button
            className={`mr-2 border my-4 mobile:my-0 w-[90%] mobile:w-auto flex items-center bg-white border-blue text-blue capitalize px-6 py-3 h-[2.39rem] rounded-[0.25rem] text-14 font-medium ${
              setPassKeyMutation.isPending
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            onClick={() => toggleVisibility(false)}
            disabled={setPassKeyMutation.isPending}
          >
            Cancel
          </button>
        </div>
      </div>
    </CustomModal>
  );
};

export default PassKeyModal;
