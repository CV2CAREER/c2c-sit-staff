'use client';
import { ChangeEvent, FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { FaCircleXmark } from 'react-icons/fa6';
import { useAdminMutations } from '@/hooks/api/admin.api';


function AddDropDownForm({ setShowModal }: { setShowModal: (show: boolean) => void }) {
  const [title, setTitle] = useState<string>('');
  const [option, setOption] = useState<string>('');
  const [options, setOptions] = useState<string[]>([]);

  const handleOptionsChange = () => {
    if (option.length > 0) {
      setOptions([...options, option]);
      setOption('');
    } else {
      toast.error('cannot have an empty option');
    }
  };

  const { createDropdownMutation } = useAdminMutations();

  const handleTitleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleOptionChange = (e: ChangeEvent<HTMLInputElement>) => {
    setOption(e.target.value);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (title.length > 0 && options.length > 0) {
      const payload = { title: title, options: options };
      await toast.promise(
        createDropdownMutation.mutateAsync(payload),
        {
          loading: 'Creating Dropdown...',
          success: 'Dropdown created successfully!',
          error: 'Unable to create dropdown',
        }
      );
      setShowModal(false);
    } else {
      toast.error('Failed to Add new Drop down, Cannot have empty Title and Options');
    }
  };
  return (
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
            <ul className="p-1 flex flex-col gap-1">
              {options.map((option, ind) => (
                <li
                  key={ind}
                  className="bg-white p-2 w-full text-black rounded-md hover:bg-gray-200 hover:cursor-pointer shadow-md flex justify-between items-center"
                >
                  {option}
                  <FaCircleXmark
                    onClick={() => {
                      setOptions((prev) => prev.filter((opt) => opt != option));
                    }}
                    className="text-red-700"
                  />
                </li>
              ))}
            </ul>
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
            setShowModal(false);
          }}
          className="w-44 h-12 p-1 text-center border bg-gray-300 rounded-lg"
        >
          Back
        </button>
        <button
          type="submit"
          className="w-44 h-12 p-1 text-center bg-blue border text-white rounded-lg"
        >
          Submit
        </button>
      </div>
    </form>
  );
}

export default AddDropDownForm;
