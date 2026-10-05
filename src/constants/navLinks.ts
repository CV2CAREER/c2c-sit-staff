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
  CircleHelp,
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
  Trophy,
  Contact,
  Headphones,
  FileText,
  KeyRound,
  ListChecks,
  Target,
  LayoutDashboard,
  TrendingUp,
  ClipboardList,
  AlertTriangle,
  ShieldCheck,
  Bug,
  DollarSign,
  Megaphone,
} from "lucide-react";
// import { IconType } from "react-icons";
import { SiSlack } from "react-icons/si";

export type NavRole = "admin" | "assistant" | "partner" | "coach" | "cse" | "client" | "guest" | "ambassador";

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
      { name: "Unsubscribed Users", href: "/admin/unsubscribed-users", icon: Users },
      { name: "Referral Mgt.", href: "/admin/referral-management", icon: UserRoundPlus },
      { name: "Verifications", href: "/admin/verifications", icon: ShieldCheck },
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
    name: "CEC",
    groupId: 10,
    icon: Headphones,
    access: ["admin", "assistant"],
    children: [
      // { name: "CEC Dashboard", href: "/admin/cec/dashboard", icon: LayoutDashboard },
      { name: "Daily Log", href: "/admin/cec/daily-log", icon: ClipboardList },
      { name: "Issue Burndown", href: "/admin/cec/issue-burndown", icon: Bug },
      { name: "Complaints", href: "/admin/cec/complaints", icon: AlertTriangle },
      { name: "Referral Payouts", href: "/admin/cec/referral-payouts", icon: DollarSign },
      { name: "Sales Outreach", href: "/admin/cec/sales-outreach", icon: Megaphone },
      { name: "Ambassador Scouting", href: "/admin/cec/ambassador-scouting", icon: Target },
    ],
  },
  {
    name: "Job Mgt",
    groupId: 5,
    icon: Briefcase,
    access: ["admin", "assistant"],
    children: [
      { name: "Job Discovery", href: "/admin/job-preference", icon: Binoculars },
      { name: "AI Discovery Agent", href: "/admin/ai-discovery-agent", icon: Bot },
      { name: "Applications", href: "/admin/job-applications", icon: FileUser },
    ],
  },
  {
    name: "Placement Management",
    groupId: 9,
    icon: Target,
    access: ["admin"],
    children: [
      { name: "Overview", href: "/admin/placement-management/overview", icon: LayoutDashboard },
      { name: "Placement Performance", href: "/admin/placement-management/performance", icon: TrendingUp },
      { name: "Assignments", href: "/admin/placement-management/assignments", icon: ClipboardList },
      { name: "Exceptions", href: "/admin/placement-management/exceptions", icon: AlertTriangle },
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
      { name: "Chatbot Logs", href: "/admin/communication/chatbot-logs", icon: Bot },
      { name: "Human Support", href: "/admin/communication/human-support", icon: User },
      { name: "FAQ", href: "/admin/communication/faq", icon: CircleHelp },
      { name: "Emails", href: "/admin/communication-templates", icon: Mail },
      { name: "Content", href: "/admin/communication/client-content", icon: FileText },
      { name: "Preference Questions", href: "/admin/preference-questions", icon: ListChecks },
      { name: "Dropdown Options", href: "/admin/dropdown-options", icon: SlidersHorizontal },
      { name: "Missing Information", href: "/admin/missing-information", icon: FileText },
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
      // Client/Guest/Ambassador have no staff FE dashboards — the switcher
      // deep-links to the customer FE. Admin still needs to be signed in
      // there separately; a true impersonation handoff (short-lived token
      // → customer FE session) is a follow-up feature.
      { name: "Client", role: "client", href: `${process.env.NEXT_PUBLIC_CUSTOMER_URL ?? ""}/dashboard`, icon: User },
      { name: "Guest", role: "guest", href: `${process.env.NEXT_PUBLIC_CUSTOMER_URL ?? ""}/dashboard`, icon: User },
      { name: "Ambassador", role: "ambassador", href: `${process.env.NEXT_PUBLIC_CUSTOMER_URL ?? ""}/dashboard`, icon: User },
      { name: "Coach", role: "coach", href: "/coach/dashboard", icon: User },
      // { name: "CSE", role: "cse", href: "/cse/dashboard", icon: User },
      { name: "Placement Controller", role: "assistant", href: "/pc/dashboard", icon: User },
    ],
  },
];

export const ASSISTANT_NAV_LINKS: NavLink[] = [
  { name: "Home", href: "/pc/dashboard", icon: House },
  { name: "Personal Info", href: "/pc/profile", icon: User },
  {
    name: "Profiles",
    groupId: 1,
    icon: Users,
    access: ["admin", "assistant"],
    children: [
      { name: "Users", href: "/pc/users", icon: Users },
      { name: "Campaign", href: "/pc/campaign-mgt", icon: Users },
      { name: "Client Sample", href: "/pc/client-sample", icon: Users },
    ],
  },
  {
    name: "Job Mgt",
    groupId: 5,
    icon: Briefcase,
    access: ["admin", "assistant"],
    children: [
      { name: "Job Discovery", href: "/pc/job-preference", icon: Binoculars },
      { name: "Applications", href: "/pc/job-applications", icon: FileUser },
    ],
  },
  {
    name: "Communication",
    icon: Mail,
    groupId: 8,
    access: ["admin", "assistant"],
    children: [
      { name: "Chatbot Logs", href: "/pc/communication/chatbot-logs", icon: Bot },
      { name: "Human Support", href: "/pc/communication/human-support", icon: User },
      { name: "Emails", href: "/pc/communication-templates", icon: Mail },
      { name: "Content", href: "/pc/communication/client-content", icon: FileText },
      { name: "Missing Information", href: "/admin/missing-information", icon: FileText },
      { name: "JustCall", href: "/pc/justcall", icon: Layers },
      { name: "Slack", href: "/pc/slack", icon: SiSlack },
    ],
  },
  { name: "View As User", href: "/pc/view-as-user", icon: ScanEye, access: ["admin", "assistant"] },
  {
    name: "CEC",
    groupId: 10,
    icon: Headphones,
    access: ["admin", "assistant"],
    children: [
      // { name: "CEC Dashboard", href: "/admin/cec/dashboard", icon: LayoutDashboard },
      { name: "Daily Log", href: "/admin/cec/daily-log", icon: ClipboardList },
      { name: "Issue Burndown", href: "/admin/cec/issue-burndown", icon: Bug },
      { name: "Complaints", href: "/admin/cec/complaints", icon: AlertTriangle },
      { name: "Referral Payouts", href: "/admin/cec/referral-payouts", icon: DollarSign },
      { name: "Sales Outreach", href: "/admin/cec/sales-outreach", icon: Megaphone },
      { name: "Ambassador Scouting", href: "/admin/cec/ambassador-scouting", icon: Target },
    ],
  },
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
};
