import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineAdjustments } from "react-icons/hi";
import { Section, SubSection } from "./AdminJobPreferenceSections";
import jobPreferencesSchema from "./jobPreferencesInfo";
import CreatableSelect from "react-select/creatable";
import { Chip } from "@material-tailwind/react";
import { AdminPreferencesType } from "@/types/admin";
import { Button } from "@/components/ui/button";
import { GroupBase, OptionsOrGroups } from "react-select";
import { useAdminMutations } from "@/hooks/api/admin.api";
import { useQueryClient } from "@tanstack/react-query";

interface IAdminUsersJobPreferencesCardProps {
  preferences: any;
  userId: string;
  secondary?: any;
}

const AdminUsersJobPreferencesCard = ({
  preferences,
  userId,
  secondary
}: IAdminUsersJobPreferencesCardProps) => {
  const [isEditable, setIsEditable] = useState(false);
  const queryClient = useQueryClient();

  const handleInputChange = (field: any, value: any) => {
    setEditedFormData((prev) => ({ ...prev, [field]: value }));
  };

  const { updateUserPreferencesByProfileMutation } = useAdminMutations();

  const [editedFormData, setEditedFormData] = useState<AdminPreferencesType>({
    role: preferences?.role || "",
    titles: preferences?.titles || [],
    titlesExcluded: preferences?.titlesExcluded || [],
    keywords: preferences?.keywords || [],
    keywordsExcluded: preferences?.keywordsExcluded || [],
    advertisers: preferences?.advertisers || [],
    advertisersExcluded: preferences?.advertisersExcluded || [],
    jobTypes: preferences?.jobTypes || [],
    jobTypesExcluded: preferences?.jobTypesExcluded || [],
    minSalary: Math.trunc(preferences?.minSalary || 0),
    maxSalary: Math.trunc(preferences?.maxSalary || 0),
    classifications: preferences?.classifications || [],
    classificationsIncluded: preferences?.classificationsIncluded || [],
    classificationsExcluded: preferences?.classificationsExcluded || [],
    workingRight: preferences?.workingRight || [],
    country: preferences?.country || "",
    city: preferences?.locations || [],
    locations: preferences?.municipals || [],
    stateExcluded: preferences?.municipalsExcluded || [],
    cityExcluded: preferences?.stateExcluded || [],
    body: preferences?.body || [],
    bodyExcluded: preferences?.bodyExcluded || [],
    coverletterIncluded: preferences?.coverletterIncluded || false,
    isResumeVariationDeveloped:
      preferences?.isResumeVariationDeveloped || false,
    isAiForCriteriaSelectionAllowed:
      preferences?.isAiForCriteriaSelectionAllowed || false,
    veteran: preferences?.veteran || false,
    additionalComments: preferences?.additionalComments || "",
    socialSecurityNumber: preferences?.socialSecurityNumber || "",
    taxIdentificationNumber: preferences?.taxIdentificationNumber || "",
    maritalStatus: preferences?.maritalStatus || "",
    disabilityStatus: preferences?.disabilityStatus || "",
    dateOfBirth: preferences?.dateOfBirth || "",
    questions: preferences?.questions || [],
    industries: preferences?.industries || [],
    industriesInclude: preferences?.industriesInclude || [],
    industriesExclude: preferences?.industriesExclude || [],
    industriesIncluded: preferences?.industriesIncluded || [],
    industriesExcluded: preferences?.industriesExcluded || [],
    situationIncluded: preferences?.situationIncluded || [],
    situationExcluded: preferences?.situationExcluded || [],
    includedJobTitles: preferences?.includedJobTitles || [],
  });

  // console.log(editedFormData);
  // console.log(editedFormData.veteran)

  const [activeProfile, setActiveProfile] = useState<'primary' | 'secondary'>('primary');
  
  const activePreferences = activeProfile === 'primary' ? preferences : secondary;

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-primary/15 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.10)] md:p-8">
      <div className="flex items-center gap-3 mb-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <HiOutlineAdjustments size={20} />
        </span>
        <h3 className="font-medium text-xl md:text-2xl">Preferences</h3>
      </div>

      {secondary && (
        <div className="relative mb-6 inline-flex gap-1 rounded-full bg-career-gray-300 p-1">
          {(["primary", "secondary"] as const).map((profile) => (
            <button
              key={profile}
              onClick={() => setActiveProfile(profile)}
              className={`relative z-10 rounded-full px-4 py-2 font-medium capitalize transition-colors duration-200 ${
                activeProfile === profile
                  ? "text-white"
                  : "text-career-gray-200 hover:text-career-black-200"
              }`}
            >
              {activeProfile === profile && (
                <motion.span
                  layoutId="preferences-tab-highlight"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className="absolute inset-0 -z-10 rounded-full bg-primary shadow-sm"
                />
              )}
              {profile} Profile
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
      <motion.div
        key={activeProfile}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 my-4 gap-y-8"
      >
        {jobPreferencesSchema.map((preferenceSection) => (
          <Section
            key={preferenceSection.title}
            title={preferenceSection.title}
          >
            {preferenceSection.fields.map((field) => (
              <SubSection title={field.title} key={field.key}>
                {isEditable ? (
                  <>
                    {field.inputType === "text" && (
                      <>
                        <input
                          type="text"
                          placeholder={field.title}
                          value={
                            editedFormData[
                              field.key as string as keyof AdminPreferencesType
                            ] as string
                          }
                          onChange={(e) =>
                            handleInputChange(
                              field.key as keyof AdminPreferencesType,
                              e.target.value,
                            )
                          }
                          className="!text-base border-[1.5px] border-black rounded-[0.25rem] w-full sm:max-w-[300px] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E86FF] focus:border-transparent"
                        />
                      </>
                    )}
                    {field.inputType === "textarea" && (
                      <textarea
                        placeholder={field.title}
                        value={
                          editedFormData[
                            field.key as string as keyof AdminPreferencesType
                          ] as string
                        }
                        onChange={(e) =>
                          handleInputChange(
                            field.key as keyof AdminPreferencesType,
                            e.target.value,
                          )
                        }
                        className="!text-base border-[1.5px] border-black rounded-[0.25rem] w-full sm:max-w-[300px] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E86FF] focus:border-transparent"
                        rows={3}
                      />
                    )}
                    {field.inputType === "date" && (
                      <input
                        type="date"
                        value={
                          editedFormData[
                            field.key as string as keyof AdminPreferencesType
                          ] as string
                        }
                        onChange={(e) =>
                          handleInputChange(
                            field.key as keyof AdminPreferencesType,
                            e.target.value,
                          )
                        }
                        className="!text-base border-[1.5px] border-black rounded-[0.25rem] w-full sm:max-w-[300px] px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#1E86FF] focus:border-transparent"
                      />
                    )}
                    {field.inputType === "checkbox" && (
                      <input
                        type="checkbox"
                        checked={
                          editedFormData[
                            field.key as unknown as keyof AdminPreferencesType
                          ] as boolean
                        }
                        onChange={(e) =>
                          handleInputChange(field.key, e.target.checked)
                        }
                        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    )}
                    {(field.inputType === "select" ||
                      field.inputType === "salarySelect") && (
                      <CreatableSelect
                        options={
                          (field.options ?? []) as unknown as OptionsOrGroups<
                            any,
                            GroupBase<any>
                          >
                        }
                        onChange={(option: any) =>
                          handleInputChange(
                            field.key,
                            field.inputType === "salarySelect"
                              ? option.value / 1000
                              : option.value,
                          )
                        }
                        value={field?.options?.find(
                          (opt: any) =>
                            opt.value ===
                            (field.inputType === "salarySelect"
                              ? field.value
                              : field.value),
                        )}
                        formatOptionLabel={
                          field.format
                            ? ({ label }) => `$${label.toLocaleString()}`
                            : undefined
                        }
                        styles={{
                          control: (provided) => ({
                            ...provided,
                            borderColor: "black",
                            borderWidth: "1.5px",
                            borderRadius: "0.25rem",
                            width: "100%",
                            maxWidth: "300px",
                          }),
                        }}
                      />
                    )}
                    {field.inputType === "multiSelect" && (
                      <CreatableSelect
                        isMulti
                        options={field.options}
                        onChange={(options: any) =>
                          handleInputChange(
                            field.key,
                            options?.map?.((opt: any) => opt.value),
                          )
                        }
                        value={
                          Array.isArray(
                            editedFormData[
                              field.key as keyof AdminPreferencesType
                            ],
                          )
                            ? (
                                editedFormData[
                                  field.key as keyof AdminPreferencesType
                                ] as []
                              )?.map?.((val: any) => {
                                if (typeof val === "object") {
                                  return { label: val.name, value: val };
                                }
                                return { label: val, value: val };
                              })
                            : []
                        }
                        styles={{
                          control: (provided) => ({
                            ...provided,
                            borderColor: "black",
                            borderWidth: "1.5px",
                            borderRadius: "0.25rem",
                            width: "100%",
                            maxWidth: "300px",
                          }),
                        }}
                      />
                    )}
                  </>
                ) : Array.isArray(field.displayValue) ? (
                  field.displayValue?.map?.((val: any) => (
                    <Chip
                      key={val}
                      value={
                        typeof val === "object"
                          ? `${val.name} (${val.id})`
                          : val?.length >= 28
                            ? val.substring(0, 27) + "..."
                            : val
                      }
                      variant="ghost"
                      size="sm"
                      className="!text-xs text-[#797979] !font-normal !capitalize"
                    />
                  ))
                ) : Array.isArray(
                    editedFormData[field.key as keyof AdminPreferencesType],
                  ) ? (
                  (
                    editedFormData[
                      field.key as keyof AdminPreferencesType
                    ] as []
                  )?.map((val: any) => (
                    <div key={val} className="bg-[#E7E7E9] rounded -ml-2 p-1">
                      <Chip
                        value={displayChipValue(val)}
                        variant="ghost"
                        size="sm"
                        className="rounded !text-xs bg-[#D1D1D5] p-1 px-2 text-[#797979] !font-normal !capitalize"
                      />
                    </div>
                  ))
                ) : (
                  displayChipValue(
                    editedFormData[field.key as keyof AdminPreferencesType],
                  )
                )}
              </SubSection>
            ))}
          </Section>
        ))}

        {/* Questions section not editable just display since its personal and only editable by client */}
        {activePreferences?.questions?.length > 0 && (
          <div>
            <h3 className="font-medium text-2xl">Questions</h3>
            {activePreferences?.questions.map((question: any, index: number) => (
              <div key={index} className="-ml-2 p-1">
                <p>{question?.question}</p>
                <p>{question?.answer}</p>
              </div>
            ))}
          </div>
        )}
      </motion.div>
      </AnimatePresence>
      {!isEditable ? (
        <Button
          onClick={() => {
            setIsEditable(true);
          }}
        >
          Edit
        </Button>
      ) : (
        <div className="flex justify-start gap-3">
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              setIsEditable(false);
              // setIsLoading(false);
            }}
            className="border-primary/20 text-primary transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          >
            Cancel
          </Button>
          <Button
            disabled={updateUserPreferencesByProfileMutation.isPending}
            onClick={() => {
              updateUserPreferencesByProfileMutation.mutate({
                userId,
                profileType: activeProfile,
                body: editedFormData,
              });
              setIsEditable(false);
            }}
          >
            {updateUserPreferencesByProfileMutation.isPending
              ? "Saving..."
              : "Save Changes"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default AdminUsersJobPreferencesCard;

const displayChipValue = (val: any) => {
  if (typeof val === "object") {
    return `${val.name} (${val.id})`;
  } else if (typeof val === "boolean") {
    return val === true ? "Yes" : "No";
  } else if (typeof val === "number") {
    return val;
  } else if (typeof val === "string") {
    return val?.length >= 28 ? val.substring(0, 27) + "..." : val;
  }
};
