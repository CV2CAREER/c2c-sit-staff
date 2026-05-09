'use client';
import React, { useState } from 'react';
import { FaCircleXmark } from 'react-icons/fa6';
import toast from 'react-hot-toast';
import AppModal from '@/components/modals/AppModal';
import { useAdminMutations } from '@/hooks/api/admin.api';

function UpdateDropDownForm({ setShowModal, setIsDropDownForm, dropDownObject }: { setShowModal: (show:boolean) =>void, setIsDropDownForm: (val:boolean)=>void, dropDownObject: any }) {
  const [title, setTitle] = useState<string>(dropDownObject.title);
  const [option, setOption] = useState<string>('');
  const [options, setOptions] = useState<string[]>(dropDownObject.options);
  const [isConfirmDelete, setIsConfirmDelete] = useState(false);
  const [optionToDelete, setOptionToDelete] = useState('');

  const { updateDropdownMutation } = useAdminMutations();

  const handleOptionsChange = () => {
    if (option.length > 0) {
      setOptions([...options, option]);
      setOption('');
    } else {
      toast.error('cannot have an empty option');
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleEditOption = (option: string, ind: number) => {
    setOption(option);
    const updatedOptions = options.filter((_, idx) => idx !== ind);
    setOptions(updatedOptions);
  };

  const handleOptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOption(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (title.length > 0 && options.length > 0) {
      const payload = { title: title, options: options, id: dropDownObject._id };
      updateDropdownMutation.mutate(payload);
      setShowModal(false);
    }
  };
  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="mb-5 flex flex-col space-y-2">
          <label>Title</label>
          <input
            className="w-full border p-2 rounded-lg"
            value={title}
            onChange={handleTitleChange}
            placeholder="Title"
          />
        </div>
        <div>
          {options.length > 0 && (
            <div className="bg-gray-300 rounded-lg h-44 overflow-y-scroll">
              {/* the div above will have a fixed height and the ul will be scrollable. the background color will be graylike */}
              <div className="p-1 flex flex-col gap-1">
                {options.map((option, ind) => (
                  <div
                    key={ind}
                    className="bg-white w-full text-black p-2 rounded-md hover:bg-gray-200 hover:cursor-pointer shadow-md flex justify-between items-center"
                  >
                    <p
                      onClick={() => {
                        handleEditOption(option, ind);
                      }}
                      className="w-full"
                    >
                      {option}
                    </p>
                    <FaCircleXmark
                      onClick={() => {
                        setIsConfirmDelete(true);
                        setOptionToDelete(option);
                      }}
                      className="text-red-700"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-col space-y-2 mt-7">
            <label>Add Options</label>
            <input
              className="w-full border p-2 rounded-lg"
              value={option}
              onChange={handleOptionChange}
              placeholder="Input options here"
            />
          </div>
          <button
            type="button"
            className="mt-2 w-44 h-10 p-1 text-center border border-gray-300 rounded-lg"
            onClick={() => {
              handleOptionsChange();
            }}
          >
            Add new Option
          </button>
        </div>
        <div className="w-full flex justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={() => {
              setIsDropDownForm(false);
            }}
            className="w-40 h-12 p-1 text-center border bg-gray-300 rounded-lg"
          >
            Back
          </button>
          <button
            type="submit"
            className="w-44 h-12 p-1 text-center border bg-blue text-white rounded-lg"
          >
            Submit
          </button>
        </div>
      </form>
      {isConfirmDelete && (
        <ConfirmDelete
          setIsConfirmed={setIsConfirmDelete}
          title={title}
          options={options}
          setOptions={setOptions}
          isConfirmed={isConfirmDelete}
          option={optionToDelete}
          dropDownObject={dropDownObject}
        />
      )}
    </>
  );
}

export default UpdateDropDownForm;

function ConfirmDelete({
  setIsConfirmed,
  isConfirmed,
  option,
  options,
  setOptions,
  dropDownObject,
  title,
}: {
  setIsConfirmed: (confirmed: boolean) => void;
  isConfirmed: boolean;
  option: string;
  options: string[];
  setOptions: (options: string[]) => void;
  dropDownObject: any;
  title: string;
}) {
  const { updateDropdownMutation } = useAdminMutations();

  //This should be in the component that will contain the modal
  const removeOption = async () => {
    const filterRes = options.filter((opt: string) => opt != option);
    setOptions(filterRes);
    try {
      const payload = { title: title, options: filterRes, id: dropDownObject._id };
      updateDropdownMutation.mutate(payload, {
        onSuccess: () => toast.success('Successfully deleted Option'),
        onError: () => toast.error('Failed to delete Option')
      });
    } catch  {
      toast.error('Failed to delete Option');
    }
  };

  return (
    <AppModal
      isOpen={isConfirmed}
      onClose={() => setIsConfirmed(false)}
    >
      <div className="flex justify-center">
        <div className="bg-white rounded-lg p-3 w-72">
          <h2 className="text-center">{`Are You Sure you want to delete? ${option}`}</h2>
          <div className="flex justify-between mt-3">
            <button
              className="bg-red-600 text-white p-2 w-1/2 rounded-lg"
              onClick={async () => {
                setIsConfirmed(false);
                await removeOption();
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
