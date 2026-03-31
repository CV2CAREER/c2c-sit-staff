import Link from "next/link";
import { Switch } from "antd";
import { CountrySelector } from "./userTableColumns";

export const applyDefaultColumn = (el: any) => {
  switch (el.field) {
    case "Job_Title":
      return {
        ...el,
        renderCell: (params: { formattedValue: string }) => {
          const regex = /"([^"]*)"/g;
          const matches = params?.formattedValue?.match(regex);

          const link = matches?.[0].replace(/^"|=hyperlink\(|\)"/g, "");
          const display = matches?.[1];

          return (
            <a
              href={link?.replace(/"/g, "")}
              target="_blank"
              className="text-career-blue-500"
            >
              {display}
            </a>
          );
        },
      };
    case "Active":
      return {
        ...el,
        editable: true,
        renderCell: (params: { formattedValue: boolean | undefined }) => {
          return (
            <Switch
              checked={params?.formattedValue}
              className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
            />
          );
        },
      };
    case "id":
      return {
        ...el,
        renderCell: (params: { formattedValue: any }) => {
          return (
            <Link
              href={`/admin-dashboard/master-sheet/client/${params?.formattedValue}?`}
            >
              {params?.formattedValue}
            </Link>
          );
        },
      };
    case "Country":
    case "country":
      return {
        ...el,
        renderEditCell: (params: unknown) => (
          <CountrySelector params={params} field={el.field} />
        ),
        type: "singleSelect",
        valueGetter: (params: {
          value: string;
          split: (arg0: string) => string[];
        }) => {
          const value = params?.value
            ? params?.value?.split("||")[0].replace(/</g, "").replace(/>/g, "")
            : params?.split("||")[0].replace(/</g, "").replace(/>/g, "");
          return value?.trim();
        },
      };
    case "SeekAnswerPriority":
    case "Seek_Aggregator":
    case "Linkedin_Aggregator":
    case "Jobserve_Aggregator":
    case "EscapeCity_Aggregator":
    case "WorkforceAustralia_Aggregator":
    case "WorkforceAustrailia_Aggregator":
    case "Adzuna_Aggregator":
    case "CareerOne_Aggregator":
    case "Indeed_Aggregator":
    case "Monster_Aggregator":
      return {
        ...el,
        editable: true,
        renderCell: (params: { formattedValue: boolean | undefined }) => {
          return (
            <Switch
              checked={params?.formattedValue}
              className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
            />
          );
        },
      };

    case "Capitalize":
      return {
        ...el,
        editable: true,
        type: "singleSelect",
        valueOptions: ["YES", "NO"],
      };

    case "Full_Name":
    case "Plan":
    case "ReturnCount":
    case "Order":
    case "First_Name":
    case "Middle_Name":
    case "Last_Name":
    case "Batch":
    case "Craft":
    case "Status":
    case "SeekSubStartDate":
    case "SeekWeeklyMax":
    case "SeekSubDurDays":
    case "SEEK_Email":
    case "SEEK_Password":
    case "Seek_Last_Application":
    case "Seek_Done":
    case "Seek_Credentials_Test":
    case "Seek_Credentials_Test_Date":
    case "SeekCVLastUpdateddate":
    case "Linkedin_Email":
    case "Linkedin_Password":
    case "Linkedin_Credentials_Test":
    case "Linkedin_Credentials_Test_Date":
    case "Indeed_Email":
    case "Indeed_Password":
    case "Indeed_Credentials_Test":
    case "Indeed_Credentials_Test_Date":
    case "Jobserve_Email":
    case "Jobserve_Password":
    case "Jobserve_Credentials_Test":
    case "EscapeCity_Email":
    case "EscapeCity_Password":
    case "EscapeCity_Credentials_Test":
    case "WorkforceAustralia_Email":
    case "WorkforceAustralia_Password":
    case "WorkforceAustralia_Credentials_Test":
    case "Monster_Email":
    case "Monster_Password":
    case "Monster_Last_Application":
    case "Monster_Done":
    case "Monster_Credentials_Test":
    case "Monster_Credentials_Test_Date":
    case "Suncorp_Email":
    case "Suncorp_Password":
    case "Suncorp_Credentials_Test":
    case "Suncorp_Credentials_Test_Date":
    case "Aurecon_Email":
    case "Aurecon_Password":
    case "Aurecon_Credentials_Test":
    case "Aurecon_Credentials_Test_Date":
    case "BHP_Email":
    case "BHP_Password":
    case "BHP_Credentials_Test":
    case "BHP_Credentials_Test_Date":
    case "Michael_Page_Email":
    case "Michael_Page_Password":
    case "Michael_Page_Credentials_Test":
    case "Michael_Page_Credentials_Test_Date":
    case "Randstad_Email":
    case "Randstad_Password":
    case "Randstad_Credentials_Test":
    case "Randstad_Credentials_Test_Date":
    case "Commonwealth_Bank_Email":
    case "Commonwealth_Bank_Password":
    case "Commonwealth_Bank_Credentials_Test":
    case "Commonwealth_Bank_Credentials_Test_Date":
    case "NAB_Email":
    case "NAB_Password":
    case "NAB_Credentials_Test":
    case "NAB_Credentials_Test_Date":
    case "Glencore_Email":
    case "Glencore_Password":
    case "Glencore_Credentials_Test":
    case "Glencore_Credentials_Test_Date":
    case "Current_City":
    case "Onboarding_Date":
    case "Criteria_Review_Completed":
    case "Referrer":
    case "Blacklisted":
    case "SEEK_Login_Type":
    case "planSelectedAt":
    case "Alias_Email":
    case "Alias_Password":
      return {
        ...el,
        editable: true,
      };

    default:
      return null;
  }
};
