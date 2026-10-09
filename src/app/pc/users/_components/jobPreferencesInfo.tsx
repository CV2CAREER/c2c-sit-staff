type FieldsType = {
    title: string
    key: string
    inputType: string
    options?: Array<any>
    value: string
    displayValue: string
    format?: (val: number) => string
}

type JobPreferencesType = {
    title: string
    fields: Array<FieldsType>
}


const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
    });
};

const jobPreferencesSchema: Array<JobPreferencesType> = [
    {
        title: "Role Titles",
        fields: [
            {
                title: "Course of Study",
                key: "role",
                inputType: "text",
                options: [],
                value: "",
                displayValue: ""
            },
            {
                title: "Role Titles",
                key: "titles",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            },
            {
                title: "Excluded role titles",
                key: "titlesExcluded",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            },
            {
                title: "Keywords excluded within role title",
                key: "keywordsExcluded",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            }
        ]
    },
    {
        title: "Location",
        fields: [
            {
                title: "Country",
                key: "country",
                inputType: "select",
                options: [],
                value: "",
                displayValue: ""
            },
            {
                title: "Preferred States",
                key: "locations",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            },
            {
                title: "Excluded States",
                key: "stateExcluded",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            },
            {
                title: "Preferred Cities",
                key: "city",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            },
            {
                title: "Excluded Cities",
                key: "cityExcluded",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            }
        ]
    },
    {
        title: "Advertisers",
        fields: [
            {
                title: "Preferred Advertisers",
                key: "advertisers",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            },
            {
                title: "Excluded Advertisers",
                key: "advertisersExcluded",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            }
        ]
    },
    {
        title: "Job Types",
        fields: [
            {
                title: "Preferred Job Types",
                key: "jobTypes",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            },
            {
                title: "Excluded Job Types",
                key: "jobTypesExcluded",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            }
        ]
    },
    {
        title: "Industries",
        fields: [
            {
                title: "Preferred Industries",
                key: "industriesInclude",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            },
            {
                title: "Excluded Industries",
                key: "industriesExclude",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            }
        ]
    },
    {
        title: "Situation",
        fields: [
            {
                title: "Preferred Situation",
                key: "situationIncluded",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            }
        ]
    },
    {
        title: "Classifications",
        fields: [
            {
                title: "Preferred Classifications",
                key: "classifications",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            },
            {
                title: "Excluded Classifications",
                key: "classificationsExcluded",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            }
        ]
    },
    {
        title: "Pay",
        fields: [
            {
                title: "Pay Range",
                key: "payRange",
                inputType: "payRange",
                options: [],
                value: "",
                displayValue: "",
                format: formatCurrency
            }
        ]
    },
    {
        title: "Body & Keywords",
        fields: [
            {
                title: "Body",
                key: "body",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            },
            {
                title: "Excluded Body",
                key: "bodyExcluded",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            },
            {
                title: "Keywords",
                key: "keywords",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            }
        ]
    },
    {
        title: "Working Rights",
        fields: [
            {
                title: "Working Rights",
                key: "workingRight",
                inputType: "multiSelect",
                options: [],
                value: "",
                displayValue: ""
            }
        ]
    },
    {
        title: "Personal Information",
        fields: [
            {
                title: "Veteran Status",
                key: "veteran",
                inputType: "checkbox",
                value: "",
                displayValue: ""
            },
            {
                title: "Marital Status",
                key: "maritalStatus",
                inputType: "text",
                value: "",
                displayValue: ""
            },
            {
                title: "Disability Status",
                key: "disabilityStatus",
                inputType: "text",
                value: "",
                displayValue: ""
            },
            {
                title: "Date of Birth",
                key: "dateOfBirth",
                inputType: "date",
                value: "",
                displayValue: ""
            }
        ]
    },
    {
        title: "Document Settings",
        fields: [
            {
                title: "Cover Letter Included",
                key: "coverletterIncluded",
                inputType: "checkbox",
                value: "",
                displayValue: ""
            },
            {
                title: "Resume Variation Developed",
                key: "isResumeVariationDeveloped",
                inputType: "checkbox",
                value: "",
                displayValue: ""
            },
            {
                title: "AI for Criteria Selection Allowed",
                key: "isAiForCriteriaSelectionAllowed",
                inputType: "checkbox",
                value: "",
                displayValue: ""
            }
        ]
    },
    {
        title: "Additional Information",
        fields: [
            {
                title: "Additional Comments",
                key: "additionalComments",
                inputType: "textarea",
                value: "",
                displayValue: ""
            }
        ]
    }

]

export default jobPreferencesSchema
