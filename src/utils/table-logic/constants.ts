export const order = [
  "CustomerId",
  "generatePassword",
  "actions",
  "flight",
  "id",
  "Full_Name",
  "First_Name",
  "Last_Name",
];

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
