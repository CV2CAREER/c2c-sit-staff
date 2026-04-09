"use client";

import {
  PromptCategory,
  PromptQuestion,
  PromptSimulation,
} from "@/data/ai-prompts"; // Assuming this is the generic source
import { GridColDef } from "@mui/x-data-grid-pro";
import GenericRecordsPage from "../../_components/GenericRecordsPage";

const Page = () => {
  // Define column headers explicitly
  const columnHeaders: GridColDef[] = [
    { field: "_id", headerName: "ID", width: 100 },
    { field: "Category", headerName: "Category", width: 150 },
    { field: "Response", headerName: "Response", flex: 1 },
    { field: "Client Inputs", headerName: "Client Inputs", width: 200 },
    { field: "Simulated Response", headerName: "Simulated Response", flex: 1 },
    { field: "Code", headerName: "Code", flex: 1 },
  ];

  return (
    <GenericRecordsPage<PromptCategory, PromptQuestion, PromptSimulation>
      title="Keyword Generator AI Prompts Records"
      apiBasePath="prompts/keyword-generator"
      columnHeaders={columnHeaders}
      dataTransformer={(reportsData) => {
        let code = "";
        reportsData.full?.forEach((dt: any) => {
          dt.prompts?.forEach(
            (prompt: { value: string; clientInputs: any[] }) => {
              code += prompt?.value + " \n \n";
            }
          );
        });

        return reportsData.full?.map((dt: any) => {
          return {
            _id: dt._id,
            Category: dt.name,
            Response: dt.prompts[0]?.value,
            "Client Inputs": dt.prompts[0]?.clientInputs
              ?.map((cl: { label: string }) => {
                return `{${cl.label}}`;
              })
              .join(" , "),
            "Simulated Response": reportsData.simulations
              ?.map((sim: { response: string }) => {
                return sim?.response;
              })
              .join(" \n \n"),
            Code: code,
          };
        });
      }}
    />
  );
};

export default Page;
