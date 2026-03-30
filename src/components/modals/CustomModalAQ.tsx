/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { classNames } from '@/utils/helperFns';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

interface CustomModalProps {
  toggleVisibility?: Function;
  visibility: boolean;
  children: any;
  callBack?: Function;
  classNameToModifyModalPosition?: string;
  dialogPanelClassName?: string;
}

const CustomModalAQ = ({
  toggleVisibility = () => {},
  visibility,
  children,
  callBack = () => {},
  // classNameToModifyModalPosition = 'center',
  dialogPanelClassName,
}: CustomModalProps) => {
  const closeModal = () => {
    toggleVisibility && toggleVisibility(false);
    callBack && callBack();
  };

  return (
    <>
      <Transition appear as={Fragment} show={visibility}>
        <Dialog as="div" className="relative z-50 " onClose={closeModal}>
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
              className={`flex min-h-full items-center justify-center`}
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
                <Dialog.Panel className={classNames("flex justify-center items-center w-[1200px] transform overflow-hidden shadow-xl transition-all", dialogPanelClassName as string)}>
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

export default CustomModalAQ;
