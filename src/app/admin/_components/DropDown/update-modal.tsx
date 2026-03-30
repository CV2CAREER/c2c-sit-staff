'use client';
import UpdateDropDownForm from './Forms/update-dropdown-form';
import { useState } from 'react';
import PulseLoader from './loader';
import AppModal from '@/components/modals/AppModal';
import { useAdminQueries } from '@/hooks/api/admin.api';

function UpdateModal({ showModal, setShowModal, columnHeaders }: {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  columnHeaders: any[];
}) {
  const [isDropDownForm, setIsDropDownForm] = useState<boolean>(false);
  const [dropDownObject, setDropDownObject] = useState({});
  return (
    <AppModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
    >
      <div className="bg-white rounded-lg p-3">
        <h2 className="text-xl text-black mt-2 mb-4 font-semibold">Update Dropdown Option</h2>
        {isDropDownForm ? (
          <UpdateDropDownForm
            dropDownObject={dropDownObject}
            setIsDropDownForm={setIsDropDownForm}
            setShowModal={setShowModal}
          />
        ) : (
          <DropDownList
            setIsDropDownForm={setIsDropDownForm}
            setDropDownObject={setDropDownObject}
            setShowModal={setShowModal}
            columnHeaders={columnHeaders}
          />
        )}
      </div>
    </AppModal>
  );
}

export default UpdateModal;

function DropDownList({ setDropDownObject, setIsDropDownForm, setShowModal }: {
  setDropDownObject: (obj: any) => void;
  setIsDropDownForm: (show: boolean) => void;
  setShowModal: (show: boolean) => void;
  columnHeaders: any[];
}) {
  const { adminDropdownsDomain } = useAdminQueries({
    fetchAdminDropdowns: true,
  });

  const { data, isLoading } = adminDropdownsDomain;

  const dropDownList =
    data?.data?.dropdowns?.sort((a: { title: string }, b: { title: string }) =>
      a.title.localeCompare(b.title)
    ) || [];
  return (
    <>
      {isLoading ? (
        <PulseLoader />
      ) : (
        <div>
          <div className="bg-gray-300 rounded-lg h-44 overflow-y-scroll">
              <ul className="p-1 flex flex-col gap-1">
                {dropDownList.map((dropdown:{_id: string, title:string}) => (
                  <li
                    onClick={() => {
                      setDropDownObject(dropdown);
                      setIsDropDownForm(true);
                    }}
                    key={dropdown._id}
                    className="bg-white p-2 w-full text-black rounded-md hover:bg-gray-200 hover:cursor-pointer shadow-md"
                  >
                    {dropdown.title}
                  </li>
                ))}
              </ul>
            
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
