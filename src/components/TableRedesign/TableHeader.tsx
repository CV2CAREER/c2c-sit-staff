/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client";
// eslint-disable @typescript-eslint/no-unused-vars
import { Checkbox, Select as AntSelect, Switch } from "antd";
import {
  useParams,
  usePathname,
  useSearchParams,
} from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import Select from "react-select";
import { FiLoader } from "react-icons/fi";
import { ClientTableInformationEnum, Jobsite } from "@/types/enum";
import { useAuthStore } from "@/store/user.store";
import { useAdminMutations, useAdminQueries } from "@/hooks/api/admin.api";
import { useRouter } from "next/navigation";

const Header = ({
  editMode,
  setEditMode,
  search,
  debouncedSearch,
  select,
  setTable,
  otherValues,
  filterValues,
  defaultFilter,
  dropdownSearch,
  defaultValue,
  values,
  listOfValues,
  listOfDisplayValues,
  onChange,
  craft,
  setSearchUser,
  updateMultipleRows,
  saveMultipleData,
  fillDropdown,
  setFillDownIsOpen,
  extraStyles,
  switchProfPrefs,
  secondFilterValues,
  setSecondFilter,
  tableu,
  setRegexIsTriggered,
  showRegex,
  aggregatorValues,
  handleAggregatorChange: propHandleAggregatorChange,
  setImportDataIsOpen,
  thirdFilterValues,
  setThirdFilter,
  secondFilterPlaceholder,
  thirdFilterPlaceholder,
  aggregatorPlaceholder,
  selectTitle,
  otherValuesTitle,
  setSortByAggregator,
  showNotifyAdmin,
  Notifydata,
  clientSide,
  showDispatchCredentials,
}: {
  editMode?: any;
  setEditMode?: any;
  search?: any;
  showProfileBtn?: any;
  showProfileBtnSwitch?: any;
  secondaryCampaign?: any;
  debouncedSearch?: any;
  switchProfPrefs?: boolean;
  isNewRecord?: any;
  setTable?: any;
  select?: boolean;
  otherValues?: any;
  filterValues?: any;
  defaultFilter?: any;
  dropdownSearch?: any;
  defaultValue?: any;
  values?: any;
  listOfValues?: any;
  listOfDisplayValues?: any;
  onChange?: any;
  craft?: any;
  setSearchUser?: any;
  updateMultipleRows?: any;
  saveMultipleData?: any;
  fillDropdown?: any;
  setFillDownIsOpen?: any;
  extraStyles?: any;
  setSecondFilter?: any;
  secondFilterValues?: any;
  secondFilterDefault?: any;
  tableu?: any;
  setRegexIsTriggered?: any;
  showRegex?: boolean;
  aggregatorValues?: any;
  handleAggregatorChange?: any;
  defaultAggregator?: any;
  setImportDataIsOpen?: (p: boolean) => void;
  thirdFilterValues?: any;
  thirdFilterDefault?: any;
  setThirdFilter?: any;
  secondFilterPlaceholder?: any;
  thirdFilterPlaceholder?: any;
  aggregatorPlaceholder?: any;

  selectTitle?: any;
  otherValuesTitle?: any;
  setSortByAggregator?: any;
  showNotifyAdmin?: boolean;
  Notifydata?: any;
  clientSide?: boolean;
  showDispatchCredentials?: boolean;
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userId, setUserId] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isClientDetail, setIsClientDetail] = useState(false);
  const [regexTriggered, setRegexTriggered] = useState(false);
  const [triggerValue, setTriggerValue] = useState(false);
  const pathname = usePathname();
  const hasPageBeenRendered = useRef(false);
  // const router = useRouter();
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [showDispatchPreferences, _setShowDispatchPreferences] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoading, setIsLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isLoadingNotifyAdmin, setIsLoadingNotifyAdmin] = useState(false);
  const [selectedAggregator, setSelectedAggregator] = useState(
    searchParams?.get("table") &&
      Object.values(Jobsite).some(
        (j) => j?.toLowerCase() == searchParams.get("table")?.toLowerCase()
      )
      ? searchParams.get("table")
      : null
  );
  const [selectedOtherData, setSelectedOtherData] = useState(
    searchParams?.get("table") &&
      !Object.values(Jobsite).some(
        (j) => j.toLowerCase() == searchParams.get("table")?.toLowerCase()
      )
      ? searchParams.get("table")
      : null
  );
  const user = useAuthStore((state: any) => state.user);
  const { regexQueueDomain } = useAdminQueries({
    userId,
    fetchRegexQueue: true,
  });
  const { updateRegexQueueMutation } = useAdminMutations();

  useEffect(() => {
    if (regexQueueDomain.data) {
      setTriggerValue(regexQueueDomain.data.data === "True");
    }
  }, [regexQueueDomain.data]);

  const handleAggregatorChange = (value: any) => {
    setSelectedAggregator(value);
    setSelectedOtherData(null);
    setTable(value);
    if (propHandleAggregatorChange) {
      propHandleAggregatorChange(value);
    }
  };

  const handleOtherDataChange = (value: any) => {
    setSelectedOtherData(value);
    // setSelectedAggregator(null);
    setTable(value);
  };

  useEffect(() => {
    if (searchParams?.get("mode") === "switch") {
      setSelectedAggregator(null);

      // Remove 'mode' from URL without redirecting
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("mode");

      window.history.replaceState(null, "", `?${newParams.toString()}`);
    }
  }, [selectedAggregator, searchParams]);
  useEffect(() => {
    if (hasPageBeenRendered.current) {
      const value = regexTriggered ? "True" : "False";
      const tId = toast.loading("Loading...");
      updateRegexQueueMutation.mutate(
        { value, variant: userId || "all" },
        {
          onSuccess: (data: any) => toast.success(data?.message || "Trigger updated", { id: tId }),
          onError: () => toast.error("Failed to update trigger", { id: tId }),
        }
      );
    }
    hasPageBeenRendered.current = true;
  }, [regexTriggered]);

  // const handleProfileSwitch = async () => {
  //   try {
  //     const response = await axios.get(
  //       `/api/admin/sheets/switch-profile?id=${userId}&to=${secondaryCampaign ? "primary" : "secondary"}`
  //     );
  //     const switchid = response.data.id;

  //     if (response.status === 200) {
  //       if (switchid) {
  //         toast.success("Profile switched successfully");
  //         router.push(`/admin/master-sheet/client/${switchid}?table=${tableu}`);
  //       } else {
  //         toast.error("Secondary Profile does not exist");
  //       }
  //     } else {
  //       toast.error("Failed to switch profile");
  //     }
  //   } catch (error) {
  //     toast.error("Failed to switch profile");
  //   }
  // };

  const {
    dispatchCredentialsMutation,
    generatePasswordMutation,
    sendPreferenceEmailMutation,
    notifyAdminMutation,
    updateSheetsMutation,
    fetchPreferenceEmailDetailsMutation,
  } = useAdminMutations();

  async function handleDispatchCredentials(clientId: string) {
    const tId = toast.loading("Dispatching credentials to client.");
    dispatchCredentialsMutation.mutate(
      { clientId },
      {
        onSuccess: (data: any) => toast.success(data?.message || "Credentials dispatched", { id: tId }),
        onError: (err: any) => toast.error(err?.message || "Failed to dispatch credentials", { id: tId }),
      }
    );
  }

  const handleProfileSwitchpref = () => {
    const isSecondary = searchParams?.get("secondary") === "true";

    // Construct the new URL based on the current state
    const newUrl = isSecondary
      ? pathname // Remove `secondary` by reverting to base path
      : `${pathname}?secondary=true`;

    // Push the new URL to the router
    window.location.href = newUrl || "";
  };

  const handleDispatchQuestions = async (userId: string) => {
    const tId = toast.loading("Loading...");
    updateSheetsMutation.mutate(
      { id: userId },
      {
        onSuccess: () => toast.success("Questions dispatched", { id: tId }),
        onError: (err: any) => toast.error(err?.message || "Failed to dispatch questions", { id: tId }),
      }
    );
  };

  const handleApproveContest = async (userId: string, status: string) => {
    const tId = toast.loading("Loading...");
    notifyAdminMutation.mutate(
      { id: userId, status: status },
      {
        onSuccess: () => toast.success("Admin notified", { id: tId }),
        onError: (err: any) => toast.error(err?.message || "Failed to notify admin", { id: tId }),
      }
    );
  };

  function generatePassword(length = 16) {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  const handleGeneratePassword = async (userId: string) => {
    const password = generatePassword();
    const tId = toast.loading("Generating password...");
    generatePasswordMutation.mutate(
      { userId },
      {
        onSuccess: () => toast.success("Password generated successfully", { id: tId }),
        onError: (err: any) => toast.error(err?.message || "Failed to generate password", { id: tId }),
      }
    );
  };

  const handleDispatchPreferences = async (userId: string) => {
    const tId = toast.loading("Fetching user details...");
    fetchPreferenceEmailDetailsMutation.mutate(
      { search: userId },
      {
        onSuccess: (data: any) => {
          if (!data?.data?.email) {
            return toast.error("User email is not specified", { id: tId });
          }
          toast.loading("Sending preference email...", { id: tId });
          sendPreferenceEmailMutation.mutate(
            { userId },
            {
              onSuccess: () => toast.success("Email sent successfully", { id: tId }),
              onError: (err: any) => toast.error(err?.message || "Failed to send email", { id: tId }),
            }
          );
        },
        onError: (err: any) => toast.error(err?.message || "Failed to fetch user details", { id: tId }),
      }
    );
  };

  const handleNotifyAdmin = async () => {
    if (!showNotifyAdmin) return;
    const tId = toast.loading("Notifying admin...");
    notifyAdminMutation.mutate(
      { Notifydata },
      {
        onSuccess: () => toast.success("Notification Sent", { id: tId }),
        onError: () => toast.error("Failed to notify admin", { id: tId }),
      }
    );
  };

  const assistantEdit = pathname?.startsWith("/admin/master-sheet/client");

  const readOnly = user?.role === "assistant" && !assistantEdit;

  return (
    <div className="space-y-4">
      <div className="bg-white shadow-lg p-6 rounded-xl border border-gray-100 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {dropdownSearch && values && debouncedSearch ? (
            <>
              <div className="w-full md:w-1/3">
                <div className="bg-white rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    User Filter
                  </h3>
                  <TableDropDownSearch
                    listOfDisplayValues={listOfDisplayValues}
                    listOfValues={listOfValues}
                    defaultValue={defaultValue}
                    values={values}
                    onChange={onChange}
                    craft={craft}
                    setSearchUser={setSearchUser}
                    extraStyles={extraStyles}
                    tableu={tableu}
                  />
                </div>
              </div>
              <div className="hidden md:block w-px bg-gray-200 mx-2"></div>
              <div className="w-full md:w-2/3">
                <div className="bg-white rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    Search All Text
                  </h3>
                  <TableExt search={search} debouncedSearch={debouncedSearch} />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-full md:w-1/3">
                {dropdownSearch && values && (
                  <div className="bg-white rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                      User Filter
                    </h3>
                    <TableDropDownSearch
                      listOfDisplayValues={listOfDisplayValues}
                      listOfValues={listOfValues}
                      defaultValue={defaultValue}
                      values={values}
                      onChange={onChange}
                      craft={craft}
                      setSearchUser={setSearchUser}
                      extraStyles={extraStyles}
                      tableu={tableu}
                    />
                  </div>
                )}
              </div>
              <div className="w-full md:w-2/3">
                {debouncedSearch && (
                  <div className="bg-white rounded-lg p-4">
                    <h3 className="text-lg font-medium text-gray-600 mb-2">
                      Search All Text
                    </h3>
                    <TableExt
                      search={search}
                      debouncedSearch={debouncedSearch}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 items-center justify-end pt-4 pb-16">
        {(tableu === ClientTableInformationEnum.Jora ||
          tableu === ClientTableInformationEnum.Indeed ||
          tableu === ClientTableInformationEnum.Reed ||
          tableu === ClientTableInformationEnum.IndeedRecycle ||
          tableu === ClientTableInformationEnum.Jobserve ||
          tableu === ClientTableInformationEnum.Linkedin ||
          tableu === ClientTableInformationEnum.Adzuna ||
          tableu === ClientTableInformationEnum.CareerOne ||
          tableu === ClientTableInformationEnum.Linkedin ||
          tableu === ClientTableInformationEnum.Seek ||
          tableu === ClientTableInformationEnum.WorkforceAustralia ||
          tableu === ClientTableInformationEnum.EscapeCity ||
          tableu === ClientTableInformationEnum.Monster) &&
          showDispatchPreferences &&
          !readOnly && (
            <button
              onClick={() => handleDispatchPreferences(userId)}
              className="bg-blue-500 text-white p-3 hover:bg-blue-600 rounded-md transition-all font-medium text-sm flex items-center justify-center shadow-md"
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
              ) : (
                "Dispatch Preferences"
              )}
            </button>
          )}

        {(tableu === ClientTableInformationEnum.Jora ||
          tableu === ClientTableInformationEnum.Indeed ||
          tableu === ClientTableInformationEnum.Reed ||
          tableu === ClientTableInformationEnum.IndeedRecycle ||
          tableu === ClientTableInformationEnum.Jobserve ||
          tableu === ClientTableInformationEnum.Linkedin ||
          tableu === ClientTableInformationEnum.Adzuna ||
          tableu === ClientTableInformationEnum.CareerOne ||
          tableu === ClientTableInformationEnum.Linkedin ||
          tableu === ClientTableInformationEnum.Seek ||
          tableu === ClientTableInformationEnum.WorkforceAustralia ||
          tableu === ClientTableInformationEnum.EscapeCity ||
          tableu === ClientTableInformationEnum.Monster) &&
          !readOnly && (
            <button
              onClick={() => handleGeneratePassword(userId)}
              className="bg-blue-500 text-white p-3 hover:bg-blue-600 rounded-md transition-all font-medium text-sm flex items-center justify-center shadow-md"
            >
              {isLoading ? (
                <svg
                  className="animate-spin h-5 w-5 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  ></path>
                </svg>
              ) : (
                "Generate Password"
              )}
            </button>
          )}

        {!tableu?.includes("Recycle") && showDispatchCredentials && (
          <button
            onClick={() => handleDispatchCredentials(userId)}
            className="bg-blue-500 text-white p-3 hover:bg-blue-600 rounded-md transition-all font-medium text-sm flex items-center justify-center shadow-md"
          >
            {isLoading ? (
              <svg
                className="animate-spin h-5 w-5 mr-2"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
            ) : (
              "Dispatch Credentials"
            )}
          </button>
        )}

        {tableu === ClientTableInformationEnum.AnsweredQuestions &&
          !clientSide && (
            <button
              onClick={() => handleDispatchQuestions(userId)}
              className={`bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-md transition-all font-medium text-sm shadow-md`}
            >
              Dispatch Questions and Answers
            </button>
          )}

        {tableu === ClientTableInformationEnum.AnsweredQuestions &&
          clientSide && (
            <button
              onClick={() => handleApproveContest(userId, "approve")}
              className={`bg-green-500 hover:bg-green-600 text-white p-3 rounded-md transition-all font-medium text-sm shadow-md`}
            >
              Approve Questions and Answers
            </button>
          )}

        {tableu === ClientTableInformationEnum.AnsweredQuestions &&
          clientSide && (
            <button
              onClick={() => handleApproveContest(userId, "contest")}
              className={`bg-red-500 hover:bg-red-600 text-white p-3 rounded-md transition-all font-medium text-sm shadow-md`}
            >
              Contest Questions and Answers
            </button>
          )}

        {switchProfPrefs && (
          <button
            onClick={handleProfileSwitchpref}
            className={`${
              searchParams?.get("secondary") === "true"
                ? "bg-blue-500 hover:bg-blue-600"
                : "bg-green-500 hover:bg-green-600"
            } text-white p-3 rounded-md transition-all font-medium text-sm shadow-md`}
          >
            Switch to{" "}
            {searchParams?.get("secondary") === "true"
              ? "Primary"
              : "Secondary"}{" "}
            Profile
          </button>
        )}

        {showRegex && (
          <div className="flex gap-4 items-center bg-[#80d7ff] p-3 rounded-md">
            <p className="text-sm font-medium text-black">
              {isClientDetail
                ? "Trigger regex for Client"
                : "Trigger regex for all users"}
            </p>
            <Switch
              value={triggerValue}
              onChange={(value) => {
                setTriggerValue(value);
                if (setRegexIsTriggered) {
                  setRegexIsTriggered(value);
                } else {
                  setRegexTriggered(value);
                }
              }}
            />
          </div>
        )}

        {setEditMode &&
          // @ts-ignore
          session?.user?.role !== "admin" &&
          !(tableu === ClientTableInformationEnum.JobApplications) &&
          !readOnly &&
          // @ts-ignore
          session?.user?.isEditRestricted !== "true" && (
            <div className="flex items-center bg-[#80d7ff] rounded-md p-3">
              <p className="mr-2 text-sm font-medium text-black">
                Allow editing
              </p>
              <Checkbox
                checked={editMode}
                onChange={() => setEditMode(!editMode)}
              />
            </div>
          )}

        {showNotifyAdmin && (
          <button
            onClick={handleNotifyAdmin}
            disabled={isLoadingNotifyAdmin}
            className="bg-green-500 text-white p-3 hover:bg-green-600 rounded-md transition-all font-medium text-sm shadow-md !min-w-[7rem] disabled:cursor-no-drop !disabled:bg-green-500/50 disabled:hover:bg-green-500/50"
          >
            {isLoadingNotifyAdmin ? (
              <FiLoader className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              "Notify Admin"
            )}
          </button>
        )}

        {updateMultipleRows && (
          <button
            onClick={saveMultipleData}
            className="bg-green-500 text-white p-3 hover:bg-green-600 rounded-md transition-all font-medium text-sm shadow-md"
          >
            Save Data
          </button>
        )}

        {setImportDataIsOpen && (
          <button
            onClick={() => setImportDataIsOpen(true)}
            className="bg-[#80d7ff] text-black p-3 rounded-md transition-all font-medium text-sm shadow-md"
          >
            Import Data
          </button>
        )}

        {fillDropdown && (
          <button
            onClick={() => setFillDownIsOpen(true)}
            className="bg-yellow-500 text-white p-3 hover:bg-yellow-600 rounded-md transition-all font-medium text-sm shadow-md"
          >
            Fill Drop Down
          </button>
        )}
      </div>

      <div className="flex space-x-3">
        {select && (
          <div className="flex flex-col">
            {selectTitle && (
              <p className="font-medium text-sm mb-2 text-gray-700">
                {selectTitle}
              </p>
            )}
            <AntSelect
              placeholder="Select Jobsite"
              defaultValue={defaultFilter}
              value={selectedAggregator}
              style={{ width: "220px" }}
              onChange={handleAggregatorChange}
              options={filterValues}
              className="my-4"
            />
          </div>
        )}

        {otherValues && (
          <div className="flex flex-col">
            {otherValuesTitle && (
              <p className="font-medium text-sm mb-2 text-gray-700">
                {otherValuesTitle}
              </p>
            )}
            <AntSelect
              placeholder="Select other data"
              value={selectedOtherData}
              style={{ width: "220px" }}
              onChange={handleOtherDataChange}
              options={otherValues}
              className="my-4"
            />
          </div>
        )}

        {secondFilterValues && (
          <div className="flex flex-col">
            <p className="font-medium text-sm mb-2 text-gray-700">
              {secondFilterPlaceholder}
            </p>
            <AntSelect
              placeholder={secondFilterPlaceholder}
              style={{ width: "220px" }}
              onChange={setSecondFilter}
              options={secondFilterValues}
              className="my-4"
            />
          </div>
        )}

        {thirdFilterValues && (
          <div className="flex flex-col">
            <p className="font-medium text-sm mb-2 text-gray-700">
              {thirdFilterPlaceholder}
            </p>
            <AntSelect
              placeholder={thirdFilterPlaceholder}
              style={{ width: "220px" }}
              onChange={setThirdFilter}
              options={thirdFilterValues}
              className="my-4"
            />
          </div>
        )}

        {aggregatorValues && (
          <div className="flex flex-col">
            <p className="font-medium text-sm mb-2 text-gray-700">
              {aggregatorPlaceholder}
            </p>
            <AntSelect
              placeholder={aggregatorPlaceholder}
              style={{ width: "220px" }}
              onChange={setSortByAggregator}
              options={aggregatorValues}
              className="my-4"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;

function TableExt({ search, debouncedSearch }: any) {
  return (
    <div
      // style={{ boxShadow: ' 0px 2px 2px 0px #00000040' }}
      className="w-full flex p-4 justify-start items-center my-5 rounded-md"
    >
      <div className="flex items-center my-3 justify-end py-3 rounded-md">
        <div className="relative">
          <input
            spellCheck={true}
            type="text"
            className="text-black placeholder-black border-black h-6 w-full sm:w-80 pl-10 pr-4 font-medium text-sm rounded-md py-4 bg-[#F0FBFF] focus:outline-none focus:border-blue-500"
            placeholder="Search..."
            defaultValue={search}
            onChange={(e) => {
              debouncedSearch(e.target.value);
            }}
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <svg
              width="21"
              height="21"
              viewBox="0 0 21 21"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15.5271 14.3477L19.0961 17.9166L17.9176 19.0951L14.3486 15.5262C13.0654 16.5528 11.438 17.167 9.66797 17.167C5.52797 17.167 2.16797 13.807 2.16797 9.66699C2.16797 5.52699 5.52797 2.16699 9.66797 2.16699C13.808 2.16699 17.168 5.52699 17.168 9.66699C17.168 11.437 16.5538 13.0644 15.5271 14.3477ZM13.8552 13.7293C14.8742 12.6792 15.5013 11.2467 15.5013 9.66699C15.5013 6.44408 12.8909 3.83366 9.66797 3.83366C6.44505 3.83366 3.83464 6.44408 3.83464 9.66699C3.83464 12.8899 6.44505 15.5003 9.66797 15.5003C11.2476 15.5003 12.6801 14.8732 13.7303 13.8542L13.8552 13.7293Z"
                fill="#51BAE7"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TableDropDownSearch({
  defaultValue,
  onChange,
  listOfValues,
  values,
  listOfDisplayValues,
  craft,
  setSearchUser,
  extraStyles,
  tableu,
}: {
  defaultValue?: string;
  onChange: any;
  listOfValues: any;
  values: any;
  listOfDisplayValues: any;
  craft?: any;
  setSearchUser?: any;
  extraStyles?: any;
  tableu?: any;
}) {
  const [currentDisplay, setCurrentDisplay] = useState(null);
  const router = useRouter();
  useEffect(() => {
    const newValue =
      listOfDisplayValues[
        listOfValues?.findIndex((e: any) => e == defaultValue) || 0
      ];

    if (newValue !== currentDisplay) {
      // ✅ Only update if value changes
      setCurrentDisplay(newValue);
      if (setSearchUser) {
        setSearchUser(newValue);
      }
    }
  }, [
    listOfValues,
    setSearchUser,
    listOfDisplayValues,
    defaultValue,
    currentDisplay,
  ]); // ✅ Include dependencies carefully

  const styles = {
    control: (base: any) => ({
      ...base,
      fontSize: "14px",
      lineHeight: "20px",
      borderRadius: "7px",
      borderColor: "border-black",
      backgroundColor: "#F0FBFF",
      padding: "4px",
      "&:hover": {
        borderColor: "#38bdf8",
        // boxShadow: '0px 0px 2px #E5E7EB',
      },
    }),

    option: (styles: any, { isFocused, isSelected }: any) => {
      let backgroundColor = null;
      if (isSelected) {
        backgroundColor = "#bae6fd";
      } else if (isFocused) {
        backgroundColor = "#e0f2fe";
      }
      return {
        ...styles,
        backgroundColor,
        color: "black",
      };
    },
  };
  const handleChange = (option: any) => {
    router.push(
      `/admin/master-sheet/client/${option.id}?table=${ClientTableInformationEnum.Seek}&mode=switch`
    );
  };

  const params = useParams();
  useEffect(() => {
    // console.log({ params, currentDisplay });
    // handleChange(params)
  }, [tableu, params, currentDisplay]);

  // Function to sort users alphabetically by label with safety checks
  const sortAlphabetically = (values: any) => {
    if (!Array.isArray(values)) {
      // console.error("Input is not an array:", values);
      return [];
    }

    return values
      .filter((item) => item && item.Full_Name) // Remove invalid entries
      .sort((a, b) => a.Full_Name.localeCompare(b.Full_Name)); // Sort by label
  };

  // Sort the values
  const sorted = sortAlphabetically(values);
  // console.log(sorted)
  // console.log(values)

  return (
    <div
      style={{
        ...(extraStyles || {}),
        // boxShadow: extraStyles?.boxShadow || '0px 2px 2px 0px #00000040',
      }}
      className="p-4 text-black w-full flex flex-col sm:flex-row py-1.5 justify-between items-center my-5 rounded-md "
    >
      <div className="flex items-center my-3 text-black py-3 rounded">
        <div className="w-[200px] sm:w-[300px]">
          <Select
            className="border-none text-black placeholder-black bg-[#F0FBFF]"
            options={sorted}
            onChange={onChange ?? handleChange}
            value={currentDisplay}
            placeholder={currentDisplay}
            styles={styles}
            //  @ts-ignore
            getOptionLabel={(option) => option.Full_Name}
            //  @ts-ignore
            getOptionValue={(option) => option._id}
            menuPortalTarget={document.body}
            menuPosition="absolute"
          />
        </div>
      </div>
      {craft && (
        <div className=" rounded p-3">
          <span className="flex items-center text-black justify-center">
            Craft: {craft?.Craft}
          </span>
        </div>
      )}
    </div>
  );
}
