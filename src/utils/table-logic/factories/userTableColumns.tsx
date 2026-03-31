/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import moment from "moment";
import Link from "next/link";
import { Switch } from "antd";
import { Menu, MenuHandler, MenuList, MenuItem } from "@material-tailwind/react";
import { FiMoreVertical } from "react-icons/fi";
import { Autocomplete, Checkbox, ListItemText, Select, MenuItem as MuiMenuItem, TextField } from "@mui/material";
import { styled } from "@mui/material/styles";
import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useGridApiContext } from "@mui/x-data-grid-pro";
import { UpdateSelect } from "@/components/AdminUsersComponent/filter-select";
import { getCountries } from "../table-services";
import { roleMap } from "../constants";
import { handleAccountApproval } from "../table-helpers";
import { PreProgress } from "@/types/enum";

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

export const CountrySelector = ({ params, field }: { params: any; field: any }) => {
  const [options, setOptions] = useState<any>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const resolvedCountryList = await getCountries();
        const countryOptions = Array.isArray(resolvedCountryList)
          ? resolvedCountryList
          : [];
        setOptions(countryOptions);
      } catch {
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

export const applyUserTableColumn = (el: any, actions?: any, mutate?: any) => {
  switch (el.field) {
    case "profile":
      return {
        ...el,
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
        renderCell: (params: { value: string | undefined }) => {
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
        renderCell: (params: { value: string | undefined }) => {
          let isSeen: boolean = false;

          if (actions?.phoneTrackingMap?.has(params?.value)) {
            const trackingData = actions?.phoneTrackingMap?.get(params?.value);
            if (trackingData) {
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
        renderCell: (params: { row: { referrerName: any } }) => {
          const value: string = `${params?.row.referrerName}`;
          return { value };
        },
      };

    case "Referrer Role":
      return {
        ...el,
        renderCell: (params: { row: { referrerRole: any } }) => {
          const value: string = `${params?.row.referrerRole}`;
          return { value };
        },
      };

    case "role":
      return {
        ...el,
        type: "singleSelect",
        headerName: "Persona",
        valueOptions: Object.entries(roleMap).map(([key, data]) => ({
          value: key,
          label: data.label,
        })),

        renderCell: (params: { value: any }) => {
          const value = params?.value ? params?.value : "N/A";
          return (
            <p className="capitalize">{roleMap[value]?.label || value}</p>
          );
        },
      };

    case "accessLevel":
      return {
        ...el,
        type: "singleSelect",
        valueOptions: [
          { label: "User", value: "user" },
          { label: "Contributor", value: "contributor" },
          { label: "Administrator", value: "administrator" },
          { label: "Manager", value: "manager" },
          { label: "Moderator", value: "moderator" },
          { label: "Read-Only", value: "read-only" },
        ],
      };

    case "customerClass":
      return {
        ...el,
        renderCell: (params: { value: any }) => {
          return <p>{params?.value ? params?.value : "N/A"}</p>;
        },
      };
    case "createdAt":
    case "updatedAt":
      return {
        ...el,
        renderCell: (params: { value: moment.MomentInput }) => {
          return <p>{moment(params?.value).format("DD-MM-YYYY, HH:MM:SS")}</p>;
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
        renderCell: (params: { value: any }) => {
          return <p>{params?.value ? params?.value : "N/A"}</p>;
        },
      };
    case "slackId":
      return {
        ...el,
        renderCell: (params: { value: any }) => {
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
            ? params?.value?.split("||")[0].replace(/</g, "").replace(/>/g, "")
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
          { label: "Yes", value: "Yes" },
          { label: "No", value: "No" },
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

        const persistValue = (id: string | number, selectedOptions: any) => {
          const existingData =
            JSON.parse(localStorage.getItem("socialsData") || "{}") || {};
          existingData[id] = selectedOptions;
          localStorage.setItem("socialsData", JSON.stringify(existingData));
        };

        const handleChange = (event: { target: { value: any } }) => {
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
            onChange={handleChange as any}
            renderValue={(selected) => (selected as string[]).join(", ")}
            className="w-full p-2 border border-gray-300 rounded-md"
          >
            {socialOptions.map((option) => (
              <MuiMenuItem key={option.value} value={option.value}>
                <Checkbox
                  checked={value.indexOf(option.value) > -1}
                  onChange={() => handleCheckboxChange(option.value)}
                />
                <ListItemText primary={option.label} />
              </MuiMenuItem>
            ))}
          </Select>
        );
      };

      return {
        ...el,
        renderEditCell: (params: { id: string | number; value: any }) => {
          const savedData =
            JSON.parse(localStorage.getItem("socialsData") || "{}") || {};
          const value = savedData[params.id] || params.value || [];

          return <CustomSocialsEditComp field {...params} value={value} />;
        },
        renderCell: (params: { id: string | number; value: any; row: { socials: any } }) => {
          const savedData =
            JSON.parse(localStorage.getItem("socialsData") || "{}") || {};
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
                ? (params?.value as any)[0].hasPaid
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
        renderCell: (params: { value: { zohoInvoices: string | any[] } }) => {
          return (
            <Link
              className={`w-[120px] text-${
                params?.value?.zohoInvoices?.length > 0 ? "blue" : "black"
              } ${params?.value?.zohoInvoices?.length > 0 ? "" : "cursor-not-allowed"}`}
              href={
                params?.value?.zohoInvoices?.length > 0
                  ? (params?.value?.zohoInvoices as any)[0].invoiceUrl
                  : "#"
              }
            >
              {params?.value?.zohoInvoices?.length > 0
                ? (params?.value?.zohoInvoices as any)[0].invoiceUrl
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
        renderCell: (params: { value: { validityPeriod: any } }) => {
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
        renderCell: (params: { row: { planData: { createdAt: moment.MomentInput } } }) => {
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
        renderCell: (params: { row: { planData: { expiresAt: moment.MomentInput } } }) => {
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
        renderCell: (params: { row: { planData: { hasExpired: any } } }) => {
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
      return {
        ...el,
      };
    case "progress":
      return {
        ...el,
        renderCell: (params: { value: string; row: { progress: any } }) => {
          return (
            <UpdateSelect
              placeholder="N/A"
              options={[
                { label: PreProgress.SIGNEDUP, value: PreProgress.SIGNEDUP },
                { label: PreProgress.PREFERENCEINSERTED, value: PreProgress.PREFERENCEINSERTED },
                { label: PreProgress.UPLOADEDDOC, value: PreProgress.UPLOADEDDOC },
                { label: "Email Verified", value: "Email Verified" },
                { label: "Documents Accepted", value: "Documents Accepted" },
                { label: "Documents Declined", value: "Documents Declined" },
                { label: "CV/Resume Uplifted", value: "CV/Resume Uplifted" },
                { label: "Service Selected", value: "Plan Selected" },
                { label: "Payment Confirmed", value: "Payment Confirmed" },
                { label: "Login Credentials Verified", value: "Login Credentials Verified" },
                { label: "Sample Results Dispatched", value: "Sample Results Dispatched" },
                { label: "Sample Results Accepted", value: "Sample Results Accepted" },
                { label: "Preparatory Session Accepted", value: "Preparatory Session Accepted" },
                { label: "Preparatory Session Declined", value: "Preparatory Session Declined" },
                { label: "Application Commenced", value: "Application Commenced" },
                { label: "Application Hold", value: "Application Hold" },
                { label: "Application Expired", value: "Application Expired" },
                { label: "Offer Notification Received", value: "Offer Notification Received" },
                { label: "Campaign Ended", value: "Campaign Ended" },
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
              <MenuList>
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
                      toast(`Resume not uploaded by ${params?.row.firstName} yet`);
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
      const CustomEditComp = (props: { id: any; value: any; field: any }) => {
        const { id, value, field } = props;
        const apiRef = useGridApiContext();
        const handleChange = (event: any) => {
          apiRef.current.setEditCellValue({ id, field, value: event });
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
        renderCell: (params: { row: { planData: { hasExpired: any } } }) => {
          let active = false;
          if (params?.row?.planData) {
            active = !params?.row?.planData?.hasExpired;
          }
          return <p>{active ? "True" : "False"}</p>;
        },
      };
    case "isUserSubscribed":
    case "isDocumentApproved":
    case "isDocumentUploaded":
    case "inflight":
      return {
        ...el,
        type: "singleSelect",
        valueOptions: [true, false],
        renderCell: (params: { value: any }) => {
          return <p>{params?.value ? "True" : "False"}</p>;
        },
      };
    case "returnCount":
      return { ...el, headerName: "Return Count" };
    default:
      return null;
  }
};
