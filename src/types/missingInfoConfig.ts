export const missingInfoConfig = {
  Date_of_birth: {
    label: "Date of Birth",
    profileField: "dateOfBirth",
    inputType: "date",
  },

  your_address: {
    label: "Address",
    profileField: "locations",
    inputType: "text",
  },

  preferred_personal_pronouns: {
    label: "Preferred Personal Pronouns",
    profileField: "additionalComments",
    inputType: "select",
    options: ["He/Him", "She/Her", "They/Them"] as const,
  },

  referral_information: {
    label: "Referral Information (Name, Email, Phone Number, Company and Address)",
    profileField: "questions",
    inputType: "text",
  },
} as const;

export type MissingInfoType = keyof typeof missingInfoConfig;
