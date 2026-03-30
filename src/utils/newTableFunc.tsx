/* eslint-disable @typescript-eslint/ban-ts-comment */
import moment from "moment";
import { Switch } from "antd";
import Link from "next/link";
import { Chip } from "@material-tailwind/react";
import { useGridApiContext } from "@mui/x-data-grid-pro";
import { isArray } from "lodash";
import { UpdateSelect } from "@/components/AdminUsersComponent/filter-select";
import { toast } from "react-hot-toast";
import axios from "axios";
import { Menu, MenuHandler, MenuList } from "@material-tailwind/react";
import { FiMoreVertical } from "react-icons/fi";
import {
  Autocomplete,
  MenuItem,
  Select,
  TextField,
  Checkbox,
  ListItemText,
} from "@mui/material";
import Icon from "../../public/icons";
import { styled } from "@mui/material/styles";
import {
  AwaitedReactNode,
  JSXElementConstructor,
  Key,
  ReactElement,
  ReactNode,
  ReactPortal,
  useEffect,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { UrlObject } from "url";
import { TableInformationEnum, ClientTableInformationEnum, AppQuePageEnum, PreProgress } from "@/types/enum";

const order = [
  "CustomerId",
  "generatePassword",
  "actions",
  "flight",
  "id",
  "Full_Name",
  "First_Name",
  "Last_Name",
];

export function arraysToObject(keys: string | any[], values: string | any[]) {
  if (keys.length !== values.length) {
    return;
    // throw new Error('Arrays must have the same length');
  }

  const newArr = [];
  for (let i = 0; i < keys.length; i++) {
    const value = keys[i];
    const label = values[i];

    const obj = { label, value };
    newArr.push(obj);
  }

  return newArr;
}

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

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map(function (word: string) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export const getCountries = async () => {
  const response = await fetch("/api/newCountryInfo?type=countries");
  const data = await response.json();

  const formattedData = data && data.data.map((item: any) => item.value);

  return formattedData || [];
};
export const getAdvertisers = async () => {
  const response = await fetch("/api/advertisers?");
  const data = await response.json();
  const formattedData = data && data.data;

  return formattedData || [];
};

export const getStatesAndCities = async (country: string) => {
  const response = await fetch(
    `/api/newCountryInfo?type=region&country=${country}`
  );
  const data = await response.json();

  const formattedData = data && data.data.map((item: any) => item.value);

  return formattedData || [];
};

const FullWidthAutocomplete = styled(Autocomplete)({
  width: "100%",
  height: "100%",
  "& .MuiInputBase-root": {
    height: "100%",
  },
  "& .MuiInputBase-input": {
    height: "100%",
    padding: "0 14px",
    display: "flex",
    alignItems: "center",
  },
});

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
  const countryList = getCountries();

  const CountrySelector = ({ params, field }: { params: any; field: any }) => {
    const [options, setOptions] = useState<any>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const fetchCountries = async () => {
        try {
          const resolvedCountryList = await countryList;
          const countryOptions = Array.isArray(resolvedCountryList)
            ? resolvedCountryList
            : [];

          if (countryOptions.length === 0) {
            // console.warn("Resolved countryList is empty or not an array.");
          }

          setOptions(countryOptions);
        } catch {
          // console.error("Error resolving countryList:", error);
          setOptions([]);
        } finally {
          setLoading(false);
        }
      };

      fetchCountries();
    }, []);

    const handleChange = (event: any, newValue: any) => {
      params.api.setEditCellValue({ id: params.id, field, value: newValue });
    };

    return (
      <FullWidthAutocomplete
        options={options}
        loading={loading}
        value={params.value}
        onChange={handleChange}
        renderInput={(params) => <TextField {...params} variant="outlined" />}
        disabled={loading}
      />
    );
  };

  const updateAggregator = async (aggregatorName: any) => {
    if (aggregatorName) {
      toast.success("Notification sent to admin");
      try {
        await fetch(`/api/aggregator`, {
          method: "PUT",
          body: JSON.stringify({
            profileCreated: true,
            name: aggregatorName,
          }),
          headers: {
            "Content-Type": "application/json",
          },
        });
      } catch (error: any) {
        // console.log(error);
        toast.error(error);
      }
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const newArr = arr.map((el: { field: unknown }, index: any) => {
    switch (table) {
      case "user-table":
        switch (el.field) {
          case "profile":
            return {
              ...el,
              // editable: true,
              renderCell: (params: { value: { isActive: any } }) => {
                const value =
                  (params?.value && params?.value?.isActive && "true") ||
                  (params?.value && !params?.value?.isActive && "false") ||
                  "N/A";
                return <p className="capitalize">{value}</p>;
              },
            };
          case "email":
            return {
              ...el,
              renderCell: (params: {
                value:
                  | string
                  | number
                  | bigint
                  | boolean
                  | ReactElement<any, string | JSXElementConstructor<any>>
                  | Iterable<ReactNode>
                  | ReactPortal
                  | Promise<AwaitedReactNode>
                  | null
                  | undefined;
              }) => {
                let isSeen: boolean = false;
                if (actions?.emailTrackingMap?.has(params?.value)) {
                  isSeen = actions?.emailTrackingMap?.get(params?.value).isSeen;
                }
                return (
                  <div
                    className={`py-1.5 px-4 flex h-[90%]  items-center justify-center  ${
                      isSeen &&
                      "bg-cyan-300 rounded-lg text-white hover:shadow-lg transition-all"
                    }`}
                  >
                    {params?.value}
                  </div>
                );
              },
            };
          case "phoneNumber":
            return {
              ...el,
              renderCell: (params: {
                value:
                  | string
                  | number
                  | bigint
                  | boolean
                  | ReactElement<any, string | JSXElementConstructor<any>>
                  | Iterable<ReactNode>
                  | ReactPortal
                  | Promise<AwaitedReactNode>
                  | null
                  | undefined;
              }) => {
                let isSeen: boolean = false; // Initialize with a default value

                if (actions?.phoneTrackingMap?.has(params?.value)) {
                  // It's also good practice to handle the potential undefined from .get()
                  // although .has() usually implies .get() will return something if it returns true.
                  // Still, defensive programming is key with optional chaining.
                  const trackingData = actions?.phoneTrackingMap?.get(
                    params?.value
                  );
                  if (trackingData) {
                    // Ensure trackingData is not undefined
                    isSeen = trackingData.isSeen;
                  }
                }

                return (
                  <div
                    className={`py-1.5 px-4 flex h-[90%]  items-center justify-center  ${
                      isSeen &&
                      "bg-cyan-300 rounded-lg text-white hover:shadow-lg transition-all"
                    }`}
                  >
                    {params?.value}
                  </div>
                );
              },
            };
          case "fullName":
            return {
              ...el,
              renderCell: (params: {
                row: {
                  firstName: any;
                  middleName: any;
                  lastName: any;
                  role: string | number;
                  _id: any;
                };
              }) => {
                const value = `${params?.row.firstName} ${params?.row?.middleName} ${params?.row.lastName}`;
                return (
                  <a
                    // href={`/admin-dashboard/users/${params?.row._id}`}
                    href={`/admin-dashboard/${roleMap[params?.row.role]?.urlKey || "users"}/${
                      params?.row._id
                    }`}
                    className=" text-career-blue-800 hover:text-career-blue-500 text-sm transition-all"
                  >
                    {value}
                  </a>
                );
              },
            };

          case "Referrer Name":
            return {
              ...el,
              // editable: true,
              renderCell: (params: { row: { referrerName: any } }) => {
                const value: string = `${params?.row.referrerName}`;
                return { value };
              },
            };

          case "Referrer Role":
            return {
              ...el,
              // editable: true,
              renderCell: (params: { row: { referrerRole: any } }) => {
                const value: string = `${params?.row.referrerRole}`;
                return { value };
              },
            };

          // case 'referrer':
          //   return {
          //     ...el,
          //     editable: true,
          //     renderCell: (params) => {
          //       return <p>N/A</p>;
          //     },
          //   };

          case "role":
            return {
              ...el,
              // editable: true,
              type: "singleSelect",
              headerName: "Persona",
              // valueOptions: ['client', 'guest', 'coach', 'sales', 'partner', 'admin', customer],
              valueOptions: Object.entries(roleMap).map(([key, data]) => ({
                value: key,
                label: data.label,
              })),

              renderCell: (params: { value: any }) => {
                const value = params?.value ? params?.value : "N/A";
                return (
                  <p className="capitalize">
                    {roleMap[value]?.label || value}
                  </p>
                );
              },
            };

          case "accessLevel":
            return {
              ...el,
              type: "singleSelect",
              valueOptions: [
                {
                  label: "User",
                  value: "user",
                },
                {
                  label: "Contributor",
                  value: "contributor",
                },
                {
                  label: "Administrator",
                  value: "administrator",
                },
                {
                  label: "Manager",
                  value: "manager",
                },
                {
                  label: "Moderator",
                  value: "moderator",
                },
                {
                  label: "Read-Only",
                  value: "read-only",
                },
              ],
            };

          // case 'accessLevels':
          //   return {
          //     ...el,
          //     renderCell: (params)=>{
          //       console.log('access level value:', params.value, {el})
          //       return <p>Access Levels Column present</p>
          //     }
          //   }

          case "customerClass":
            return {
              ...el,
              renderCell: (params: {
                value:
                  | string
                  | number
                  | bigint
                  | boolean
                  | ReactElement<any, string | JSXElementConstructor<any>>
                  | Iterable<ReactNode>
                  | ReactPortal
                  | Promise<AwaitedReactNode>
                  | null
                  | undefined;
              }) => {
                return <p>{params?.value ? params?.value : "N/A"}</p>;
              },
             
            };
          case "createdAt":
          case "updatedAt":
            return {
              ...el,
              renderCell: (params: { value: moment.MomentInput }) => {
                return (
                  <p>{moment(params?.value).format("DD-MM-YYYY, HH:MM:SS")}</p>
                );
              },
            };
          case "hasResume":
            return {
              ...el,
              editable: false,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };
          case "plan":
            return {
              ...el,
              // editable: true,
              renderCell: (params: {
                value:
                  | string
                  | number
                  | bigint
                  | boolean
                  | ReactElement<any, string | JSXElementConstructor<any>>
                  | Iterable<ReactNode>
                  | ReactPortal
                  | Promise<AwaitedReactNode>
                  | null
                  | undefined;
              }) => {
                return <p>{params?.value ? params?.value : "N/A"}</p>;
              },
            };
          case "slackId":
            return {
              ...el,
              // editable: true,
              renderCell: (params: {
                value:
                  | string
                  | number
                  | bigint
                  | boolean
                  | ReactElement<any, string | JSXElementConstructor<any>>
                  | Iterable<ReactNode>
                  | ReactPortal
                  | Promise<AwaitedReactNode>
                  | null
                  | undefined;
              }) => {
                return <p>{params?.value ? params?.value : "N/A"}</p>;
              },
            };

          case "hasCoverLetter":
            return {
              ...el,
              editable: false,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };
          case "heritage":
          case "Heritage":
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
                  ? params?.value
                      ?.split("||")[0]
                      .replace(/</g, "")
                      .replace(/>/g, "")
                  : params?.split("||")[0].replace(/</g, "").replace(/>/g, "");
                return value?.trim();
              },
            };

          case "communication":
          case "Communication":
            return {
              ...el,
              type: "singleSelect",
              valueOptions: [
                {
                  label: "Yes",
                  value: "Yes",
                },
                {
                  label: "No",
                  value: "No",
                },
              ],
            };

          case "socials":
            const CustomSocialsEditComp = (props: {
              id: any;
              value?: any[] | undefined;
              field: any;
            }) => {
              const { id, value = [], field } = props;
              const apiRef = useGridApiContext();

              const socialOptions = [
                { label: "F", value: "F" },
                { label: "X", value: "X" },
                { label: "I", value: "I" },
                { label: "L", value: "L" },
              ];

              const persistValue = (
                id: string | number,
                selectedOptions: any
              ) => {
                const existingData =
                  JSON.parse(localStorage.getItem("socialsData") || "") || {};
                existingData[id] = selectedOptions;
                localStorage.setItem(
                  "socialsData",
                  JSON.stringify(existingData)
                );
              };

              const handleChange = (event: { target: any }) => {
                const selectedValues = event.target.value;

                apiRef.current.setEditCellValue({
                  id,
                  field,
                  value: selectedValues,
                });

                persistValue(id, selectedValues);
              };

              const handleCheckboxChange = (optionValue: string) => {
                let newValue: any;

                if (value.includes(optionValue)) {
                  newValue = value.filter((val: string) => val !== optionValue);
                } else {
                  newValue = [...value, optionValue];
                }

                handleChange({ target: { value: newValue } });
              };

              return (
                <Select
                  multiple
                  value={value}
                  onChange={handleChange}
                  renderValue={(selected) => selected.join(", ")}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  {socialOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Checkbox
                        checked={value.indexOf(option.value) > -1}
                        onChange={() => handleCheckboxChange(option.value)}
                      />
                      <ListItemText primary={option.label} />
                    </MenuItem>
                  ))}
                </Select>
              );
            };

            return {
              ...el,
              renderEditCell: (params: { id: string | number; value: any }) => {
                const savedData =
                  JSON.parse(localStorage.getItem("socialsData") || "") || {};
                const value = savedData[params.id] || params.value || [];

                return (
                  <CustomSocialsEditComp field {...params} value={value} />
                );
              },
              renderCell: (params: {
                id: string | number;
                value: any;
                row: { socials: any };
              }) => {
                const savedData =
                  JSON.parse(localStorage.getItem("socialsData") || "") || {};
                const value = savedData[params.id] || params.value || [];
                const socials = params?.row.socials || value;

                return <p>{socials.length > 0 ? socials.join(", ") : "N/A"}</p>;
              },
            };

          case "invoiceData.zohoInvoices":
            return {
              ...el,
              renderCell: (params: { value: string | any[] }) => {
                return (
                  <p>
                    {params?.value?.length > 0
                      ? params?.value[0].hasPaid
                        ? "Paid"
                        : "N/A"
                      : "N/A"}
                  </p>
                );
              },
            };
          case "invoiceData":
            return {
              ...el,
              renderCell: (params: {
                value: { zohoInvoices: string | any[] };
              }) => {
                return (
                  <Link
                    className={`w-[120px] text-${
                      params?.value?.zohoInvoices?.length > 0 ? "blue" : "black"
                    } ${params?.value?.zohoInvoices?.length > 0 ? "" : "cursor-not-allowed"}`}
                    href={
                      params?.value?.zohoInvoices?.length > 0
                        ? params?.value?.zohoInvoices[0].invoiceUrl
                        : "#"
                    }
                  >
                    {params?.value?.zohoInvoices?.length > 0
                      ? params?.value?.zohoInvoices[0].invoiceUrl
                      : "N/A"}
                  </Link>
                );
              },
            };
          case "Alias_Email":
          case "Alias_Password":
            return {
              ...el,
              renderCell: (params: { value: any }) => {
                return <p>{params.value ?? ""}</p>;
              },
            };
          case "planData":
            return {
              ...el,
              renderCell: (params: {
                value: {
                  validityPeriod:
                    | string
                    | number
                    | bigint
                    | boolean
                    | ReactElement<any, string | JSXElementConstructor<any>>
                    | Iterable<ReactNode>
                    | ReactPortal
                    | Promise<AwaitedReactNode>
                    | null
                    | undefined;
                };
              }) => {
                return (
                  <p>
                    {params?.value
                      ? params?.value?.validityPeriod
                        ? params?.value?.validityPeriod
                        : "N/A"
                      : "N/A"}
                  </p>
                );
              },
            };
          case "planData.createdAt":
            return {
              ...el,
              renderCell: (params: {
                row: { planData: { createdAt: moment.MomentInput } };
              }) => {
                return (
                  <p className="w-[150px]">
                    {params?.row?.planData?.createdAt
                      ? moment(params?.row.planData.createdAt).format(
                          "DD/MM/YY, hh:mm:ss A"
                        )
                      : "N/A"}
                  </p>
                );
              },
            };
          case "planData.expiresAt":
            return {
              ...el,
              renderCell: (params: {
                row: { planData: { expiresAt: moment.MomentInput } };
              }) => {
                return (
                  <p className="w-[150px]">
                    {params?.row?.planData?.expiresAt
                      ? moment(params?.row.planData.expiresAt).format(
                          "DD/MM/YY, hh:mm:ss A"
                        )
                      : "N/A"}
                  </p>
                );
              },
            };
          case "planData.hasExpired":
            return {
              ...el,
              renderCell: (params: {
                row: { planData: { hasExpired: any } };
              }) => {
                return (
                  <p className="w-[150px]">
                    {params?.row?.planData
                      ? params?.row?.planData?.hasExpired
                        ? "True"
                        : "False"
                      : "N/A"}
                  </p>
                );
              },
            };
          case "planSelectedAt":
            // console.log("Found plan selected.....", el);
            return {
              ...el,
            };
          case "progress":
            return {
              ...el,
              renderCell: (params: {
                value: string;
                row: { progress: any };
              }) => {
                return (
                  <UpdateSelect
                    placeholder="N/A"
                    options={[
                      {
                        label: PreProgress.SIGNEDUP,
                        value: PreProgress.SIGNEDUP,
                      },
                      {
                        label: PreProgress.PREFERENCEINSERTED,
                        value: PreProgress.PREFERENCEINSERTED,
                      },
                      {
                        label: PreProgress.UPLOADEDDOC,
                        value: PreProgress.UPLOADEDDOC,
                      },

                      {
                        label: "Email Verified",
                        value: "Email Verified",
                      },
                      {
                        label: "Documents Accepted",
                        value: "Documents Accepted",
                      },
                      {
                        label: "Documents Declined",
                        value: "Documents Declined",
                      },
                      {
                        label: "CV/Resume Uplifted",
                        value: "CV/Resume Uplifted",
                      },
                      {
                        label: "Service Selected",
                        value: "Plan Selected",
                      },
                      {
                        label: "Payment Confirmed",
                        value: "Payment Confirmed",
                      },
                      {
                        label: "Login Credentials Verified",
                        value: "Login Credentials Verified",
                      },
                      {
                        label: "Sample Results Dispatched",
                        value: "Sample Results Dispatched",
                      },
                      {
                        label: "Sample Results Accepted",
                        value: "Sample Results Accepted",
                      },
                      {
                        label: "Preparatory Session Accepted",
                        value: "Preparatory Session Accepted",
                      },
                      {
                        label: "Preparatory Session Declined",
                        value: "Preparatory Session Declined",
                      },
                      {
                        label: "Application Commenced",
                        value: "Application Commenced",
                      },
                      {
                        label: "Application Hold",
                        value: "Application Hold",
                      },
                      {
                        label: "Application Expired",
                        value: "Application Expired",
                      },
                      {
                        label: "Offer Notification Received",
                        value: "Offer Notification Received",
                      },
                      {
                        label: "Campaign Ended",
                        value: "Campaign Ended",
                      },
                    ]}
                    value={params?.value}
                    onValueChange={(value) => {
                      actions.handleUserProgress(
                        value,
                        params?.row?.progress,
                        params?.row
                      );
                    }}
                  />
                );
              },
            };

          case "action":
            return {
              ...el,
              renderCell: (params: {
                row: {
                  role: any;
                  isDocumentUploaded: any;
                  firstName: any;
                  lastName?: any;
                  isUserSubscribed?: any;
                  _id: any;
                };
              }) => {
                return (
                  <Menu placement="bottom-end">
                    <MenuHandler>
                      <button>
                        <FiMoreVertical />
                      </button>
                    </MenuHandler>
                    <MenuList
                      placeholder=""
                      onPointerEnterCapture={() => {}}
                      onPointerLeaveCapture={() => {}}
                      onResize={() => {}} // Add this prop
                      onResizeCapture={() => {}} // Add this prop
                    >
                      {["client", "guest"].includes(params?.row.role) &&
                        params?.row.isDocumentUploaded && (
                          <MenuItem
                            onClick={() => {
                              axios
                                .get(
                                  `/api/admin/userdrivefolder?firstname=${params?.row.firstName}&lastname=${params?.row.lastName}&isusersubscribed=${params?.row.isUserSubscribed}`
                                )
                                .then((res) => {
                                  window.open(res.data.data.driveUrl, "_blank");
                                })
                                .catch((err) => {
                                  toast.error(
                                    err.response?.data?.message ||
                                      "Failed to open drive"
                                  );
                                });
                            }}
                          >
                            Go to {params?.row.firstName}'s documents
                          </MenuItem>
                        )}
                      <MenuItem
                        onClick={() => {
                          handleAccountApproval(
                            params?.row,
                            actions.setActionUser,
                            actions.setIsAccountApprovalModalOpen,
                            actions.approveMutation,
                            mutate
                          );
                        }}
                      >
                        Accept Document
                      </MenuItem>
                      <MenuItem
                        className="text-red-500"
                        onClick={() => {
                          if (params?.row.isDocumentUploaded) {
                            actions.approveMutation
                              .trigger({
                                isDocumentApproved: false,
                                uid: params?.row._id,
                              })
                              .then(() => mutate());
                          } else {
                            toast(
                              `Resume not uploaded by ${params?.row.firstName} yet`
                            );
                          }
                        }}
                      >
                        Reject Documents
                      </MenuItem>

                      <MenuItem
                        onClick={() => {
                          actions.setIsDisplayMenuOpen(params?.row._id);
                        }}
                      >
                        Dispatch Sample Results
                      </MenuItem>
                      <Link
                        href={`/admin-dashboard/${roleMap[params?.row.role]?.urlKey || "users"}/${
                          params?.row._id
                        }`}
                      >
                        <MenuItem>
                          View {params?.row.firstName}'s Profile
                        </MenuItem>
                      </Link>
                    </MenuList>
                  </Menu>
                );
              },
            };
          case "isActive":
            const CustomEditComp = (props: {
              id: any;
              value: any;
              field: any;
            }) => {
              const { id, value, field } = props;
              const apiRef = useGridApiContext();
              const handleChange = (event: any) => {
                apiRef.current.setEditCellValue({
                  id,
                  field,
                  value: event,
                });
              };

              return (
                <Switch
                  onChange={handleChange}
                  checked={value}
                  className={`${value ? "!bg-green-500" : "!bg-red-500"} `}
                />
              );
            };
            return {
              ...el,
              renderEditCell: (params: any) => <CustomEditComp {...params} />,
              type: "singleSelect",
              valueOptions: [true, false],
              renderCell: (params: {
                row: { planData: { hasExpired: any } };
              }) => {
                let active = false;
                if (params?.row?.planData) {
                  active = !params?.row?.planData?.hasExpired;
                }

                // return <p>{params?.row?.profile?.isActive ? 'True' : 'False'}</p>;
                return <p>{active ? "True" : "False"}</p>;
              },
            };
          case "isUserSubscribed":
            return {
              ...el,
              type: "singleSelect",
              valueOptions: [true, false],
              renderCell: (params: { value: any }) => {
                return <p>{params?.value ? "True" : "False"}</p>;
              },
            };
          case "isDocumentApproved":
            return {
              ...el,
              type: "singleSelect",
              valueOptions: [true, false],
              renderCell: (params: { value: any }) => {
                return <p>{params?.value ? "True" : "False"}</p>;
              },
            };
          case "isDocumentUploaded":
            return {
              ...el,
              type: "singleSelect",
              valueOptions: [true, false],
              renderCell: (params: { value: any }) => {
                return <p>{params?.value ? "True" : "False"}</p>;
              },
            };
          case "inflight":
            return {
              ...el,
              type: "singleSelect",
              valueOptions: [true, false],
              renderCell: (params: { value: any }) => {
                return <p>{params?.value ? "True" : "False"}</p>;
              },
            };
          // case 'country':
          //   return {
          //     ...el,
          //     type: 'singleSelect',
          //     valueOptions: countryList,
          //   };

          case "returnCount":
            return {
              ...el,
              headerName: "Return Count",
            };
          default:
            break;
        }

      case "aggregator":
        switch (el.field) {
          case "jobsite":
            return {
              ...el,
              renderCell: (params: {
                row: {
                  aggregator: {
                    name:
                      | string
                      | number
                      | bigint
                      | boolean
                      | ReactElement<any, string | JSXElementConstructor<any>>
                      | Iterable<ReactNode>
                      | ReactPortal
                      | Promise<AwaitedReactNode>
                      | null
                      | undefined;
                  };
                };
              }) => {
                return (
                  <p className="w-[150px]">{params?.row?.aggregator?.name}</p>
                );
              },
            };
          case "password":
            return {
              ...el,
              renderCell: (params: { value: string | any[] }) => {
                return (
                  <p className="w-[150px]">
                    {/* @ts-ignore */}
                    {Array.from(
                      { length: params?.value?.length },
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      (_, i) => "*"
                    )}
                  </p>
                );
              },
            };
          case "isVerified":
            return {
              ...el,
              renderCell: (params: { value: any }) => {
                return (
                  <p className="w-[150px]">
                    {params?.value ? "Validated" : "Not Validated"}
                  </p>
                );
              },
            };

          case "validate on":
            return {
              ...el,
              renderCell: (params: {
                row: { aggregator: { updatedAt: moment.MomentInput } };
              }) => {
                return (
                  <p className="w-[150px]">
                    {moment(params?.row.aggregator.updatedAt).format(
                      "DD/MM/YY"
                    )}
                  </p>
                );
              },
            };

          case "No of Jobs Samples":
            return {
              ...el,
              renderCell: () => {
                return <p>4</p>;
              },
            };

          case "Last job updated":
            return {
              ...el,
              renderCell: (params: {
                row: {
                  aggregator: {
                    createdAt:
                      | string
                      | number
                      | bigint
                      | boolean
                      | ReactElement<any, string | JSXElementConstructor<any>>
                      | Iterable<ReactNode>
                      | ReactPortal
                      | Promise<AwaitedReactNode>
                      | null
                      | undefined;
                  };
                };
              }) => {
                return <p>{params?.row.aggregator.createdAt}</p>;
              },
            };
          default:
            break;
        }

      case "cpan":
        switch (el.field) {
          case "client_sheet":
            return {
              ...el,
              renderCell: (params: { row: { credentialId: any } }) => {
                return (
                  <a
                    className="text-blue-400"
                    href={`/admin-dashboard/master-sheet/client/${params?.row.credentialId}?table=sample+Results`}
                  >
                    View result
                  </a>
                );
              },
            };

          case "role":
            return {
              ...el,
              renderCell: (params: { row: { role: any } }) => {
                const val = params?.row?.role && toTitleCase(params?.row?.role);
                return <p>{val}</p>;
              },
            };

          case "isUserSubscribed":
            return {
              ...el,
              headerName: "Subscription Status",
              renderCell: (params: { row: { isUserSubscribed: boolean } }) => {
                if (params?.row?.isUserSubscribed) {
                  // return <p>True</p>;
                  return <p>Active</p>;
                } else if (params?.row?.isUserSubscribed === false) {
                  // return <p>False</p>;
                  return <p>Inactive</p>;
                } else {
                  return <p>Inactive</p>;
                }
              },
            };

          case "Approve Referral":
            return {
              ...el,
              width: 600,
              renderCell: (params: {
                row: {
                  referrer: { status: string; referrer: any };
                  _id: any;
                  status: string;
                };
              }) => {
                return (
                  <>
                    {params?.row?.referrer?.status && (
                      <Menu placement="bottom-end">
                        <MenuHandler>
                          <button>
                            <FiMoreVertical />
                          </button>
                        </MenuHandler>
                        <MenuList
                          placeholder=""
                          onPointerEnterCapture={() => {}}
                          onPointerLeaveCapture={() => {}}
                          onResize={() => {}} // Add this prop
                          onResizeCapture={() => {}} // Add this prop
                        >
                          <MenuItem
                            onClick={() =>
                              actions.handleUpdateReferral({
                                email: params?.row.referrer.referrer,
                                id: params?.row._id,
                                status: "REJECTED",
                                variance: actions.variance,
                              })
                            }
                            disabled={
                              params?.row.referrer.status === "REJECTED"
                            }
                          >
                            Decline Referral
                          </MenuItem>
                          <MenuItem
                            onClick={() =>
                              actions.handleUpdateReferral({
                                email: params?.row.referrer.referrer,
                                id: params?.row._id,
                                status: "APPROVED",
                                variance: actions.variance,
                              })
                            }
                            disabled={
                              params?.row.referrer.status === "APPROVED"
                            }
                          >
                            Approve Referral
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    )}
                    {params?.row?.status && (
                      <Menu placement="bottom-end">
                        <MenuHandler>
                          <button>
                            <FiMoreVertical />
                          </button>
                        </MenuHandler>
                        <MenuList
                          placeholder=""
                          onPointerEnterCapture={() => {}}
                          onPointerLeaveCapture={() => {}}
                          onResize={() => {}} // Add this prop
                          onResizeCapture={() => {}} // Add this prop
                        >
                          <MenuItem
                            onClick={() =>
                              actions.handleUpdateReferral({
                                email: params?.row.referrer,
                                id: params?.row._id,
                                status: "REJECTED",
                                variance: actions.variance,
                              })
                            }
                            disabled={params?.row.status === "REJECTED"}
                          >
                            Decline Referral
                          </MenuItem>
                          <MenuItem
                            onClick={() =>
                              actions.handleUpdateReferral({
                                email: params?.row.referrer,
                                id: params?.row._id,
                                status: "APPROVED",
                                variance: actions.variance,
                              })
                            }
                          >
                            Approve Referral
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    )}
                  </>
                );
              },
            };

          case "referrer":
            return {
              ...el,
              valueGetter: (params: {
                value: { referrer: any };
                referrer: any;
              }) => {
                return params?.value?.referrer ?? params?.referrer;
              },
            };
          case "document":
            return {
              ...el,

              renderCell: (params: {
                value: {
                  filename:
                    | string
                    | number
                    | bigint
                    | boolean
                    | ReactElement<any, string | JSXElementConstructor<any>>
                    | Iterable<ReactNode>
                    | ReactPortal
                    | Promise<AwaitedReactNode>
                    | null
                    | undefined;
                };
              }) => {
                return <p>{params?.value?.filename}</p>;
              },
            };

          case "createdAt":
          case "updatedAt":
            return {
              ...el,
              valueGetter: (params: moment.MomentInput) => {
                return moment(params).format("DD-MM-YYYY, HH:MM:SS");
              },
            };

          case "action":
            return {
              ...el,

              renderCell: (params: {
                row: { document: { fileUrl: string | undefined } };
              }) => {
                // console.log(params?.row?.document?.fileUrl);
                return (
                  <a
                    target="_blank"
                    download="resume"
                    className=" capitalize text-blue-400 hover:text-cyan-500"
                    href={params?.row?.document?.fileUrl}
                  >
                    download file
                  </a>
                );
              },
            };

          // case 'payment status':
          //   return {
          //     ...el,
          //     renderCell: (params) => {
          //       return (
          //         <p
          //           className={params?.row.isUserSubscribed ? 'text-green-900' : 'text-yellow-900'}
          //         >
          //           {params?.row.isUserSubscribed ? 'Paid' : 'Unpaid'}
          //         </p>
          //       );
          //     },
          //   };
          case "accepted status":
            return {
              ...el,
              renderCell: (params: { row: { isUserSubscribed: any } }) => {
                return (
                  <p
                    className={
                      params?.row.isUserSubscribed
                        ? "text-green-900"
                        : "text-yellow-900"
                    }
                  >
                    false
                  </p>
                );
              },
            };

          case "jobsite":
            return {
              ...el,
              renderCell: (params: {
                row: {
                  aggregator: {
                    name:
                      | string
                      | number
                      | bigint
                      | boolean
                      | ReactElement<any, string | JSXElementConstructor<any>>
                      | Iterable<ReactNode>
                      | ReactPortal
                      | Promise<AwaitedReactNode>
                      | null
                      | undefined;
                  };
                };
              }) => {
                return <p>{params?.row?.aggregator?.name}</p>;
              },
            };

          case "validate on":
            return {
              ...el,
              valueGetter: (params: {
                row: { aggregator: { updatedAt: any } };
              }) => {
                return params?.row.aggregator.updatedAt;
              },
            };

          case "actionagg":
            return {
              ...el,
              renderCell: (params: {
                row: {
                  isVerified: string;
                  aggregator: { name: string };
                  username: any;
                  generatedEmail: any;
                };
              }) => {
                return (
                  <Button
                    className="h-[2.75rem] w-fit rounded-[0.25rem]"
                    onClick={async () => {
                      if (params?.row?.isVerified === "true") {
                        await updateAggregator(params?.row?.aggregator?.name);
                        return;
                      }
                      if (
                        params?.row?.aggregator?.name === "WorkforceAustralia"
                      ) {
                        actions.setWorkforceAustraliaQA(true);
                        actions.setCurrentAggregator(params?.row);
                        return;
                      }
                      actions.setCurrentAggregator(params?.row);
                      actions.setShowUpdateAggModal(true);
                    }}
                    disabled={
                      params?.row?.isVerified === "true"
                        ? false
                        : params?.row?.username && params?.row?.generatedEmail
                          ? true
                          : false
                    }
                    size="sm"
                    type="button"
                    variant="default"
                  >
                    {params?.row.aggregator.name.toLowerCase() === "linkedin"
                      ? "Verify Jobsite"
                      : params?.row?.generatedEmail && !params?.row?.username
                        ? "Update Notification Email"
                        : params?.row?.isVerified === "true"
                          ? "Confirm Profile Creation"
                          : "Request Profile Creation"}
                  </Button>
                );
              },
            };

          case "No of Jobs Samples":
            return {
              ...el,
              valueGetter: () => {
                return 4;
              },
            };

          case "Last job updated":
            return {
              ...el,
              renderCell: (params: {
                row: { aggregator: { createdAt: moment.MomentInput } };
              }) => {
                return (
                  <p>
                    {moment(params?.row.aggregator.createdAt).format(
                      "DD-MM-YYYY HH:mm:ss"
                    )}
                  </p>
                );
              },
            };

          case "see details":
            return {
              ...el,
              renderCell: (params: {
                row: {
                  aggregator: { picture: { fileUrl: string | UrlObject } };
                };
              }) => {
                return (
                  <Link
                    className="text-career-blue-300 hover:text-cyan-500"
                    href={params?.row.aggregator.picture.fileUrl}
                  >
                    see details
                  </Link>
                );
              },
            };

          case "document":
            return {
              ...el,
              headerName: "File Name",
              valueGetter: (params: { filename: any }) => {
                return params?.filename;
              },
            };

          case "options":
            return {
              ...el,
              renderCell: (params: { row: { _id: any } }) => {
                return (
                  <div className="relative">
                    <Icon
                      onClick={() => {
                        actions.setActiveIndex(params?.row._id);
                      }}
                      className="cursor-pointer"
                      name="options"
                    />
                    {actions.activeIndex === params?.row._id && (
                      <div
                        ref={actions.node}
                        className="bg-white h-auto w-[17.063rem] absolute shadow-lg -ml-64 rounded-lg z-50"
                      >
                        {actions.moreOptionsData.map(
                          (options: {
                            style: any;
                            id: Key | null | undefined;
                            children:
                              | string
                              | number
                              | bigint
                              | boolean
                              | ReactElement<
                                  any,
                                  string | JSXElementConstructor<any>
                                >
                              | Iterable<ReactNode>
                              | Promise<AwaitedReactNode>
                              | ((
                                  arg0: any,
                                  arg1: any
                                ) =>
                                  | string
                                  | number
                                  | bigint
                                  | boolean
                                  | ReactElement<
                                      any,
                                      string | JSXElementConstructor<any>
                                    >
                                  | Iterable<ReactNode>
                                  | ReactPortal
                                  | Promise<AwaitedReactNode>
                                  | null
                                  | undefined)
                              | null
                              | undefined;
                          }) => (
                            <div
                              className={`text-career-gray-200 font-medium text-14 hover:bg-career-blue-200 cursor-pointer px-4 py-3 ${
                                options.style ? options.style : ""
                              }`}
                              key={options.id}
                              onClick={() =>
                                actions.setOptionsIndex(options?.id)
                              }
                            >
                              {typeof options.children === "function"
                                ? options.children(
                                    params?.row,
                                    actions.itemLoader
                                  )
                                : options.children}
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              },
            };

          case "Client Name":
            return {
              ...el,
              valueGetter: (params: {
                row: { firstName: string; lastName: string };
              }) => {
                return params?.row.firstName + " " + params?.row.lastName;
              },
            };

          case "CV/Resume":
            return {
              ...el,
              renderCell: (params: {
                row: { isResumeUploaded: boolean | undefined };
              }) => {
                return (
                  <Checkbox
                    onPointerOverCapture={() => {}}
                    onPointerMoveCapture={() => {}}
                    readOnly
                    checked={params?.row.isResumeUploaded}
                    color="info"
                    // crossOrigin={undefined}
                  />
                );
              },
            };

          case "Cover Letter":
            return {
              ...el,
              renderCell: (params: {
                row: { isCoverletterUploaded: boolean | undefined };
              }) => {
                return (
                  <Checkbox
                    onPointerOverCapture={() => {}}
                    onPointerMoveCapture={() => {}}
                    readOnly
                    checked={params?.row.isCoverletterUploaded}
                    color="info"
                    // crossOrigin={undefined}
                  />
                );
              },
            };

          case "createdAt":
            return {
              ...el,
              valueGetter: (params: moment.MomentInput) => {
                return moment(params).format("DD/MM/YY HH:mm");
              },
            };

          case "isDocumentApproved":
            return {
              ...el,
              renderCell: (params: { value: any }) => {
                return (
                  <span>
                    <Chip
                      variant="ghost"
                      className="w-fit normal-case font-normal rounded-full"
                      color={params?.value ? "green" : "amber"}
                      value={params?.value ? "Approved" : "Pending"}
                    />
                  </span>
                );
              },
            };

          case "clientOptions":
            return {
              ...el,
              renderCell: (params: {
                row: {
                  driveUrl: string | undefined;
                  firstName: string;
                  isResumeUploaded: any;
                  _id: any;
                  role: string | number;
                };
              }) => {
                return (
                  <Menu placement="bottom-end">
                    <MenuHandler>
                      <button>
                        <FiMoreVertical />
                      </button>
                    </MenuHandler>
                    <MenuList
                      placeholder=""
                      onPointerEnterCapture={() => {}}
                      onPointerLeaveCapture={() => {}}
                      onResize={() => {}} // Add this prop
                      onResizeCapture={() => {}} // Add this prop
                    >
                      {!!params?.row.driveUrl && (
                        <a target="_blank" href={params?.row.driveUrl}>
                          <MenuItem>
                            GO TO {params?.row.firstName.toUpperCase()}'s
                            DOCUMENTS
                          </MenuItem>
                        </a>
                      )}
                      <MenuItem
                        onClick={() => {
                          if (params?.row.isResumeUploaded) {
                            actions.approveMutation
                              .trigger({
                                isDocumentApproved: true,
                                uid: params?.row._id,
                              })
                              .then(() => mutate());
                          } else {
                            toast(
                              `Resume not uploaded by ${params?.row.firstName} yet`
                            );
                          }
                        }}
                      >
                        Accept documents
                      </MenuItem>

                      <MenuItem
                        className="text-red-500"
                        onClick={() => {
                          if (params?.row.isResumeUploaded) {
                            actions.approveMutation
                              .trigger({
                                isDocumentApproved: false,
                                uid: params?.row._id,
                              })
                              .then(() => mutate());
                          } else {
                            toast(
                              `Resume not uploaded by ${params?.row.firstName} yet`
                            );
                          }
                        }}
                      >
                        Reject Documents
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          actions.setIsDisplayMenuOpen(params?.row._id);
                        }}
                      >
                        Dispatch Sample Results
                      </MenuItem>
                      {/* <Link href={`/admin-dashboard/users/${params?.row._id}`}> */}
                      <Link
                        href={`/admin-dashboard/${roleMap[params?.row.role]?.urlKey || "users"}/${
                          params?.row._id
                        }`}
                      >
                        <MenuItem>
                          View {params?.row.firstName.toUpperCase()}'s Profile
                        </MenuItem>
                      </Link>
                    </MenuList>
                  </Menu>
                );
              },
            };

          case "users":
            return {
              ...el,
              headerName: "Users Referred",
              renderCell: (params: { value: any[] }) => {
                const valueOptions = params?.value?.map(
                  (user: { email: any }) => ({
                    label: user?.email,
                    value: user?.email,
                  })
                );

                return (
                  <Select
                    labelId="demo-multiple-name-label"
                    id="demo-multiple-name"
                    multiple
                    value={[valueOptions?.at(0)]}
                    sx={{ width: "100%" }}
                  >
                    {valueOptions?.map((option: any, index: number) => (
                      <MenuItem key={index} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                );
              },
            };

          case "Details":
            return {
              ...el,
              headerName: "Referrer Email",
              valueGetter: (params: { email: any; user: { email: any } }) => {
                return params?.email ?? params?.user?.email;
              },
            };

          case "planSelectedAt":
            return {
              ...el,
              headerName: "Plan Selected At",
              editable: true,
            };

          case "paymentStatus":
            return {
              ...el,
              editable: true,
              headerName: "Payment Status",
              type: "singleSelect",
              valueOptions: ["Unpaid", "Paid", "Pending"],
            };

          case "Referral Code":
            return {
              ...el,
              renderCell: (params: { id: any }) => {
                return <p>{params?.id || ""}</p>;
              },
            };

          case "Referrer Name":
            return {
              ...el,
              renderCell: (params: {
                row: {
                  Details: {
                    firstName: any;
                    user: { firstName: any; middleName: any; lastName: any };
                    middleName: any;
                    lastName: any;
                  };
                };
                value:
                  | string
                  | number
                  | bigint
                  | boolean
                  | ReactElement<any, string | JSXElementConstructor<any>>
                  | Iterable<ReactNode>
                  | ReactPortal
                  | Promise<AwaitedReactNode>
                  | null
                  | undefined;
              }) => {
                return (
                  <p>
                    {`${
                      params?.row?.Details?.firstName ||
                      params?.row?.Details?.user?.firstName ||
                      ""
                    } ${
                      params?.row?.Details?.middleName ||
                      params?.row?.Details?.user?.middleName ||
                      ""
                    } ${
                      params?.row?.Details?.lastName ||
                      params?.row?.Details?.user?.lastName ||
                      ""
                    }`}

                    {params.value}
                  </p>
                );
              },
            };

          case "totalAmountPaid":
            return {
              headerName: "Total Amount Paid",
              ...el,
              editable: true,
              renderCell: (params: {
                row: {
                  Details: {
                    totalAmountPaid: any;
                    user: { totalAmountPaid: any };
                  };
                };
              }) => {
                const value =
                  params?.row?.Details?.totalAmountPaid ??
                  params?.row?.Details?.user?.totalAmountPaid;
                return <p>{value ? value : ""}</p>;
              },
            };

          case "Updated At":
            return {
              ...el,
              renderCell: (params: {
                row: { Details: { updatedAt: any; user: { updatedAt: any } } };
              }) => {
                const value =
                  params?.row?.Details?.updatedAt ??
                  params?.row?.Details?.user?.updatedAt;
                return (
                  <p>
                    {value ? moment(value).format("DD-MM-YYYY, HH:MM:SS") : ""}
                  </p>
                );
              },
            };
          default:
            return { ...el };
        }
      default:
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
              renderCell: (params: {
                formattedValue:
                  | string
                  | number
                  | bigint
                  | boolean
                  | ReactElement<any, string | JSXElementConstructor<any>>
                  | Iterable<ReactNode>
                  | ReactPortal
                  | Promise<AwaitedReactNode>
                  | null
                  | undefined;
              }) => {
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
                  ? params?.value
                      ?.split("||")[0]
                      .replace(/</g, "")
                      .replace(/>/g, "")
                  : params?.split("||")[0].replace(/</g, "").replace(/>/g, "");
                return value?.trim();
              },
            };
          case "SeekAnswerPriority":
            return {
              ...el,
              editable: true,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                // console.log(params);
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
          case "Seek_Aggregator":
            return {
              ...el,
              editable: true,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                // console.log(params);

                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };
          case "Linkedin_Aggregator":
            return {
              ...el,
              editable: true,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                // console.log(params);
                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };
          case "Jobserve_Aggregator":
            return {
              ...el,
              editable: true,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                // console.log(params);
                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };
          case "EscapeCity_Aggregator":
            return {
              ...el,
              editable: true,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                // console.log(params);
                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };

          case "WorkforceAustralia_Aggregator":
            return {
              ...el,
              editable: true,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                // console.log(params);
                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };
          case "EscapeCity_Aggregator":
            return {
              ...el,
              editable: true,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                // console.log(params);
                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };
          case "WorkforceAustrailia_Aggregator":
            return {
              ...el,
              editable: true,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                // console.log(params);
                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };
          case "Adzuna_Aggregator":
            return {
              ...el,
              editable: true,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                // console.log(params);
                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };
          case "CareerOne_Aggregator":
            return {
              ...el,
              editable: true,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                // console.log(params);
                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };
          case "Indeed_Aggregator":
            return {
              ...el,
              editable: true,

              renderCell: (params: { formattedValue: boolean | undefined }) => {
                // console.log(params);
                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };
          case "Monster_Aggregator":
            return {
              ...el,
              editable: true,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                // console.log(params);
                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };

          case "SeekAnswerPriority":
            return {
              ...el,
              renderCell: (params: { formattedValue: boolean | undefined }) => {
                // console.log(params);
                return (
                  <Switch
                    checked={params?.formattedValue}
                    className={`${params?.formattedValue ? "!bg-green-500" : "!bg-red-500"} `}
                  />
                );
              },
            };

          case "Full_Name":
            return {
              ...el,
              editable: true,
            };

          case "Plan":
            return {
              ...el,
              editable: true,
            };
          case "ReturnCount":
            return {
              ...el,
              editable: true,
            };
          case "Order":
            return {
              ...el,
              editable: true,
            };
          case "First_Name":
            return {
              ...el,
              editable: true,
            };
          case "Middle_Name":
            return {
              ...el,
              editable: true,
            };
          case "Last_Name":
            return {
              ...el,
              editable: true,
            };
          case "Batch":
            return {
              ...el,
              editable: true,
            };
          case "Craft":
            return {
              ...el,
              editable: true,
            };
          case "Status":
            return {
              ...el,
              editable: true,
            };
          case "SeekSubStartDate":
            return {
              ...el,
              editable: true,
            };
          case "SeekWeeklyMax":
            return {
              ...el,
              editable: true,
            };
          case "SeekSubDurDays":
            return {
              ...el,
              editable: true,
            };

          case "SEEK_Email":
            return {
              ...el,
              editable: true,
            };
          case "SEEK_Password":
            return {
              ...el,
              editable: true,
            };
          case "Seek_Last_Application":
            return {
              ...el,
              editable: true,
            };
          case "Seek_Done":
            return {
              ...el,
              editable: true,
            };
          case "Seek_Credentials_Test":
            return {
              ...el,
              editable: true,
            };

          case "Seek_Credentials_Test_Date":
            return {
              ...el,
              editable: true,
            };
          case "SeekAnswerPriority":
            return {
              ...el,
              editable: true,
            };
          case "SeekCVLastUpdateddate":
            return {
              ...el,
              editable: true,
            };
          case "Linkedin_Email":
            return {
              ...el,
              editable: true,
            };
          case "Linkedin_Password":
            return {
              ...el,
              editable: true,
            };

          case "Linkedin_Credentials_Test":
            return {
              ...el,
              editable: true,
            };
          case "Linkedin_Credentials_Test_Date":
            return {
              ...el,
              editable: true,
            };
          case "Indeed_Email":
            return {
              ...el,
              editable: true,
            };
          case "Indeed_Password":
            return {
              ...el,
              editable: true,
            };
          case "Indeed_Credentials_Test":
            return {
              ...el,
              editable: true,
            };
          case "Indeed_Credentials_Test_Date":
            return {
              ...el,
              editable: true,
            };
          case "Jobserve_Email":
            return {
              ...el,
              editable: true,
            };
          case "Jobserve_Password":
            return {
              ...el,
              editable: true,
            };
          case "Jobserve_Credentials_Test":
            return {
              ...el,
              editable: true,
            };

          case "EscapeCity_Email":
            return {
              ...el,
              editable: true,
            };
          case "EscapeCity_Password":
            return {
              ...el,
              editable: true,
            };
          case "EscapeCity_Credentials_Test":
            return {
              ...el,
              editable: true,
            };

          case "WorkforceAustralia_Email":
            return {
              ...el,
              editable: true,
            };
          case "WorkforceAustralia_Password":
            return {
              ...el,
              editable: true,
            };
          case "WorkforceAustralia_Credentials_Test":
            return {
              ...el,
              editable: true,
            };

          case "Monster_Email":
            return {
              ...el,
              editable: true,
            };
          case "Monster_Password":
            return {
              ...el,
              editable: true,
            };
          case "Monster_Last_Application":
            return {
              ...el,
              editable: true,
            };
          case "Monster_Done":
            return {
              ...el,
              editable: true,
            };
          case "Monster_Credentials_Test":
            return {
              ...el,
              editable: true,
            };
          case "Monster_Credentials_Test_Date":
            return {
              ...el,
              editable: true,
            };
          case "Suncorp_Email":
            return {
              ...el,
              editable: true,
            };
          case "Suncorp_Password":
            return {
              ...el,
              editable: true,
            };
          case "Suncorp_Credentials_Test":
            return {
              ...el,
              editable: true,
            };
          case "Suncorp_Credentials_Test_Date":
            return {
              ...el,
              editable: true,
            };
          case "Aurecon_Email":
            return {
              ...el,
              editable: true,
            };
          case "Aurecon_Password":
            return {
              ...el,
              editable: true,
            };
          case "Aurecon_Credentials_Test":
            return {
              ...el,
              editable: true,
            };
          case "Aurecon_Credentials_Test_Date":
            return {
              ...el,
              editable: true,
            };
          case "BHP_Email":
            return {
              ...el,
              editable: true,
            };
          case "BHP_Password":
            return {
              ...el,
              editable: true,
            };
          case "BHP_Credentials_Test":
            return {
              ...el,
              editable: true,
            };
          case "BHP_Credentials_Test_Date":
            return {
              ...el,
              editable: true,
            };
          case "Michael_Page_Email":
            return {
              ...el,
              editable: true,
            };
          case "Michael_Page_Password":
            return {
              ...el,
              editable: true,
            };
          case "Michael_Page_Credentials_Test":
            return {
              ...el,
              editable: true,
            };
          case "Michael_Page_Credentials_Test_Date":
            return {
              ...el,
              editable: true,
            };
          case "Randstad_Email":
            return {
              ...el,
              editable: true,
            };
          case "Randstad_Password":
            return {
              ...el,
              editable: true,
            };

          case "Randstad_Credentials_Test":
            return {
              ...el,
              editable: true,
            };
          case "Randstad_Credentials_Test_Date":
            return {
              ...el,
              editable: true,
            };
          case "Commonwealth_Bank_Email":
            return {
              ...el,
              editable: true,
            };
          case "Commonwealth_Bank_Password":
            return {
              ...el,
              editable: true,
            };
          case "Commonwealth_Bank_Credentials_Test":
            return {
              ...el,
              editable: true,
            };
          case "Commonwealth_Bank_Credentials_Test_Date":
            return {
              ...el,
              editable: true,
            };
          case "NAB_Email":
            return {
              ...el,
              editable: true,
            };
          case "NAB_Password":
            return {
              ...el,
              editable: true,
            };
          case "NAB_Credentials_Test":
            return {
              ...el,
              editable: true,
            };
          case "NAB_Credentials_Test_Date":
            return {
              ...el,
              editable: true,
            };
          case "Glencore_Email":
            return {
              ...el,
              editable: true,
            };
          case "Glencore_Password":
            return {
              ...el,
              editable: true,
            };
          case "Glencore_Credentials_Test":
            return {
              ...el,
              editable: true,
            };
          case "Glencore_Credentials_Test_Date":
            return {
              ...el,
              editable: true,
            };
          case "Current_City":
            return {
              ...el,
              editable: true,
            };
          case "Onboarding_Date":
            return {
              ...el,
              editable: true,
            };
          case "Criteria_Review_Completed":
            return {
              ...el,
              editable: true,
            };
          case "Referrer":
            return {
              ...el,
              editable: true,
            };
          case "Blacklisted":
            return {
              ...el,
              editable: true,
            };
          case "SEEK_Login_Type":
            return {
              ...el,
              editable: true,
            };

          case "planSelectedAt":
            return {
              ...el,
              editable: true,
            };

          case "Alias_Email":
            // console.log("Got you now....");
            return {
              ...el,
              editable: true,
            };
          case "Alias_Password":
            return {
              ...el,
              editable: true,
            };

          default:
            return el;
        }
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

// export const modifyRowData = (
//   el: any,
//   index: number,
//   table?: TableInformationEnum | ClientTableInformationEnum | AppQuePageEnum
// ) => {
//   switch (table) {
//     case ClientTableInformationEnum.Seek:
//       return {
//         ...el,
//         Country: el.Country.split('||')[0].replace(/</g, '').replace(/>/g, ''),
//       };

//     case TableInformationEnum.ClientInformation:
//     case TableInformationEnum.ClientInformationRecycle:
//       return {
//         ...el,
//         Active: (() => {
//           if (el?.isActiveTriggeredByAdmin) {
//             return el.Active;
//           }
//           if (el.CampaignEnd) {
//             return moment().isAfter(moment(el.CampaignEnd, 'DD-MM-YYYY').toDate()) ? false : true;
//           } else {
//             return moment().isAfter(
//               moment(el.SeekSubStartDate).add(Number(el.SeekSubDurDays), 'days').toDate()
//             )
//               ? false
//               : true;
//           }
//         })(),
//       };

//     default:
//       return {
//         ...el,
//         // SeekSubEndDate: el.SeekSubStartDate
//         //   ? moment(el.SeekSubStartDate).add(Number(el.SeekSubDurDays), 'days').format('DD-MM-YYYY')
//         //   : null,
//         SeekSubToExpireDays: (() => {
//           let t = moment(el.SeekSubStartDate)
//             .add(Number(el.SeekSubDurDays), 'days')
//             .diff(moment(), 'days');
//           return t <= 0 ? 0 : t;
//         })(),
//         // SeekSubExpired:
//         //   moment(el.SeekSubStartDate)
//         //     .add(Number(el.SeekSubDurDays), 'days')
//         //     .diff(moment(), 'days') <= 0
//         //     ? 'YES'
//         //     : 'NO',
//         Done: el.Done ? moment(el.Done).format('DD-MM-YYYY HH:mm:ss') : null,
//         Indeed_Done: el.Indeed_Done ? moment(el.Indeed_Done).format('DD-MM-YYYY HH:mm:ss') : null,
//         Indeed_Last_Application: el.Indeed_Last_Application
//           ? moment(el.Indeed_Last_Application).format('DD-MM-YYYY HH:mm:ss')
//           : null,
//         Jobserve_Done: el.Jobserve_Done
//           ? moment(el.Jobserve_Done).format('DD-MM-YYYY HH:mm:ss')
//           : null,
//         Jobserve_Last_Application: el.Jobserve_Last_Application
//           ? moment(el.Jobserve_Last_Application).format('DD-MM-YYYY HH:mm:ss')
//           : null,
//         Last_Application: el.Last_Application
//           ? moment(el.Last_Application).format('DD-MM-YYYY HH:mm:ss')
//           : null,
//         Linkedin_Done: el.Linkedin_Done
//           ? moment(el.Linkedin_Done).format('DD-MM-YYYY HH:mm:ss')
//           : null,
//         Linkedin_Last_Application: el.Linkedin_Last_Application
//           ? moment(el.Linkedin_Last_Application).format('DD-MM-YYYY HH:mm:ss')
//           : null,
//         Onboarding_Date: el.Onboarding_Date
//           ? moment(el.Onboarding_Date).format('DD-MM-YYYY HH:mm:ss')
//           : null,
//         SeekCVLastUpdateddate: el.SeekCVLastUpdateddate
//           ? moment(el.SeekCVLastUpdateddate).format('DD-MM-YYYY HH:mm:ss')
//           : null,
//         SeekSubStartDate: el.SeekSubStartDate ? el.SeekSubStartDate : null,
//         Seek_Credentials_Test_Date: el.Seek_Credentials_Test_Date
//           ? moment(el.Seek_Credentials_Test_Date).format('DD-MM-YYYY HH:mm:ss')
//           : null,
//         Seek_Done: el.Seek_Done ? moment(el.Seek_Done).format('DD-MM-YYYY HH:mm:ss') : null,
//         Seek_Last_Application: el.Seek_Last_Application
//           ? moment(el.Seek_Last_Application).format('DD-MM-YYYY HH:mm:ss')
//           : null,
//         rowClass: `${index % 2 === 0 ? 'bg-career-gray-400' : 'bg-white'}`,
//       };
//   }
// };

export const convertTime = (data: string, type?: string) => {
  let dateTimeParts: string[],
    dateParts: string[],
    day: number,
    month: number,
    year: number,
    timeParts: string[],
    hour: number,
    minute: number,
    second: number,
    date;

  switch (type) {
    case "SEEK-START":
      // console.log(data);
      dateTimeParts = data.split("/");
      day = parseInt(dateTimeParts[0], 10);
      month = parseInt(dateTimeParts[1], 10) - 1;
      year = parseInt(dateTimeParts[2], 10);

      date = new Date(year, month, day);
      return date;

    case "SEEK-END":
      dateTimeParts = data.split("-");
      day = parseInt(dateTimeParts[0], 10);
      month = parseInt(dateTimeParts[1], 10) - 1;
      year = parseInt(dateTimeParts[2], 10);

      date = new Date(year, month, day);
      return date;

    default:
      if (data) {
        dateTimeParts = data.split(" ");

        dateParts = dateTimeParts[0].split("-");
        day = parseInt(dateParts[0], 10);
        month = parseInt(dateParts[1], 10) - 1;
        year = parseInt(dateParts[2], 10);

        if (dateTimeParts[1]) {
          timeParts = dateTimeParts[1].split(":");
          hour = parseInt(timeParts[0], 10);
          minute = parseInt(timeParts[1], 10);
          second = parseInt(timeParts[2], 10);
        } else {
          hour = parseInt("0", 10);
          minute = parseInt("0", 10);
          second = parseInt("0", 10);
        }

        date = new Date(year, month, day, hour, minute, second);
        return date;
      } else {
        return null;
      }
  }
};

export const updateTime = (value: string | number | Date) => {
  let date;
  date = new Date(value);
  date = new Date(
    date.toLocaleString("en-US", { timeZone: "Australia/Sydney" })
  );
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  const hour = date.getHours().toString().padStart(2, "0");
  const minute = date.getMinutes().toString().padStart(2, "0");
  const second = date.getSeconds().toString().padStart(2, "0");
  const dateString = `${day}-${month}-${year} ${hour}:${minute}:${second}`;
  return dateString;
};

export const createTime = (value: string | number | Date) => {
  const dateTime = new Date(value);
  const day = dateTime.getDate();
  const month = dateTime.getMonth() + 1; // January is 0, so add 1
  const year = dateTime.getFullYear();
  const hour = dateTime.getHours();
  const minute = dateTime.getMinutes();
  const second = dateTime.getSeconds();

  // Pad day, month, hour, minute, and second with leading zero if necessary
  const paddedDay = day < 10 ? "0" + day : day;
  const paddedMonth = month < 10 ? "0" + month : month;
  const paddedHour = hour < 10 ? "0" + hour : hour;
  const paddedMinute = minute < 10 ? "0" + minute : minute;
  const paddedSecond = second < 10 ? "0" + second : second;

  // Return formatted date-time in "day-month-year hour:minute:second" format
  return `${paddedDay}-${paddedMonth}-${year} ${paddedHour}:${paddedMinute}:${paddedSecond}`;
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
      // console.log(el);
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

export const modifyupdateData = (el: any) => {
  const keys = Object.keys(el);
  for (let i = 0; i <= Object.keys(el).length; i++) {
    if (isArray(el[keys[i]])) {
      el[keys[i]] = el[keys[i]].join(",");
    }
  }

  return { ...el };
};

export function handleAccountApproval(
  user: { role: string; isDocumentUploaded: any; _id: any; firstName: any },
  setActionUser: (arg0: any) => void,
  setIsAccountApprovalModalOpen: (arg0: (prev: any) => boolean) => void,
  approveMutation: {
    trigger: (arg0: { isDocumentApproved: boolean; uid: any }) => Promise<any>;
  },
  mutate: () => any
) {
  if (["sales", "coach", "partner", "customer"].includes(user.role)) {
    setActionUser(user);
    setIsAccountApprovalModalOpen((prev) => !prev);
  } else {
    if (user.isDocumentUploaded) {
      approveMutation
        .trigger({
          isDocumentApproved: true,
          uid: user._id,
        })
        .then(() => mutate());
    } else {
      toast(`Resume not uploaded by ${user.firstName} yet`);
    }
  }
}

export const roleMap: Record<
  string,
  {
    urlKey: string;
    label: string;
  }
> = {
  guest: {
    urlKey: "users",
    label: "Guest",
  },
  client: {
    urlKey: "users",
    label: "Client",
  },
  coach: {
    urlKey: "coach",
    label: "Coach",
  },
  partner: {
    urlKey: "partners",
    label: "Partner",
  },
  admin: {
    urlKey: "users",
    label: "Admin",
  },
  sales: {
    urlKey: "sales",
    label: "Sales Consultant",
  },
  cse: {
    urlKey: "customer",
    label: "Customer Support Executive",
  },
  assistant: {
    urlKey: "assistant",
    label: " Talent Placement Analyst",
  },
};
