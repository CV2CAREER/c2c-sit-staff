'use client';
import React, { useState, useEffect } from 'react';
import { FaCircleXmark } from 'react-icons/fa6';
import PulseLoader from './loader';
import AppModal from '@/components/modals/AppModal';
import { useAdminQueries, useAdminMutations } from '@/hooks/api/admin.api';
import toast from 'react-hot-toast';
// import { IUserDetail } from '@/types/user.types';

function DeleteDropDown({ setShowModal, columnHeaders }: { setShowModal: (show: boolean) => void, columnHeaders: any[] }) {
  const [isConfirmed, setIsConfirmed] = useState<boolean>(false);
  const [id, setId] = useState<string>('');
  const [dropDownObj, setDropDownObj] = useState({});

  const { adminDropdownsDomain } = useAdminQueries({
    fetchAdminDropdowns: true,
    columns: columnHeaders.map(header => header.headerName)
  })
  const data = adminDropdownsDomain.data;
  const isLoading = adminDropdownsDomain.isLoading;

  const [localDropDownList, setLocalDropDownList] = useState<any[]>([])

  useEffect(() => {
    if (data) {
      setLocalDropDownList(
        (data as any)?.dropdowns?.sort((a: any, b: any) =>
          a.title.localeCompare(b.title)
        ) || []
      );
    }
  }, [data]);

  return (
    <>
      {isLoading ? (
        <PulseLoader />
      ) : (
        <div>
          <div className="bg-gray-300 rounded-lg h-44 overflow-y-scroll">
            <div className="p-1 flex flex-col gap-1">
              {localDropDownList.map((dropdown) => (
                <div key={dropdown._id}>
                  <div className="bg-white p-2 w-full text-black rounded-md hover:bg-gray-200 hover:cursor-pointer shadow-md flex justify-between items-center">
                    <p>{dropdown.title}</p>
                    <FaCircleXmark
                      onClick={() => {
                        setIsConfirmed(true);
                        setDropDownObj(dropdown);
                        setId(dropdown._id);
                      }}
                      className="text-red-700"
                    />
                  </div>
                  {isConfirmed && id === dropdown._id && (
                    <ConfirmDelete
                      isConfirmed={isConfirmed}
                      setIsConfirmed={setIsConfirmed}
                      id={dropdown._id}
                      dropDownObj={dropDownObj}
                      setDropDownList={setLocalDropDownList}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="w-full flex justify-end gap-2 mt-5">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
              }}
              className="w-40 h-12 p-1 text-center text-white border bg-red-500 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default DeleteDropDown;

function ConfirmDelete({
  setIsConfirmed,
  isConfirmed,
  id,
  dropDownObj,
  setDropDownList
}: {
  setIsConfirmed: (isConfirmed: boolean) => void,
  isConfirmed: boolean,
  id: string,
  dropDownObj: any,
  setDropDownList: (updateFn: (prev: any[]) => any[]) => void
}) {
  const { deleteDropdownMutation } = useAdminMutations();

  const removeDropDown = async () => {
    deleteDropdownMutation.mutate(
      { id },
      {
        onSuccess: () => {
          setDropDownList((prev: any[]) => prev.filter((item) => item._id !== id));
          toast.success("Dropdown deleted successfully");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to delete dropdown");
        }
      }
    );
  };

  return (
    <AppModal
      isOpen={isConfirmed}
      onClose={() => setIsConfirmed(false)}
    >
      <div className="flex justify-center">
        <div className="bg-white rounded-lg p-3 w-72">
          <h2 className="text-center">{`Are You Sure you want to delete ${dropDownObj.title}?`}</h2>
          <div className="flex justify-between mt-3">
            <button
              className="bg-red-600 text-white p-2 w-1/2 rounded-lg"
              onClick={() => {
                setIsConfirmed(false);
                removeDropDown();
              }}
            >
              Yes
            </button>
            <button className="ml-1 shadow-sm p-2 w-1/2 rounded-lg" onClick={() => setIsConfirmed(false)}>No</button>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
