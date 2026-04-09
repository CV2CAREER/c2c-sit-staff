export interface PromptQuestion {
  value: string | "";
  id: string;
  clientInputs?: {
    label: string;
    type: "text" | "textarea" | "select" | "radio" | "checkbox";
    options?: {
      label: string;
      value: string;
    }[];
  }[];
}

export interface PromptCategory {
  _id: string;
  name: string | "";
  prompts: PromptQuestion[];
}

export interface PromptSimulation {
  _id: string;
  response: string | "";
  createdAt: string;
}

export const NameAIPromptQuestions: PromptQuestion[] = [
  {
    id: "1",
    value: "Kindly respond to the question in {question}",
    clientInputs: [
      {
        label: "question",
        type: "textarea",
      },
    ],
  },
  {
    id: "2",
    value:
      "If there is a requirement to have my actual name in the response use {fullName}.",
    clientInputs: [
      {
        label: "fullName",
        type: "textarea",
      },
    ],
  },
  {
    id: "3",
    value:
      "If the question requires information about my gender, please use the information I have provided in {Gender}. If my response is not an exact match, select the closest option to my {Gender}.",
    clientInputs: [
      {
        label: "Gender",
        type: "select",
      },
    ],
  },
];
export const ResponseOptionsAIPromptQuestions: PromptQuestion[] = [
  {
    id: "4",
    value: "Kindly respond to the question in {question}",
    clientInputs: [
      {
        label: "question",
        type: "textarea",
      },
    ],
  },
  {
    id: "5",
    value:
      "If there is a requirement to have my actual name in the response use {fullName}.",
    clientInputs: [
      {
        label: "fullName",
        type: "textarea",
      },
    ],
  },
  {
    id: "6",
    value:
      "If the question requires information about my gender, please use the information I have provided in {Gender}. If my response is not an exact match, select the closest option to my {Gender}.",
    clientInputs: [
      {
        label: "Gender",
        type: "select",
      },
    ],
  },
];
export const SelectionTypeAIPromptQuestions: PromptQuestion[] = [
  {
    id: "7",
    value: "Kindly respond to the question in {question}",

    clientInputs: [
      {
        label: "question",
        type: "textarea",
      },
    ],
  },
  {
    id: "8",
    value:
      "If there is a requirement to have my actual name in the response use {fullName}.",

    clientInputs: [
      {
        label: "fullName",
        type: "text",
      },
    ],
  },
  {
    id: "8",
    value:
      "If the question requires information about my gender, please use the information I have provided in {Gender}. If my response is not an exact match, select the closest option to my {Gender} and {Worked}.",

    clientInputs: [
      {
        label: "Gender",
        type: "radio",
      },
      {
        label: "Worked",
        type: "checkbox",
      },
    ],
  },
];

export const AIPromptCategories: PromptCategory[] = [
  {
    _id: "1",
    name: "Name",
    prompts: NameAIPromptQuestions,
  },
  {
    _id: "2",
    name: "Selection Type",
    prompts: SelectionTypeAIPromptQuestions,
  },
  {
    _id: "3",
    name: "Response Options",
    prompts: ResponseOptionsAIPromptQuestions,
  },
];

export const CVAIPromptSimulations: PromptSimulation[] = [];
