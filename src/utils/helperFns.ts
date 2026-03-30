import moment from "moment";
import metadata from "libphonenumber-js/metadata.full.json";
import { UserRoles } from "@/types/enum";
import currencyFormatter from "currency-formatter";


export const generateOTP = () => {
  const OTP = Math.floor(100000 + Math.random() * 900000).toString();
  return OTP;
};

export const generateReferralCode = (length: number) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }

  return result;
};

export const getCountryCodes = () => {
  const countryData = metadata.countries; // Contains country metadata
  const countryCodes = Object.entries(countryData).map(
    ([data]) => `+${data[0]}`,
  );
  return countryCodes;
};

export const isValidEmail = (email: string) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

export const getFullName = (nameObj: {
  firstName: string;
  lastName: string;
}) => {
  return nameObj?.firstName + " " + nameObj?.lastName;
};

export const capitalizeFirstLetter = (word: any) => {
  const wordArr = word?.split("");
  const firstLetter = wordArr?.shift();
  // Restore the complete word
  wordArr?.unshift(firstLetter?.toUpperCase());

  return wordArr?.join("");
};

export const validatePayload = (payload: string) => {
  // Retrieve all the values coming from the request
  const values = Object.values(payload);
  const valuesString = values.join(" ");
  const pattern =
    /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;

  // check if any of the values has a link embeded
  if (valuesString.match(pattern)) {
    return false;
  } else {
    return true;
  }
};

export const isAnyAggregatorVerified = (aggregators: any) => {
  // Check if at least one of the selected aggregator is verified
  if (!aggregators || aggregators?.length < 1) return false;
  return aggregators.some((aggregator: any) => aggregator.isVerified === true);
};

export const getProcessedClientDetails = (clientDetails: any) => {
  /**
   * Format the data to be written into google sheet
   */
  const clientDetailsKeys = Object.keys(clientDetails);
  const clientDetailsValues = Object.values(clientDetails);

  const processedClientDetails: any = {};
  for (const key of clientDetailsKeys) {
    const value: any = clientDetailsValues.shift();
    if (Array.isArray(value)) {
      processedClientDetails[key] = value.join(",");
    } else {
      // Check and convert date to readable format
      if (key === "createdAt" || key === "updatedAt")
        processedClientDetails[key] = moment(value).format("DD/MM/YYY");
      else processedClientDetails[key] = value;
    }
  }

  return processedClientDetails;
};

export const generatePassword = (length: number) => {
  // Mix of alphanumerics with special character
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+abcdefghijklmnopqrstuvwxyz0123456789";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    password += characters.charAt(randomIndex);
  }

  return password;
};

/* To be used with seeder ONLY */
export const generateUniqueID = (serialNo: any) => {
  /**
   * TODO:: Generate Unique ID for each and every clients on the app
   * - Current Date + Serial Number
   * - Format: YYYYMMDDXXX e.g 20231125001
   */

  // serialNo += 1;
  const dateFormat = moment().format("YYYYMMDD");
  const nextNumberArr = Array.from(serialNo.toString());
  if (nextNumberArr.length < 2) {
    nextNumberArr.unshift("0");
    nextNumberArr.unshift("0");
    serialNo = nextNumberArr.join("");
  } else if (nextNumberArr.length < 3) {
    nextNumberArr.unshift("0");
    serialNo = nextNumberArr.join("");
  } else {
    serialNo.toString();
  }

  const uniqueId = dateFormat + serialNo;

  return uniqueId;
};

export const toRegEx = (val: any) => {
  return new RegExp(val);
};

export const getDayNumber = (day: any) => {
  const { day: dow } = day;
  const daysOfWeek = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return daysOfWeek.indexOf(dow.toLowerCase());
};

export const changeDateFormat = (
  date: Date | undefined,
  timeFormat: string,
) => {
  if (date) {
    return moment(date).format(timeFormat);
  }
};

export const payloadObjToArray = (arr: any, userId: string) => {
  const data = [];
  for (const upload of arr) {
    const key = Object.keys(upload)[0];
    const doc = {
      userId,
      type: key,
      document: upload[key],
    };
    data.push(doc);
  }

  return data;
};

export const classNames = (...classes: string[]): string => {
  return classes.filter(Boolean).join(" ");
};

export function camelCaseToSentenceCase(str: string) {
  if (!str.includes("_")) {
    return str
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/^./, function (match) {
        return match.toUpperCase();
      });
  } else {
    return str.replace(/_/g, " ");
  }
}

export const getRedirectPathBasedonUserRole = (userRole: UserRoles): string => {
  switch (userRole) {
    case UserRoles.ADMIN:
      return "/admin/dashboard";
    case UserRoles.PARTNER:
      return "/partner-dashboard/home";
    case UserRoles.SALES:
      return "/sales-dashboard/home";
    case UserRoles.COACH:
      return "/coach/dashboard";
    case UserRoles.CSE:
      return "/cse-dashboard";
    default:
      return "/dashboard";
  }
};

export const currencyFormatterFunc = ({
  to = "AUD",
  amount,
}: {
  to: string;
  amount: number;
}) => {
  return currencyFormatter.format(amount, { code: to, locale: "en-US" });
};

export const isAdmin = (role: UserRoles): boolean => {
  return role === UserRoles.ADMIN;
};

export const isProd = (host: string) => {
  return [
    "https://www.cvtocareer.com",
    "www.cvtocareer.com",
    "cvtocareer.com",
    "https://cvtocareer.com",
  ].includes(host);
};

export function toTitleCase(str: string) {
  if (!str) return str;
  if (str.includes("CVtoCAREER")) return str;

  const phraseExceptions = ["AI Selection Criteria", "CV/Resume Development"];

  if (phraseExceptions.some((phrase) => str.includes(phrase))) {
    return str;
  }

  return str.replace(
    /\w\S*/g,
    (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase(),
  );
}

export function generatePartnerCode(length = 5) {
  const letters =
    "ABCDE-FGH*IJKLMNOPQR@STUVWXYZa-bc$defghijklm%nopq*rstu!vwxyz";
  let result = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * letters.length);
    result += letters[randomIndex];
  }
  return result;
}