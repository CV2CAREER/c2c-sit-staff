// components/AddOptionsContent.tsx
"use client";
import { useState } from "react";
import AddForm from "./AddForm";
import { OptionsContentProps } from "./types";

interface AddOptionConfig {
  label: string;
  type: string;
  itemLabelField?: string;
}

const AddOptionsContent: React.FC<OptionsContentProps> = ({ onCloseModal, onSuccess }) => {
  const [activeTab, setActiveTab] = useState("select");

  const addOptions: AddOptionConfig[] = [
    { label: "Add Changes", type: "changes" },
    { label: "Add Stage", type: "stage" },
    {
      label: "Add Impacted Provider",
      type: "impacted-provider",
    },
    { label: "Add Severity", type: "severity" },
    { label: "Add Type", type: "type" },
    {
      label: "Add Impacted Node",
      type: "impacted-node",
    },
    { label: "Add Family", type: "family" },
    {
      label: "Add Impacted Persona",
      type: "impacted-persona",
      itemLabelField: "label",
    },
    { label: "Add NIL/Owner", type: "owner" },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "select":
        return (
          <div className="bg-white p-6 rounded-2xl">
            <h2 className="text-gray-800 text-2xl font-bold mb-4">
              Select CR Option to Add
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {addOptions.map((option) => (
                <button
                  key={option.type}
                  type="button"
                  onClick={() => setActiveTab(option.type)}
                  className="w-full px-8 py-4 text-sm font-medium text-white bg-[#007ab3] rounded-md hover:bg-[#005a8c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition duration-300 ease-in-out"
                >
                  <span className="mr-2 inline-block transform transition-transform duration-300 ease-in-out hover:rotate-360"></span>{" "}
                  {option.label}
                </button>
              ))}
            </div>
            <h5 className="text-12 mt-4 text-[#666666] font-medium italic">
              select cr option to add a new record
            </h5>
            <div className="flex justify-end mt-8">
              <button
                type="button"
                onClick={onCloseModal}
                className="px-14 py-4 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition duration-300 ease-in-out"
              >
                Close
              </button>
            </div>
          </div>
        );
      default:
        const currentOption = addOptions.find(
          (option) => option.type === activeTab
        );
        if (currentOption) {
          return (
            <AddForm
              onClose={() => setActiveTab("select")}
              onSuccess={onSuccess}
              itemType={currentOption.type}
              itemLabelField={currentOption.itemLabelField}
            />
          );
        }
        return null;
    }
  };

  return renderContent();
};

export default AddOptionsContent;
