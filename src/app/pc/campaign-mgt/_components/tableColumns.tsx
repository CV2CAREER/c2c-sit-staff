/* eslint-disable @typescript-eslint/ban-ts-comment */
import { GridColDef } from "@mui/x-data-grid-pro";
import { CampaignTableColType } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CampaignTableActions } from "./Actions";
import Link from "next/link";
import { CampaignClientActions } from "./CampaignClientActions";
import { Loader2 } from "lucide-react";

// const campaignTableKeys: (keyof CampaignTableColType)[] = [
//   "id",
//   "CustomerId",
//   "Full_Name",
//   "First_Name",
//   "Middle_Name",
//   "Last_Name",
//   "Plan",
//   "ReturnCount",
//   "TourCount",
//   "Order",
//   "SeekSubStartDate",
//   "Assurance",
//   "SeekWeeklyMax",
//   "SeekSubDurDays",
//   "SeekSubEndDate",
//   "GraceDuration",
//   "CampaignEnd",
//   "Capitalized",
//   "SeekSubToExpireDays",
//   "SeekSubExpired",
//   "Country",
//   "Active",
//   "isActiveTriggeredByAdmin",
//   "SeekAnswerPriority",
//   "Seek_Aggregator",
//   "Linkedin_Aggregator",
//   "Jobserve_Aggregator",
//   "EscapeCity_Aggregator",
//   "WorkforceAustralia_Aggregator",
//   "Indeed_Aggregator",
//   "Monster_Aggregator",
//   "Jora_Aggregator",
//   "Adzuna_Aggregator",
//   "CareerOne_Aggregator",
//   "Reed_Aggregator",
//   "Adecco_Aggregator",
//   "CVLibrary_Aggregator",
//   "NHSJobs_Aggregator",
//   "Alias_Email",
//   "Alias_Password",
//   "ExternalPassword",
//   "VaName",
//   "VaEmail",
//   "VetName",
//   "VetEmail",
//   "CompletedName",
//   "CompletedEmail",
//   "InterimDPCName",
//   "InterimDPCEmail",
//   "InterimSPCName",
//   "InterimSPCEmail",
//   "Last_Application",
//   "First_Application",
//   "First_Application_Aggregator",
//   "Throttle_Listing",
//   "Throttle_Duration",
//   "Last_Application_Source",
//   "Done",
//   "Done_Source",
//   "Batch",
//   "Craft",
//   "updateBy",
//   "createdAt",
//   "updatedAt",
// ]

const campaignTableKeys: (keyof CampaignTableColType)[] = [
"id",
"CustomerId",
"Full_Name",
"First_Name",
"Middle_Name",
"Last_Name",
"Plan",
"TourCount",
"Order",
"SeekSubStartDate",
"Assurance",
"SeekWeeklyMax",
"SeekSubDurDays",
"SeekSubEndDate",
"GraceDuration",
"CampaignEnd",
"Capitalized",
"SeekSubToExpireDays",
"SeekSubExpired",
"Active",
"Alias_Email",
"Alias_Password",
"VaName",
"VetName",
"CompletedName",
"InterimDPCName",
"InterimSPCName",
"Last_Application",
"First_Application",
"Craft",
"updateBy",
"createdAt",
"updatedAt",
]

// const initialTableColumns: GridColDef[] = [
//   {
//     field: "actions",
//     headerName: "Actions",
//     width: 80,
//   },
//   {
//     field: "flight",
//     headerName: "Flight",
//     width: 150,
//   },
//   {
//     field: "generate-aq",
//     headerName: "Generate AQ",
//     width: 150,
//   },

// ]

// const renderCellAsSwitchArr = [
//   "Seek_Aggregator",
//   "Linkedin_Aggregator",
//   "Jobserve_Aggregator",
//   "EscapeCity_Aggregator",
//   "WorkforceAustralia_Aggregator",
//   "Indeed_Aggregator",
//   "Monster_Aggregator",
//   "Jora_Aggregator",
//   "Adzuna_Aggregator",
//   "CareerOne_Aggregator",
//   "Reed_Aggregator",
//   "Adecco_Aggregator",
//   "CVLibrary_Aggregator",
//   "NHSJobs_Aggregator",
//   "Active",
//   "SeekAnswerPriority",
//   "isActiveTriggeredByAdmin",
//   "Throttle_Listing"
// ];

const initialTableColumns: GridColDef[] = [
  {
    field: "actions",
    headerName: "Actions",
    width: 80,
    disableExport: true,
  },
  {
    field: "flight",
    headerName: "Flight",
    width: 150,
    disableExport: true,
  },
  {
    field: "generate-aq",
    headerName: "Generate AQ",
    width: 150,
    disableExport: true,
  },

]
const renderCellAsSwitchArr = [
  "Active"
];

const handleTableHeader = (key: string) => {
  // If the name contains Seek remove it apart from Seek_Aggregator
  let modifiedKey;
  if (key.includes("Seek") && key !== "Seek_Aggregator") {
    modifiedKey = key
      .replace("Seek", "")
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (char) => char.toUpperCase());

    return modifiedKey
  }

  if (key === "id") {
    return "Client Id"
  }

  if (key === "Craft") {
    return "Course of Study"
  }

  if (key === "Keyword_Option") {
    return "KW/RT Logic"
  }

  if (key === "VaName") {
    return "DPC Name"
  }

  if (key === "VaEmail") {
    return "DPC Email"
  }

  if (key === "VetName") {
    return "VPC Name"
  }

  if (key === "VetEmail") {
    return "VPC Email"
  }

    if (key === "Alias_Email") {
    return "Proxy Email"
  }

  if (key === "Alias_Password") {
    return "Proxy Password"
  }

  if (key === "CompletedName") {
    return "SPC Name"
  }

  if (key === "CompletedEmail") {
    return "SPC Email"
  }

  if (key === "InterimDPCName") {
    return "Interim DPC Name"
  }

  if (key === "InterimDPCEmail") {
    return "Interim DPC Email"
  }

  if (key === "InterimSPCName") {
    return "Interim SPC Name"
  }

  if (key === "InterimSPCEmail") {
    return "Interim SPC Email"
  }

  if (key === "TourCount") {
    return "Tour"
  }

  // Replace underscores with spaces, insert spaces before uppercase letters (camelCase), then capitalize each word
  modifiedKey = key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return modifiedKey
}

// 1. Create a helper function to determine alert status
const getExpiryAlertStatus = (daysToExpire: number | null) => {
  if (daysToExpire === null || daysToExpire === undefined) return null;

  if (daysToExpire <= 0) return 'expired';
  if (daysToExpire <= 7) return 'critical';
  if (daysToExpire <= 14) return 'warning';
  return 'normal';
};

export const tableColumns: GridColDef[] = [
  ...initialTableColumns,
  ...campaignTableKeys.map((key) => {
    const headerName = handleTableHeader(key);

        // Proxy Password — masked in the grid AND in the CSV export.
    // valueGetter (not renderCell) so exportDataAsCsv cannot leak the raw value.
    if (key === 'Alias_Password') {
      return {
        field: key,
        headerName,
        width: 150,
        valueGetter: (value: any) => (value ? '\u2022'.repeat(8) : ''),
      };
    }

    // Custom renderer for SeekSubToExpireDays
    if (key === 'SeekSubToExpireDays') {
      return {
        field: key,
        headerName,
        width: 200,
        renderCell: (params: any) => {
          const daysToExpire = params.value;
          const status = getExpiryAlertStatus(daysToExpire);

          let bgColor = 'bg-gray-100';
          let textColor = 'text-gray-700';
          let icon = '';

          switch (status) {
            case 'expired':
              bgColor = 'bg-red-600';
              textColor = 'text-white';
              icon = '\u{1F6AB}';
              break;
            case 'critical':
              bgColor = 'bg-red-500';
              textColor = 'text-white';
              icon = '\u26A0\uFE0F';
              break;
            case 'warning':
              bgColor = 'bg-yellow-400';
              textColor = 'text-gray-900';
              icon = '\u26A1';
              break;
            case 'normal':
              bgColor = 'bg-green-100';
              textColor = 'text-green-800';
              icon = '\u2713';
              break;
          }

          return (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-md ${bgColor} ${textColor} font-semibold`}>
              <span>{icon}</span>
              <span>{daysToExpire ?? 'N/A'} days</span>
            </div>
          );
        },
      };
    }

    // Custom renderer for SeekSubExpired
    if (key === 'SeekSubExpired') {
      return {
        field: key,
        headerName,
        width: 150,
        renderCell: (params: any) => {
          const isExpired = params.value === 'YES';
          return (
            <div className={`px-3 py-1 rounded-md font-semibold ${isExpired
                ? 'bg-red-600 text-white'
                : 'bg-green-100 text-green-800'
              }`}>
              {isExpired ? '\u{1F6AB} EXPIRED' : '\u2713 Active'}
            </div>
          );
        },
      };
    }

    if (renderCellAsSwitchArr.includes(key)) {
      return {
        field: key,
        headerName,
        width: 200,
        renderCell: (params: any) => {
          const checked = !!params.value;
          return (
            <Switch
              checked={checked}
              className={checked ? "bg-green-600" : "bg-red-600"}
            />
          );
        },
      };
    }

    return {
      field: key,
      headerName,
      width: 150,
    };
  }),
];

/**
 * Updates the "actions" column in a table column array to conditionally render an action menu.
 *
 * This function takes an array of table columns and a users data state which determines the actions
 * to be rendered. For an "active" state, the actions ["edit", "soft-delete", "generateAQ"] are applied, and for a
 * "recycle" state, the actions ["restore", "delete"] are applied.
 *
 * @param columnArr - The original array of grid column definitions.
 * @param campaignDataState - A string indicating the users data state. Use "active" for the active state and "recycle" for the recycle state.
 *
 * @returns A new array of grid column definitions with the "actions" column updated to render the appropriate action buttons.
 */
// @ts-ignore
export const modifyCampaignActionsColAndRows = (
  columnArr: GridColDef[],
  campaignDataState: "active" | "recycle" | "all",
  isVisible: boolean,
  route: string = "admin",
  table: string,
  tablePage: "campaign-client" | "campaign" = "campaign",
  rowsData: any,
  setRowsData: (data: any) => void,
  generateAQFn?: (clientId: any) => void,
  handleFlight?: (clientId: string) => void,
  flightTogglingId?: string | null
) => {
  const newArr = columnArr.reduce((acc: GridColDef[], el: GridColDef) => {

    if (el.field === "generate-aq") {
      const generateEL: GridColDef = {
        ...el,
        renderCell: (params) => {
          return (
            // @ts-ignore
            <Button className="bg-green-600" onClick={() => generateAQFn?.(params.id)}>Generate AQ</Button>
          );
        },
      }

      return [...acc, generateEL]
    }

    if (el.field === "Full_Name") {

      const fullNameEl: GridColDef = {
        ...el,
        renderCell: (params) => (
          <Link href={`/${route}/campaign-mgt/client/${params.id}`} className="text-blue hover:underline">{params.formattedValue}</Link>
        )
      }
      return [...acc, fullNameEl]
    }

    if (el.field === "screenshot") {
      const screenshotEl: GridColDef = {
        ...el,
        renderCell: (params: { row: { Screenshot: string | undefined } }) => {
          const screenshotValue = params?.row?.Screenshot || '';
          const urlMatch = screenshotValue.match(/"(https?:\/\/[^"]+)"/);
          const textMatch = screenshotValue.match(/,"([^"]+)"/);
          return (
            <Link className="hover:underline text-blue" href={urlMatch?.at(1) || ""} target="_blank">{textMatch?.at(1) || "image"}</Link>
          )
        }
      }
      return [...acc, screenshotEl]
    }

    if (el.field === "Job_Title") {
      const jobTitleEl: GridColDef = {
        ...el,
        renderCell: (params: { row: { Job_Title: string | undefined } }) => {
          const jobTitleValue = params?.row?.Job_Title || '';
          const urlMatch = jobTitleValue.match(/"(https?:\/\/[^"]+)"/);
          const textMatch = jobTitleValue.match(/,"([^"]+)"/);
          return (
            <Link className="text-blue hover:text-career-blue-400" href={urlMatch?.at(1) || ""} target="_blank">{textMatch?.at(1) || ''}</Link>
          )
        }
      }
      return [...acc, jobTitleEl]
    }

    if (el.field === "actions") {
      if (!isVisible) {
        return acc;
      }

      const actionsEl: GridColDef = {
        ...el,
        renderCell: (params: any) => {
          return (
            tablePage === "campaign-client" ?
              <CampaignClientActions
                client={params.row}
                table={table}
                rowsData={rowsData}
                columnHeaders={columnArr}
                setRowsData={setRowsData}
                actions={campaignDataState === "active" || campaignDataState === "all"
                  ? ["edit", "soft-delete"]
                  : ["restore", "delete"]}
              />
              :
              <CampaignTableActions
                client={params.row}
                actions={campaignDataState === "active" || campaignDataState === "all"
                  ? ["edit", "soft-delete", "generate-password"]
                  : ["restore", "delete"]}
                rowsData={rowsData}
                setRowsData={setRowsData}
              />
          )
        }
      };
      return [...acc, actionsEl];
    }

    if (el.field === "flight") {
      const flightEl: GridColDef = {
        ...el,
        renderCell: (params) => {
          const isInflight = params.row.capitalized === 'INFLIGHT';
          const isExpired = params.row.SeekSubExpired === 'YES';
          const isToggling = flightTogglingId === params.id;
          return (
            <div className="flex items-center gap-1.5">
              <Button
                className={isInflight ? "bg-red-600 text-white" : "bg-green-600 text-white"}
                onClick={() => handleFlight?.(params.id as string)}
                disabled={isToggling}
              >
                {isToggling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Toggling...
                  </>
                ) : (
                  isInflight ? 'Land' : 'Launch'
                )}
              </Button>
              {isInflight && isExpired && (
                <span
                  className="px-2 py-1 rounded-md bg-red-600 text-white text-xs font-semibold whitespace-nowrap"
                  title={`Campaign End: ${params.row.CampaignEnd ?? 'N/A'}`}
                >
                  {'\u{1F6AB}'} Expired
                </span>
              )}
            </div>
          );
        },
      };
      return [...acc, flightEl];
    }

    return [...acc, el];
  }, []);

  return newArr;
};