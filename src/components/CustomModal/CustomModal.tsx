// Deprecated: Will be deleted in later versions
import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";

interface CustomModalProps {
  toggleVisibility?: (s: boolean) => void;
  visibility: boolean;
  children: React.ReactNode | any;
  callBack?: () => void;
  classNameToModifyModalPosition?: string;
  dialogPanelClassName?: string;
  callbackTrigger?: boolean;
  maxW?: string;
  z?: string;
}

/**
 * Separate classes with space between
 * This is used to separate a list of classes that are separated by commas to a list
 * classes that are separated by space
 * @param {string[]} classes
 * @return {string} classNames
 */
export const classNames = (...classes: string[]): string => {
  return classes.filter(Boolean).join(" ");
};

const CustomModal = ({
  toggleVisibility = () => {},
  visibility,
  children,
  callBack = () => {},
  classNameToModifyModalPosition = "center",
  dialogPanelClassName,
  callbackTrigger,
  maxW = "37.5rem",
  z = "z-50",
}: CustomModalProps) => {
  const closeModal = () => {
    if (!callbackTrigger) {
      if (toggleVisibility) toggleVisibility(false);
      if (callBack) callBack();
    }
  };

  return (
    <>
      <Transition appear as={Fragment} show={visibility}>
        <Dialog as="div" className={`relative ${z} `} onClose={closeModal}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-80" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div
              className={`flex p-8 min-h-full items-center justify-${classNameToModifyModalPosition}`}
            >
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel
                  className={classNames(
                    `w-full max-w-[${maxW}] transform overflow-hidden shadow-xl transition-all`,
                    dialogPanelClassName ? dialogPanelClassName : ""
                  )}
                >
                  {children}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default CustomModal;
