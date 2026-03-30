import AppModal from "@/components/modals/AppModal"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import React from "react";
// import { toast } from "react-hot-toast";


const ImportData = ({ isModalOpen, setShowModal }: { isModalOpen: boolean, setShowModal: (show: boolean) => void }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_file, setFile] = React.useState<File | null>(null);

    // const handleImportFile = () => {
    //     if (!file) return toast.error('Please select a file');
    //     const reader = new FileReader();
    //     reader.addEventListener('load', () => { });
    //     reader.readAsArrayBuffer(file);
    // };


    return (
        <AppModal isOpen={isModalOpen} onClose={() => setShowModal(false)}>
            <div className="bg-white flex items-center justify-center rounded-lg py-4 px-2 flex-col">
                <div className="flex flex-col my-2 w-full">
                    <label htmlFor="firstName" className="mb-3 capitalize text-gray-500">file</label>
                    <input onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                            setFile(e.target.files[0]);
                        }
                    }
                    }
                        className="focus:outline-none border text-sm p-1.5 rounded-lg "
                        type="file"
                        placeholder="First Name"
                        id="firstName"
                        spellCheck="true"
                    />
                </div>

                <Select>
                    <SelectTrigger className="w-full my-2 bg-white shadow-md">
                        <SelectValue
                            placeholder="Select Option"
                        />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="update"
                        >Update with imported file</SelectItem>
                        <SelectItem value="create">Create with imported file</SelectItem>
                    </SelectContent>
                </Select>
                <div className="w-full ">
                    <Button type="submit" className="w-full" >Import</Button>
                </div>
            </div>
        </AppModal>
    )
}

export default ImportData