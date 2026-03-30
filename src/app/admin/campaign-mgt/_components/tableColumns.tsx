/* eslint-disable @typescript-eslint/ban-ts-comment */
import { GridColDef } from "@mui/x-data-grid-pro";
import { CampaignTableColType } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { CampaignTableActions } from "./Actions";
import Link from "next/link";
import { CampaignClientActions } from "./CampaignClientActions";

const campaignTableKeys: (keyof CampaignTableColType)[] = [
  "id",
  "CustomerId",
  "Full_Name",
  "First_Name",
  "Middle_Name",
  "Last_Name",
  "Plan",
  "ReturnCount",
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
  "Country",
  "Active",
  "isActiveTriggeredByAdmin",
  "SeekAnswerPriority",
  "Seek_Aggregator",
  "Linkedin_Aggregator",
  "Jobserve_Aggregator",
  "EscapeCity_Aggregator",
  "WorkforceAustralia_Aggregator",
  "Indeed_Aggregator",
  "Monster_Aggregator",
  "Jora_Aggregator",
  "Adzuna_Aggregator",
  "CareerOne_Aggregator",
  "Reed_Aggregator",
  "Adecco_Aggregator",
  "CVLibrary_Aggregator",
  "NHSJobs_Aggregator",
  "Alias_Email",
  "Alias_Password",
  "ExternalPassword",
  "VaName",
  "VaEmail",
  "Last_Application",
  "First_Application",
  "First_Application_Aggregator",
  "Throttle_Listing",
  "Throttle_Duration",
  "Last_Application_Source",
  "Done",
  "Done_Source",
  "Batch",
  "Craft",
  "updateBy",
  "createdAt",
  "updatedAt",
]

const initialTableColumns: GridColDef[] = [
  {
    field: "actions",
    headerName: "Actions",
    width: 80,
  },
  {
    field: "flight",
    headerName: "Flight",
    width: 150,
  },
  {
    field: "generate-aq",
    headerName: "Generate AQ",
    width: 150,
  },

]

const renderCellAsSwitchArr = [
  "Seek_Aggregator",
  "Linkedin_Aggregator",
  "Jobserve_Aggregator",
  "EscapeCity_Aggregator",
  "WorkforceAustralia_Aggregator",
  "Indeed_Aggregator",
  "Monster_Aggregator",
  "Jora_Aggregator",
  "Adzuna_Aggregator",
  "CareerOne_Aggregator",
  "Reed_Aggregator",
  "Adecco_Aggregator",
  "CVLibrary_Aggregator",
  "NHSJobs_Aggregator",
  "Active",
  "SeekAnswerPriority",
  "isActiveTriggeredByAdmin",
  "Throttle_Listing"
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

  if (key === "Keyword_Option") {
    return "KW/RT Logic"
  }

  if (key === "VaName") {
    return "PC Name"
  }

  if (key === "VaEmail") {
    return "PC Email"
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
              icon = '🚫';
              break;
            case 'critical':
              bgColor = 'bg-red-500';
              textColor = 'text-white';
              icon = '⚠️';
              break;
            case 'warning':
              bgColor = 'bg-yellow-400';
              textColor = 'text-gray-900';
              icon = '⚡';
              break;
            case 'normal':
              bgColor = 'bg-green-100';
              textColor = 'text-green-800';
              icon = '✓';
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
              {isExpired ? '🚫 EXPIRED' : '✓ Active'}
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
  handleFlight?: (clientId: string) => void
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
          return (
            <Button 
              className={params.row.Capitalized === 'INFLIGHT' ? "bg-red-600 text-white" : "bg-green-600 text-white"} 
              onClick={() => handleFlight?.(params.id as string)}
            >
              {params.row.Capitalized === 'INFLIGHT' ? 'Land' : 'Launch'}
            </Button>
          );
        },
      };
      return [...acc, flightEl];
    }

    return [...acc, el];
  }, []);

  return newArr;
};
