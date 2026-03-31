import { useState, useEffect } from "react";
import { Switch } from "@headlessui/react";

export default function Toggle({
  callback = () => {
  },
  initial,
  disabled = false,
  // isLoading = false,
}: {
  initial: boolean;
  disabled?: boolean;
  isLoading?: boolean;
  callback?: (e: boolean) => void;
}) {
  const [enabled, setEnabled] = useState<boolean>(initial);
  useEffect(() => {
    setEnabled(initial);
  }, [initial]);
  useEffect(() => {
    callback(enabled);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
  return (
    <div className="relative grid place-items-center">
      {disabled && (
        <div className="absolute w-[100%] h-[100%] top-0 left-0 bg-[#080f6b3a] rounded-full z-10"></div>
      )}
      <Switch
        defaultChecked={enabled}
        onChange={setEnabled}
        className={`${enabled ? "bg-green-500" : "bg-red-500"}
          relative inline-flex h-[38px] w-[74px] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75`}
      >
        <span className="sr-only">Use setting</span>
        <span
          aria-hidden="true"
          className={`${enabled ? "translate-x-9" : "translate-x-0"}
            pointer-events-none inline-block h-[34px] w-[34px] transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out`}
        />
      </Switch>
    </div>
  );
}
