import {
  House,
  SlidersHorizontal,
  Users,
  Network,
  PiggyBank,
  Briefcase,
  UserRoundPlus,
  Star,
  Bot,
  Folders,
  NotebookPen,
  Binoculars,
  FileUser,
  Layers,
  Mail,
  FileSearch2,
  ScanEye,
  ArrowLeftRight,
  MonitorCog,
  Newspaper,
  Presentation,
  Settings,
  User,
  Calendar,
  CalendarCheck,
  Trophy,
  Contact,
  Headphones,
  FileText,
  KeyRound,
  ListChecks,
  ClipboardList,
  Bug,
  AlertTriangle,
  DollarSign,
  Megaphone,
  Target,
} from "lucide-react";
// import { IconType } from "react-icons";
import { SiSlack } from "react-icons/si";

export type NavRole = "admin" | "assistant" | "partner" | "coach" | "cse" | "sales" | "technology" | "business" | "client" | "cec";

export type NavAction = "switch-admin" | "switch-persona-target";

export interface NavChild {
  name: string;
  href: string;
  icon: any;
  role?: NavRole; // for switch persona
  action?: NavAction;
  badge?: string | number;
  children?: NavChild[];
}

export interface NavLink {
  name: string;
  href?: string;
  icon: any;
  groupId?: number;
  access?: NavRole[];
  role?: NavRole;
  action?: NavAction;
  badge?: string | number;
  children?: NavChild[];
}

export const ADMIN_NAV_LINKS: NavLink[] = [
  { name: "Home", href: "/admin/dashboard", icon: House },
  { name: "Status Report", href: "/admin/status-report", icon: SlidersHorizontal },
  { name: "Personal Info", href: "/admin/profile", icon: User },
  {
    name: "Profiles",
    groupId: 1,
    icon: Users,
    access: ["admin", "assistant"],
    children: [
      { name: "Users", href: "/admin/users", icon: Users },
      { name: "Campaign", href: "/admin/campaign-mgt", icon: Users },
      { name: "Client Sample", href: "/admin/client-sample", icon: Users },
    ],
  },
  {
    name: "Management",
    groupId: 2,
    icon: Network,
    access: ["admin"],
    children: [
      { name: "Revenue Mgt.", href: "/admin/pricing", icon: PiggyBank },
      { name: "Jobsite Mgt.", href: "/admin/jobsite-management", icon: Briefcase },
      { name: "Jobsite Credentials", href: "/admin/jobsite-credentials", icon: KeyRound },
      { name: "Unsubscribed Users", href: "/admin/unsubscribed-users", icon: Users },
      { name: "Referral Mgt.", href: "/admin/referral-management", icon: UserRoundPlus },
      { name: "Promotional Mgt.", href: "/admin/promotion", icon: Star },
      { name: "Blog", href: "/admin/blog", icon: Newspaper },
    ],
  },
  {
    name: "AI Prompts",
    href: "/admin/prompts",
    icon: Bot,
    access: ["admin"],
  },
  {
    name: "Trackers",
    groupId: 4,
    icon: NotebookPen,
    access: ["admin", "assistant"],
    children: [
      { name: "Training Tracker", href: "/admin/training-tracker", icon: Presentation },
      { name: "CR Tracking", href: "/admin/cr-tracking", icon: User },
      { name: "Sales Operation", href: "/admin/sales-operation", icon: Folders },
    ],
  },
  {
    name: "Job Mgt",
    groupId: 5,
    icon: Briefcase,
    access: ["admin", "assistant"],
    children: [
      { name: "Job Discovery", href: "/admin/job-preference", icon: Binoculars },
      { name: "Applications", href: "/admin/job-applications", icon: FileUser },
    ],
  },
  {
    name: "System Controls",
    groupId: 6,
    icon: MonitorCog,
    access: ["admin"],
    children: [
      { name: "Access Levels", href: "/admin/access-levels", icon: Users },
      { name: "Logs", href: "/admin/logs", icon: Layers },
      { name: 'Persona Settings', href: '/admin/switch-persona-settings', icon: Settings },
    ],
  },
  {
    name: "Communication",
    icon: Mail,
    groupId: 8,
    access: ["admin", "assistant"],
    children: [
      { name: "Train Chatbot", href: "/admin/communication/chatbot-trainer", icon: Bot },
      { name: "Chatbot Logs", href: "/admin/communication/chatbot-logs", icon: Bot },
      { name: "Human Support", href: "/admin/communication/human-support", icon: User },
      { name: "Emails", href: "/admin/communication-templates", icon: Mail },
      { name: "Content", href: "/admin/communication/client-content", icon: FileText },
      { name: "Preference Questions", href: "/admin/preference-questions", icon: ListChecks },
      { name: "Dropdown Options", href: "/admin/dropdown-options", icon: SlidersHorizontal },
      { name: "Missing Information", href: "/admin/missing-info-templates", icon: FileText },
      { name: "JustCall", href: "/admin/justcall", icon: Layers },
      { name: "Slack", href: "/admin/slack", icon: SiSlack },
    ],
  },
  { name: "Audit Trail", href: "/admin/audit-trail", icon: FileSearch2, access: ["admin"] },
  { name: "View As User", href: "/admin/view-as-user", icon: ScanEye, access: ["admin", "assistant"] },
  {
    name: "Switch Persona",
    groupId: 7,
    icon: ArrowLeftRight,
    access: ["admin"],
    children: [
      { name: "Partner", role: "partner", href: "/partner/dashboard", icon: User },
      { name: "Sales", role: "sales", href: "/sales/dashboard", icon: User },
      { name: "Client", role: "client", href: "#", icon: User },
      { name: "Technology", role: "technology", href: "/technology/dashboard", icon: User },
      { name: "Business", role: "business", href: "/business/dashboard", icon: User },
      { name: "Coach", role: "coach", href: "/coach/dashboard", icon: User },
      { name: "Customer", role: "cse", href: "/cse/dashboard", icon: User },
      { name: "Placement Controller", role: "assistant", href: "/assistant/dashboard", icon: User },
      { name: "CEC", role: "cec", href: "/cec/dashboard", icon: User },
    ],
  },
];

export const ASSISTANT_NAV_LINKS: NavLink[] = [
  { name: "Home", href: "/assistant/dashboard", icon: House },
  { name: "Personal Info", href: "/assistant/profile", icon: User },
  {
    name: "Profiles",
    groupId: 1,
    icon: Users,
    access: ["admin", "assistant"],
    children: [
      { name: "Users", href: "/assistant/users", icon: Users },
      { name: "Campaign", href: "/assistant/campaign-mgt", icon: Users },
      { name: "Client Sample", href: "/assistant/client-sample", icon: Users },
    ],
  },
  {
    name: "Job Mgt",
    groupId: 5,
    icon: Briefcase,
    access: ["admin", "assistant"],
    children: [
      { name: "Job Discovery", href: "/assistant/job-preference", icon: Binoculars },
      { name: "Applications", href: "/assistant/job-applications", icon: FileUser },
    ],
  },
  {
    name: "Communication",
    icon: Mail,
    groupId: 8,
    access: ["admin", "assistant"],
    children: [
      { name: "Train Chatbot", href: "/assistant/communication/chatbot-trainer", icon: Bot },
      { name: "Chatbot Logs", href: "/assistant/communication/chatbot-logs", icon: Bot },
      { name: "Human Support", href: "/assistant/communication/human-support", icon: User },
      { name: "Emails", href: "/assistant/communication-templates", icon: Mail },
      { name: "Content", href: "/assistant/communication/client-content", icon: FileText },
      { name: "Missing Information", href: "/admin/missing-info-templates", icon: FileText },
      { name: "JustCall", href: "/assistant/justcall", icon: Layers },
      { name: "Slack", href: "/assistant/slack", icon: SiSlack },
    ],
  },
  { name: "View As User", href: "/assistant/view-as-user", icon: ScanEye, access: ["admin", "assistant"] },
  { name: "Switch to Admin", href: "/admin/dashboard", icon: ArrowLeftRight, action: "switch-admin" },
];

export const PARTNER_NAV_LINKS: NavLink[] = [
  { name: "Home", href: "/partner/dashboard", icon: House },
  { name: "Personal Info", href: "/partner/profile", icon: User },
  { name: "Switch to Admin", href: "/admin/dashboard", icon: ArrowLeftRight, action: "switch-admin" },
];

export const COACH_NAV_LINKS: NavLink[] = [
  { name: "Home", href: "/coach/dashboard", icon: House },
  { name: "Scheduling", href: "/coach/scheduling", icon: Calendar },
  { name: "Grading", href: "/coach/grading", icon: Trophy },
  // { name: "Client Availabilities", href: "/coach/client-availabilities", icon: CalendarCheck },
  { name: "Personal Info", href: "/coach/profile", icon: User },
  { name: "Training Tracker", href: "/coach/training-tracker", icon: Contact },
  { name: "Referrals", href: "/coach/referrals", icon: Users },
  { name: "Switch to Admin", href: "/admin/dashboard", icon: ArrowLeftRight, action: "switch-admin" },
];

export const SALES_NAV_LINKS: NavLink[] = [
  { name: "Home", href: "/sales/dashboard", icon: House },
  { name: "Personal Info", href: "/sales/profile", icon: User },
  { name: "Switch to Admin", href: "/admin/dashboard", icon: ArrowLeftRight, action: "switch-admin" },
];

export const CEC_NAV_LINKS: NavLink[] = [
  { name: "Home", href: "/cec/dashboard", icon: House },
  {
    name: "Trackers",
    groupId: 1,
    icon: NotebookPen,
    access: ["cec"],
    children: [
      { name: "Daily Log", href: "/cec/daily-log", icon: ClipboardList },
      { name: "Issue Burndown", href: "/cec/issue-burndown", icon: Bug },
      { name: "Complaints", href: "/cec/complaints", icon: AlertTriangle },
      { name: "Referral Payouts", href: "/cec/referral-payouts", icon: DollarSign },
      { name: "Sales Outreach", href: "/cec/sales-outreach", icon: Megaphone },
      { name: "Ambassador Scouting", href: "/cec/ambassador-scouting", icon: Target },
    ],
  },
  { name: "Personal Info", href: "/cec/profile", icon: User },
  { name: "Switch to Admin", href: "/admin/dashboard", icon: ArrowLeftRight, action: "switch-admin" },
];

export const CSE_NAV_LINKS: NavLink[] = [
  { name: "Home", href: "/cse/dashboard", icon: House },
  { name: "Personal Info", href: "/cse/profile", icon: User },
  { name: "Switch to Admin", href: "/admin/dashboard", icon: ArrowLeftRight, action: "switch-admin" },
];

export const NAV_LINKS_BY_ROLE: Record<string, NavLink[]> = {
  admin: ADMIN_NAV_LINKS,
  coach: COACH_NAV_LINKS,
  assistant: ASSISTANT_NAV_LINKS,
  sales: SALES_NAV_LINKS,
  cse: CSE_NAV_LINKS,
  partner: PARTNER_NAV_LINKS,
  cec: CEC_NAV_LINKS,
};
