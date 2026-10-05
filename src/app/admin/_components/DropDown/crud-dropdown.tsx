'use client';
import { useEffect, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AddModal from './add-modal';
import UpdateModal from './update-modal';
import DeleteModal from './delete-modal';
import toast from 'react-hot-toast';

function CRUDDropDown({ columnHeaders }: { columnHeaders: any[] }) {
  const [selectedAction, setSelectedAction] = useState("");

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!isAddModalOpen && !isUpdateModalOpen && !isDeleteModalOpen) {
      setSelectedAction("");
    }
  }, [isAddModalOpen, isUpdateModalOpen, isDeleteModalOpen]);


  return (
    <>
      {/* SPR-21-02-001: flat grey pill trigger to match the campaign toolbar mock */}
      <section className="flex items-center">
        <Select
        value={selectedAction}
          onValueChange={(value) => {
            switch (value) {
              case "add-dropdown":
                setIsDeleteModalOpen(false);
                setIsUpdateModalOpen(false);
                setIsAddModalOpen(true);
                break;
              case "update-dropdown":
                setIsAddModalOpen(false);
                setIsDeleteModalOpen(false);
                setIsUpdateModalOpen(true);
                break;
              case "delete-dropdown":
                setIsAddModalOpen(false);
                setIsUpdateModalOpen(false);
                setIsDeleteModalOpen(true);
                break;
              default:
                toast.error("Invalid drop down action")
                break;
            }
          }}
        >
          <SelectTrigger className="w-auto shrink-0 whitespace-nowrap rounded-md border-0 bg-[#f1f4f8] px-3 py-1.5 text-xs font-semibold text-[#5B6B7C] shadow-none hover:bg-[#e8edf3] [&>span]:truncate">
            <SelectValue
              placeholder=
              "Dropdown Actions"
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add-dropdown">Add Dropdown</SelectItem>
            <SelectItem value="delete-dropdown">Delete dropdown</SelectItem>
            <SelectItem value="update-dropdown">Update Dropdown</SelectItem>
          </SelectContent>
        </Select>
      </section>
      {isAddModalOpen && <AddModal
        showModal={isAddModalOpen} setShowModal={setIsAddModalOpen} />}
      {isUpdateModalOpen && (
        <UpdateModal
          columnHeaders={columnHeaders}
          showModal={isUpdateModalOpen}
          setShowModal={setIsUpdateModalOpen}
        />
      )}
      {isDeleteModalOpen && (
        <DeleteModal
          columnHeaders={columnHeaders}
          showModal={isDeleteModalOpen}
          setShowModal={setIsDeleteModalOpen}
        />
      )}
    </>
  )
}

export default CRUDDropDown;