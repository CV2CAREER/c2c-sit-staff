// components/UpdateOptionsContent.tsx
"use client";
import { useState } from "react";
import UpdateForm from "./UpdateForm";
import {
  OptionsContentProps,
  Owner,
  Change,
  Severity,
  Family,
  Stage,
  Type,
  ImpactedPersona,
  ImpactedProvider,
  ImpactedNode,
} from "./types";

interface UpdateOptionConfig {
  label: string;
  type: string;
  data: any[];
  itemLabelField?: string;
}

const UpdateOptionsContent: React.FC<OptionsContentProps> = ({
  onCloseModal,
  owners,
  changes,
  severities,
  families,
  stages,
  types,
  impactedPersonas,
  impactedProviders,
  impactedNodes,
}) => {
  const [activeTab, setActiveTab] = useState("select");

  const updateOptions: UpdateOptionConfig[] = [
    {
      label: "Update Changes",
      type: "changes",
      data: changes as Change[],
    },
    {
      label: "Update Stage",
      type: "stage",
      data: stages as Stage[],
    },
    {
      label: "Update Impacted Provider",
      type: "impacted-provider",
      data: impactedProviders as ImpactedProvider[],
    },
    {
      label: "Update Severity",
      type: "severity",
      data: severities as Severity[],
    },
    {
      label: "Update Type",
      type: "type",
      data: types as Type[],
    },
    {
      label: "Update Impacted Node",
      type: "impacted-node",
      data: impactedNodes as ImpactedNode[],
    },
    {
      label: "Update Family",
      type: "family",
      data: families as Family[],
    },
    {
      label: "Update Impacted Persona",
      type: "impacted-persona",
      data: impactedPersonas as ImpactedPersona[],
      itemLabelField: "label",
    },
    {
      label: "Update NIL/Owner",
      type: "owner",
      data: owners as Owner[],
    },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case "select":
        return (
          <div className="bg-white p-6 rounded-2xl">
            <h2 className="text-2xl font-bold mb-4">
              Select CR Option to Update
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {updateOptions.map((option) => (
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
              select cr option to update an existing record
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
        const currentOption = updateOptions.find(
          (option) => option.type === activeTab
        );
        if (currentOption) {
          return (
            <UpdateForm
              onClose={() => setActiveTab("select")}
              onSuccess={() => null}
              items={currentOption.data}
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

export default UpdateOptionsContent;
