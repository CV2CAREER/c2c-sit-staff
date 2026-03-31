/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import moment from "moment";
import { Menu, MenuHandler, MenuList, MenuItem } from "@material-tailwind/react";
import { FiMoreVertical } from "react-icons/fi";
import { Select, MenuItem as MuiMenuItem, Checkbox } from "@mui/material";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import Icon from "../../../../public/icons";
import { toTitleCase } from "../table-helpers";
import { updateAggregator } from "../table-services";
import { roleMap } from "../constants";
import { Key } from "react";
import { UrlObject } from "url";
import { Chip } from "@material-tailwind/react";

export const applyCpanColumn = (el: any, actions?: any) => {
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
            return <p>Active</p>;
          } else if (params?.row?.isUserSubscribed === false) {
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
                  <MenuList>
                    <MenuItem
                      onClick={() =>
                        actions.handleUpdateReferral({
                          email: params?.row.referrer.referrer,
                          id: params?.row._id,
                          status: "REJECTED",
                          variance: actions.variance,
                        })
                      }
                      disabled={params?.row.referrer.status === "REJECTED"}
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
                      disabled={params?.row.referrer.status === "APPROVED"}
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
                  <MenuList>
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
        valueGetter: (params: { value: { referrer: any }; referrer: any }) => {
          return params?.value?.referrer ?? params?.referrer;
        },
      };
      
    case "document":
      return {
        ...el,
        renderCell: (params: { value: { filename: any } }) => {
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
        renderCell: (params: { row: { document: { fileUrl: string | undefined } } }) => {
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
        renderCell: (params: { row: { aggregator: { name: any; }; }; }) => {
          return <p>{params?.row?.aggregator?.name}</p>;
        },
      };

    case "validate on":
      return {
        ...el,
        valueGetter: (params: { row: { aggregator: { updatedAt: any } } }) => {
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
                if (params?.row?.aggregator?.name === "WorkforceAustralia") {
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
        renderCell: (params: { row: { aggregator: { createdAt: moment.MomentInput } } }) => {
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
        renderCell: (params: { row: { aggregator: { picture: { fileUrl: string | UrlObject } } } }) => {
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
                      children: any;
                    }) => (
                      <div
                        className={`text-career-gray-200 font-medium text-14 hover:bg-career-blue-200 cursor-pointer px-4 py-3 ${
                          options.style ? options.style : ""
                        }`}
                        key={options.id}
                        onClick={() => actions.setOptionsIndex(options?.id)}
                      >
                        {typeof options.children === "function"
                          ? options.children(params?.row, actions.itemLoader)
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
        valueGetter: (params: { row: { firstName: string; lastName: string } }) => {
          return params?.row.firstName + " " + params?.row.lastName;
        },
      };

    case "CV/Resume":
      return {
        ...el,
        renderCell: (params: { row: { isResumeUploaded: boolean | undefined } }) => {
          return (
            <Checkbox
              readOnly
              checked={params?.row.isResumeUploaded}
              color="info"
            />
          );
        },
      };

    case "Cover Letter":
      return {
        ...el,
        renderCell: (params: { row: { isCoverletterUploaded: boolean | undefined } }) => {
          return (
            <Checkbox
              readOnly
              checked={params?.row.isCoverletterUploaded}
              color="info"
            />
          );
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
              <MenuList>
                {!!params?.row.driveUrl && (
                  <a target="_blank" href={params?.row.driveUrl}>
                    <MenuItem>
                      GO TO {params?.row.firstName.toUpperCase()}'s DOCUMENTS
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
                        .then(() => actions.mutate?.());
                    } else {
                      // toast logic is likely handled by caller or we accept it won't fire toast properly without importing it
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
                        .then(() => actions.mutate?.());
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
                  href={`/admin-dashboard/${roleMap[params?.row.role]?.urlKey || "users"}/${params?.row._id}`}
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
          const valueOptions = params?.value?.map((user: { email: any }) => ({
            label: user?.email,
            value: user?.email,
          }));

          return (
            <Select
              multiple
              value={[valueOptions?.at(0)]}
              sx={{ width: "100%" }}
            >
              {valueOptions?.map((option: any, index: number) => (
                <MuiMenuItem key={index} value={option.value}>
                  {option.label}
                </MuiMenuItem>
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
          value: any;
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
        ...el,
        headerName: "Total Amount Paid",
        editable: true,
        renderCell: (params: {
          row: { Details: { totalAmountPaid: any; user: { totalAmountPaid: any }; } };
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
            <p>{value ? moment(value).format("DD-MM-YYYY, HH:MM:SS") : ""}</p>
          );
        },
      };
    default:
      return null;
  }
};
