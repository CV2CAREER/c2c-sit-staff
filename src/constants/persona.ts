export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  coach: "Coach",
  client: "Client",
  guest: "Guest",
  partner: "Partner",
  sales: "Sales",
  cse: "CSE",
  customer: "Customer",
  assistant: "PC",
  probono: "Probono",
  technology: "Technology",
  business: "Business",
  test: "Test",
};

export const getRoleLabel = (role: string | null | undefined): string =>
  role ? (ROLE_LABELS[role] ?? role) : "Not Set";

export const SIGNUP_AS_LABELS: Record<string, string> = {
  Job_Seeker: "Job Seeker",
  Employee: "Employee",
  Channel_Partner: "Channel Partner",
  Ambassador: "Ambassador",
};