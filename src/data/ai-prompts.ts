export interface PromptQuestion {
  categoryId?: string | "";
  category?: PromptCategory;
  value: string | "";
  _id: string;
  clientInputs?: PromptClientInput[];
  params?: string[];
}

export interface PromptClientInput {
  label: string;
  type: "text" | "textarea" | "select" | "radio" | "checkbox";
  options?: {
    label: string;
    value: string;
  }[];
}

export interface PromptVCS {
  prompts: PromptQuestion[];
  mode: "direct" | "sample";
  value: string;
  _id: string;
}

export type InterviewPrepPromptQuestion = {
  type: "question" | "answer";
  input: string | "";
  value: string | "";
};

export type InterviewPrepPromptState = {
  _id: string | "";
  promptQuestion?: InterviewPrepPromptQuestion;
  promptAnswer?: InterviewPrepPromptQuestion;
  new: boolean;
  version: number;
  createdAt: string | "";
};

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

export type InterviewPrepPromptSimulation = PromptSimulation;

export const NameAIPromptQuestions: PromptQuestion[] = [
  {
    _id: "1",
    value: "Kindly respond to the question in {question}",
    clientInputs: [
      {
        label: "question",
        type: "textarea",
      },
    ],
  },
  {
    _id: "2",
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
    _id: "3",
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
    _id: "4",
    value: "Kindly respond to the question in {question}",
    clientInputs: [
      {
        label: "question",
        type: "textarea",
      },
    ],
  },
  {
    _id: "5",
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
    _id: "6",
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
    _id: "7",
    value: "Kindly respond to the question in {question}",

    clientInputs: [
      {
        label: "question",
        type: "textarea",
      },
    ],
  },
  {
    _id: "8",
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
    _id: "8",
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

export const AIPromptSimulations: PromptSimulation[] = [];
