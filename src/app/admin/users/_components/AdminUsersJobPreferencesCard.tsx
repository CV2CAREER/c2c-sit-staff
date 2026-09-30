import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineAdjustments } from "react-icons/hi";
import { Section, SubSection } from "./AdminJobPreferenceSections";
import jobPreferencesSchema from "./jobPreferencesInfo";
import { ViewAllRoleTitlesModal } from "./ViewAllRoleTitlesModal";
import CreatableSelect from "react-select/creatable";
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

const formatPayRange = (preferences: any, editedFormData?: any) => {
  const currency = preferences?.currency || "$";
  const min = Number(editedFormData?.minSalary ?? preferences?.minSalary ?? 0);
  const max = Number(editedFormData?.maxSalary ?? preferences?.maxSalary ?? 0);
  const rawPayType = preferences?.payType || preferences?.pay_type || "";
  const payType = rawPayType ? `/${String(rawPayType).replace(/^\//, "")}` : "";

  if (!min && !max) {
    return "N/A";
  }

  if (min && max && min === max) {
    return `${currency}${min.toLocaleString()}${payType}`;
  }

  if (min && max) {
    return `${currency}${min.toLocaleString()} – ${currency}${max.toLocaleString()}${payType}`;
  }

  if (min && !max) {
    return `From ${currency}${min.toLocaleString()}${payType}`;
  }

  if (!min && max) {
    return `Up to ${currency}${max.toLocaleString()}${payType}`;
  }

  return "N/A";
};

const AdminUsersJobPreferencesCard = ({
  preferences,
  userId,
  secondary,
}: IAdminUsersJobPreferencesCardProps) => {
  const [isEditable, setIsEditable] = useState(false);
  const [isRoleTitlesModalOpen, setIsRoleTitlesModalOpen] = useState(false);
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

  const [activeProfile, setActiveProfile] = useState<'primary' | 'secondary'>('primary');
  const activePreferences = activeProfile === 'primary' ? preferences : secondary;

  // Responsive column count (4 desktop, 2 tablet, 1 mobile)
  const [columnCount, setColumnCount] = useState(4);
  useEffect(() => {
    const handleResize = () => {
      if (typeof window === "undefined") return;
      if (window.innerWidth < 640) {
        setColumnCount(1);
      } else if (window.innerWidth < 1024) {
        setColumnCount(2);
      } else {
        setColumnCount(4);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const cardRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [cardHeights, setCardHeights] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    const newHeights: { [key: string]: number } = {};
    let hasChanges = false;
    Object.entries(cardRefs.current).forEach(([key, el]) => {
      if (el) {
        const h = el.offsetHeight || el.getBoundingClientRect().height;
        newHeights[key] = h;
        if (cardHeights[key] !== h) {
          hasChanges = true;
        }
      }
    });
    if (hasChanges) {
      setCardHeights(newHeights);
    }
  });

  const renderSectionCard = (preferenceSection: any) => {
    return (
      <Section key={preferenceSection.title} title={preferenceSection.title}>
        {preferenceSection.fields.map((field: any) => {
          const isTitlesField = field.key === "titles" && preferenceSection.title === "Role Titles";
          const isPayRangeField = field.key === "payRange" || preferenceSection.title === "Pay";
          const titlesList: string[] = isTitlesField
            ? (Array.isArray(editedFormData.titles) ? (editedFormData.titles as string[]) : [])
            : [];

          return (
            <SubSection
              title={field.title}
              key={field.key}
              count={isTitlesField && titlesList.length > 0 ? titlesList.length : undefined}
            >
              {isEditable ? (
                isPayRangeField ? (
                  <div className="flex flex-col gap-3 w-full">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11.5px] text-[#667085] font-medium">Minimum Salary ($)</label>
                      <input
                        type="number"
                        placeholder="Minimum Salary"
                        value={editedFormData.minSalary || ""}
                        onChange={(e) => handleInputChange("minSalary", Number(e.target.value))}
                        className="!text-sm border border-gray-300 rounded-lg w-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11.5px] text-[#667085] font-medium">Maximum Salary ($)</label>
                      <input
                        type="number"
                        placeholder="Maximum Salary"
                        value={editedFormData.maxSalary || ""}
                        onChange={(e) => handleInputChange("maxSalary", Number(e.target.value))}
                        className="!text-sm border border-gray-300 rounded-lg w-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {field.inputType === "text" && (
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
                        className="!text-sm border border-gray-300 rounded-lg w-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
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
                        className="!text-sm border border-gray-300 rounded-lg w-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                        className="!text-sm border border-gray-300 rounded-lg w-full px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
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
                            borderColor: "#D1D5DB",
                            borderRadius: "0.5rem",
                            fontSize: "0.875rem",
                            width: "100%",
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
                            borderColor: "#D1D5DB",
                            borderRadius: "0.5rem",
                            fontSize: "0.875rem",
                            width: "100%",
                          }),
                        }}
                      />
                    )}
                  </>
                )
              ) : isPayRangeField ? (
                <span className="block max-w-full break-words text-[13.5px] font-medium text-gray-900">
                  {formatPayRange(activePreferences, editedFormData)}
                </span>
              ) : isTitlesField ? (
                titlesList.length > 0 ? (
                  <div className="w-full min-w-0">
                    <div className="max-h-[150px] overflow-y-auto pr-1 flex flex-wrap gap-2 mb-2 [scrollbar-width:thin]">
                      {titlesList.map((val: any, idx: number) => (
                        <span
                          key={`${val}-${idx}`}
                          className="inline-flex items-center rounded-md bg-[#F2F4F7] px-2.5 py-1 text-xs font-medium text-[#344054] max-w-full break-words leading-relaxed"
                        >
                          {displayChipValue(val)}
                        </span>
                      ))}
                    </div>
                    {titlesList.length > 4 && (
                      <div className="pointer-events-none -mt-7 mb-2 h-7 bg-gradient-to-b from-transparent to-white" />
                    )}
                    <button
                      type="button"
                      onClick={() => setIsRoleTitlesModalOpen(true)}
                      className="text-[12.5px] font-semibold text-primary hover:underline cursor-pointer inline-flex items-center gap-1 mt-3 mb-1.5 pt-1 transition-colors"
                    >
                      View all {titlesList.length} selections →
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic">N/A</span>
                )
              ) : Array.isArray(field.displayValue) ? (
                field.displayValue?.map?.((val: any, idx: number) => (
                  <span
                    key={`${val}-${idx}`}
                    className="inline-flex items-center rounded-md bg-[#F2F4F7] px-2.5 py-1 text-xs font-medium text-[#344054] max-w-full break-words leading-relaxed"
                  >
                    {displayChipValue(val)}
                  </span>
                ))
              ) : Array.isArray(
                  editedFormData[field.key as keyof AdminPreferencesType],
                ) ? (
                (
                  editedFormData[
                    field.key as keyof AdminPreferencesType
                  ] as []
                ).length > 0 ? (
                  (
                    editedFormData[
                      field.key as keyof AdminPreferencesType
                    ] as []
                  ).map((val: any, idx: number) => (
                    <span
                      key={`${val}-${idx}`}
                      className="inline-flex items-center rounded-md bg-[#F2F4F7] px-2.5 py-1 text-xs font-medium text-[#344054] max-w-full break-words leading-relaxed"
                    >
                      {displayChipValue(val)}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic">N/A</span>
                )
              ) : (
                <span className="block max-w-full break-words text-[13.5px] font-medium text-gray-900 leading-snug">
                  {displayChipValue(
                    editedFormData[field.key as keyof AdminPreferencesType],
                  )}
                </span>
              )}
            </SubSection>
          );
        })}
      </Section>
    );
  };

  const renderQuestionsCard = () => {
    if (!activePreferences?.questions?.length) return null;
    return (
      <Section key="questions" title="Questions">
        <div className="max-h-[260px] overflow-y-auto pr-1 space-y-3 [scrollbar-width:thin]">
          {activePreferences.questions.map((question: any, index: number) => (
            <div key={index} className="pt-2.5 first:pt-0 border-t border-gray-100 first:border-0">
              <p className="break-words font-medium text-[11.5px] text-[#667085]">{question?.question}</p>
              <p className="break-words text-[13.5px] font-medium text-gray-900 mt-0.5">{question?.answer || "N/A"}</p>
            </div>
          ))}
        </div>
      </Section>
    );
  };

  const allCards = useMemo(() => {
    const cards: Array<{ key: string; estimatedHeight: number; element: React.ReactNode }> = [];

    jobPreferencesSchema.forEach((section) => {
      let estHeight = 160 + (section.fields?.length || 1) * 45;
      if (section.title === "Role Titles") estHeight = 280;
      else if (section.title === "Location") estHeight = 260;
      else if (section.title === "Industries") estHeight = 200;
      else if (section.title === "Personal Information") estHeight = 240;
      else if (section.title === "Document Settings") estHeight = 180;

      cards.push({
        key: section.title,
        estimatedHeight: estHeight,
        element: renderSectionCard(section),
      });
    });

    if (activePreferences?.questions?.length > 0) {
      cards.push({
        key: "Questions",
        estimatedHeight: 220,
        element: renderQuestionsCard(),
      });
    }

    return cards;
  }, [
    jobPreferencesSchema,
    editedFormData,
    isEditable,
    activePreferences,
  ]);

  // True masonry: pack each card into whichever column currently has the least cumulative height
  const columns = useMemo(() => {
    const cols: Array<{ key: string; element: React.ReactNode }[]> = Array.from(
      { length: columnCount },
      () => [],
    );
    const colHeights = new Array(columnCount).fill(0);

    allCards.forEach((card) => {
      const h = cardHeights[card.key] || card.estimatedHeight;
      let minIdx = 0;
      let minH = colHeights[0];
      for (let i = 1; i < columnCount; i++) {
        if (colHeights[i] < minH) {
          minH = colHeights[i];
          minIdx = i;
        }
      }
      cols[minIdx].push(card);
      colHeights[minIdx] += h;
    });

    return cols;
  }, [allCards, columnCount, cardHeights]);

  return (
    <div className="relative w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-[0_1px_10px_rgba(0,142,211,0.06)] md:p-6">
      {/* Top Header with title and clean Edit/Save/Cancel controls */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <HiOutlineAdjustments size={18} />
          </span>
          <h3 className="font-semibold text-lg md:text-xl text-gray-900">Preferences</h3>
        </div>

        <div className="flex items-center gap-3">
          {!isEditable ? (
            <Button
              onClick={() => {
                setIsEditable(true);
              }}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-white font-medium px-4 py-2 rounded-lg"
            >
              Edit Preferences
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => {
                  setIsEditable(false);
                }}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={updateUserPreferencesByProfileMutation.isPending}
                onClick={() => {
                  updateUserPreferencesByProfileMutation.mutate({
                    userId,
                    profileType: activeProfile,
                    body: editedFormData,
                  });
                  setIsEditable(false);
                }}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {updateUserPreferencesByProfileMutation.isPending
                  ? "Saving..."
                  : "Save Changes"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {secondary && (
        <div className="relative mb-5 inline-flex gap-1 rounded-full bg-career-gray-300 p-1">
          {(["primary", "secondary"] as const).map((profile) => (
            <button
              key={profile}
              onClick={() => setActiveProfile(profile)}
              className={`relative z-10 rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors duration-200 ${
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

      {/* Shortest-column-first masonry layout */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeProfile}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="flex flex-row items-start gap-4 my-2 w-full"
        >
          {columns.map((colCards, colIdx) => (
            <div key={colIdx} className="flex-1 min-w-0 flex flex-col gap-4">
              {colCards.map((card) => (
                <div
                  key={card.key}
                  ref={(el) => {
                    cardRefs.current[card.key] = el;
                  }}
                  className="w-full min-w-0"
                >
                  {card.element}
                </div>
              ))}
            </div>
          ))}
        </motion.div>
      </AnimatePresence>

      <ViewAllRoleTitlesModal
        isOpen={isRoleTitlesModalOpen}
        onClose={() => setIsRoleTitlesModalOpen(false)}
        titles={Array.isArray(editedFormData.titles) ? (editedFormData.titles as string[]) : []}
      />
    </div>
  );
};

export default AdminUsersJobPreferencesCard;

const parseIfJsonObject = (val: any) => {
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      try {
        return JSON.parse(trimmed);
      } catch {
        return val;
      }
    }
  }
  return val;
};

const displayChipValue = (val: any) => {
  const parsed = parseIfJsonObject(val);

  if (parsed === null || parsed === undefined || parsed === "") {
    return "N/A";
  } else if (typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed.name || "N/A";
  } else if (typeof parsed === "boolean") {
    return parsed === true ? "Yes" : "No";
  } else if (typeof parsed === "number") {
    return parsed;
  } else if (typeof parsed === "string") {
    return parsed;
  }
  return "N/A";
};
