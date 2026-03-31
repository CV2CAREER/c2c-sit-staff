import moment from "moment";
import { TableInformationEnum, ClientTableInformationEnum, AppQuePageEnum } from "@/types/enum";
import { getCountries, getAdvertisers, getStatesAndCities, updateAggregator } from "./table-logic/table-services";
import { roleMap, order } from "./table-logic/constants";
import { arraysToObject, toTitleCase, convertTime, updateTime, createTime, modifyupdateData, handleAccountApproval } from "./table-logic/table-helpers";
import { applyUserTableColumn } from "./table-logic/factories/userTableColumns";
import { applyAggregatorColumn } from "./table-logic/factories/aggregatorColumns";
import { applyCpanColumn } from "./table-logic/factories/cpanColumns";
import { applyDefaultColumn } from "./table-logic/factories/defaultColumns";

export const reOrderKeys = (arr: any, desiredOrder = order) => {
  const orderedValues: any[] = [];
  const unorderedValues: any[] = [];
  arr.forEach((obj: { field: string }) => {
    if (desiredOrder.includes(obj.field)) {
      orderedValues.push(obj);
    } else {
      unorderedValues.push(obj);
    }
  });
  const sortedOrderedValues = orderedValues.sort((a, b) => {
    return desiredOrder.indexOf(a.field) - desiredOrder.indexOf(b.field);
  });

  const sortedArray = sortedOrderedValues.concat(unorderedValues);

  for (let i = 0; i < sortedArray.length; i++) {
    if (sortedArray[i].field === "profile") {
      sortedArray[i] = {
        ...sortedArray[i],
        headerName: "isActive",
        type: "isActive",
      };
    }
    if (sortedArray[i].field === "hasResume") {
      sortedArray[i] = { ...sortedArray[i], headerName: "C/R", type: "C/R" };
    }
    if (sortedArray[i].field === "hasCoverLetter") {
      sortedArray[i] = { ...sortedArray[i], headerName: "C/L", type: "C/L" };
    }

    if (sortedArray[i].field === "phoneNumber") {
      sortedArray[i] = {
        ...sortedArray[i],
        headerName: "Voice Number",
        type: "Voice Number",
      };
    }
    if (sortedArray[i].field === "whatsappNumber") {
      sortedArray[i] = {
        ...sortedArray[i],
        headerName: "WhatsApp Number",
        type: "WhatsApp Number",
      };
    }
  }

  return sortedArray;
};

export const modifyHeader = (
  arr: any,
  table?:
    | TableInformationEnum
    | ClientTableInformationEnum
    | AppQuePageEnum
    | string,
  data?: any,
  mutate?: any,
  actions?: any
) => {
  const newArr = arr.map((el: { field: unknown }) => {
    switch (table) {
      case "user-table":
        return applyUserTableColumn(el, actions, mutate) ?? { ...el };
      case "aggregator":
        return applyAggregatorColumn(el) ?? { ...el };
      case "cpan":
        return applyCpanColumn(el, actions) ?? { ...el };
      default:
        return applyDefaultColumn(el) ?? { ...el };
    }
  });
  return newArr;
};

export const modifyRowData = (
  el: any,
  index: number,
  table?: TableInformationEnum | ClientTableInformationEnum | AppQuePageEnum
) => {
  switch (table) {
    case ClientTableInformationEnum.Seek:
      return {
        ...el,
        Country:
          el?.Country?.split("||")[0]?.replace(/</g, "")?.replace(/>/g, "") ||
          "",
      };

    case TableInformationEnum.ClientInformation:
    case TableInformationEnum.ClientInformationRecycle:
      return {
        ...el,
        Active: (() => {
          if (el?.isActiveTriggeredByAdmin) {
            return el.Active;
          }
          if (el.CampaignEnd) {
            return moment().isAfter(
              moment(el.CampaignEnd, "DD-MM-YYYY").toDate()
            )
              ? false
              : true;
          } else {
            return moment().isAfter(
              moment(el.SeekSubStartDate)
                .add(Number(el.SeekSubDurDays), "days")
                .toDate()
            )
              ? false
              : true;
          }
        })(),
      };

    default:
      return {
        ...el,
        SeekSubToExpireDays: (() => {
          const t = moment(el.SeekSubStartDate)
            .add(Number(el.SeekSubDurDays), "days")
            .diff(moment(), "days");
          return t <= 0 ? 0 : t;
        })(),
        Done: el.Done ? moment(el.Done).format("DD-MM-YYYY HH:mm:ss") : null,
        Indeed_Done: el.Indeed_Done
          ? moment(el.Indeed_Done).format("DD-MM-YYYY HH:mm:ss")
          : null,
        Indeed_Last_Application: el.Indeed_Last_Application
          ? moment(el.Indeed_Last_Application).format("DD-MM-YYYY HH:mm:ss")
          : null,
        Jobserve_Done: el.Jobserve_Done
          ? moment(el.Jobserve_Done).format("DD-MM-YYYY HH:mm:ss")
          : null,
        Jobserve_Last_Application: el.Jobserve_Last_Application
          ? moment(el.Jobserve_Last_Application).format("DD-MM-YYYY HH:mm:ss")
          : null,
        EscapeCity_Done: el.EscapeCity_Done
          ? moment(el.EscapeCity_Done).format("DD-MM-YYYY HH:mm:ss")
          : null,
        EscapeCity_Last_Application: el.EscapeCity_Last_Application
          ? moment(el.EscapeCity_Last_Application).format("DD-MM-YYYY HH:mm:ss")
          : null,
        WorkforceAustralia_Done: el.WorkforceAustralia_Done
          ? moment(el.WorkforceAustralia_Done).format("DD-MM-YYYY HH:mm:ss")
          : null,
        WorkforceAustralia_Last_Application:
          el.WorkforceAustralia_Last_Application
            ? moment(el.WorkforceAustralia_Last_Application).format(
                "DD-MM-YYYY HH:mm:ss"
              )
            : null,
        Adzuna_Done: el.Adzuna_Done
          ? moment(el.Adzuna_Done).format("DD-MM-YYYY HH:mm:ss")
          : null,
        Adzuna_Last_Application: el.Adzuna_Last_Application
          ? moment(el.Adzuna_Last_Application).format("DD-MM-YYYY HH:mm:ss")
          : null,
        CareerOne_Done: el.CareerOne_Done
          ? moment(el.CareerOne_Done).format("DD-MM-YYYY HH:mm:ss")
          : null,
        CareerOne_Last_Application: el.CareerOne_Last_Application
          ? moment(el.CareerOne_Last_Application).format("DD-MM-YYYY HH:mm:ss")
          : null,
        Last_Application: el.Last_Application
          ? moment(el.Last_Application).format("DD-MM-YYYY HH:mm:ss")
          : null,
        Linkedin_Done: el.Linkedin_Done
          ? moment(el.Linkedin_Done).format("DD-MM-YYYY HH:mm:ss")
          : null,
        Linkedin_Last_Application: el.Linkedin_Last_Application
          ? moment(el.Linkedin_Last_Application).format("DD-MM-YYYY HH:mm:ss")
          : null,
        Onboarding_Date: el.Onboarding_Date
          ? moment(el.Onboarding_Date).format("DD-MM-YYYY HH:mm:ss")
          : null,
        SeekCVLastUpdateddate: el.SeekCVLastUpdateddate
          ? moment(el.SeekCVLastUpdateddate).format("DD-MM-YYYY HH:mm:ss")
          : null,
        SeekSubStartDate: el.SeekSubStartDate ? el.SeekSubStartDate : null,
        Seek_Credentials_Test_Date: el.Seek_Credentials_Test_Date
          ? moment(el.Seek_Credentials_Test_Date).format("DD-MM-YYYY HH:mm:ss")
          : null,
        Seek_Done: el.Seek_Done
          ? moment(el.Seek_Done).format("DD-MM-YYYY HH:mm:ss")
          : null,
        Seek_Last_Application: el.Seek_Last_Application
          ? moment(el.Seek_Last_Application).format("DD-MM-YYYY HH:mm:ss")
          : null,
        rowClass: `${index % 2 === 0 ? "bg-career-gray-400" : "bg-white"}`,
        Addecco_Done: moment(el.Addecco_Done).format("DD-MM-YYYY HH:mm:ss"),
        Assurance: el.Assurance
          ? moment(el.Assurance).format("YYYY-MM-DD")
          : null,
        planSelectedAt: el.planSelectedAt
          ? moment(el.planSelectedAt).format("DD-MM-YYYY HH:mm:ss")
          : null,
      };
  }
};

export const modifyDateToTimestamp = (
  el: any,
  table?: TableInformationEnum | ClientTableInformationEnum | AppQuePageEnum
) => {
  switch (table) {
    case ClientTableInformationEnum.Seek:
      return { ...el };

    case ClientTableInformationEnum.AnsweredQuestions:
      return {
        ...el,
        createdAt: createTime(el.createdAt),
        updatedAt: convertTime(el.updatedAt),
      };

    case AppQuePageEnum.questionsPageRecycle:
      return {
        ...el,
        createdAt: updateTime(el.createdAt),
        updatedAt: convertTime(el.updatedAt),
      };

    default:
      return {
        ...el,
        SeekSubEndDate: el.SeekSubEndDate,
        SeekSubToExpireDays: 0,
        Done: convertTime(el.Done),
        Indeed_Done: convertTime(el.Indeed_Done),
        Indeed_Last_Application: convertTime(el.Indeed_Last_Application),
        Jobserve_Done: convertTime(el.Jobserve_Done),
        Jobserve_Last_Application: convertTime(el.Jobserve_Last_Application),
        EscapeCity_Done: convertTime(el.EscapeCity_Done),
        EscapeCity_Last_Application: convertTime(
          el.EscapeCity_Last_Application
        ),
        WorkforceAustralia_Done: convertTime(el.WorkforceAustralia_Done),
        WorkforceAustralia_Last_Application: convertTime(
          el.WorkforceAustralia_Last_Application
        ),
        Last_Application: convertTime(el.Last_Application),
        Linkedin_Done: convertTime(el.Linkedin_Done),
        Linkedin_Last_Application: convertTime(el.Linkedin_Last_Application),
        Onboarding_Date: convertTime(el.Onboarding_Date),
        SeekCVLastUpdateddate: convertTime(el.SeekCVLastUpdateddate),
        SeekSubStartDate: el.SeekSubStartDate,
        Seek_Credentials_Test_Date: el.Seek_Credentials_Test_Date
          ? convertTime(el.Seek_Credentials_Test_Date)
          : el.Seek_Credentials_Test_Date,
        Seek_Done: convertTime(el.Seek_Done),
        Seek_Last_Application: convertTime(el.Seek_Last_Application),
        Adzuna_Last_Application: convertTime(el.Adzuna_Last_Application),
        Adzuna_Done: convertTime(el.Adzuna_Done),
        CareerOne_Done: convertTime(el.CareerOne_Done),
        CareerOne_Last_Application: convertTime(el.CareerOne_Last_Application),
        Adecco_Done: convertTime(el.Adecco_Done),
        Adecco_Last_Application: convertTime(el.Adecco_Last_Application),
      };
  }
};

export const modifyDuplicateData = (
  el: any,
  table?: TableInformationEnum | ClientTableInformationEnum
) => {
  switch (table) {
    case ClientTableInformationEnum.Seek:
      return { ...el };

    default:
      return {
        ...el,
        Location: el.Location,
        Type: el.Type,
        Type_Name: el.Type_Name,
        Min: el.Min,
        Max: el.Max,
        Listed: el.Listed,
        Classification_Name: el.Classification_Name,
        Sort_By: el.Sort_By,
      };
  }
};

export { getCountries, getAdvertisers, getStatesAndCities, updateAggregator };
export {
  arraysToObject,
  toTitleCase,
  convertTime,
  updateTime,
  createTime,
  modifyupdateData,
  handleAccountApproval
};

export { roleMap, order };
