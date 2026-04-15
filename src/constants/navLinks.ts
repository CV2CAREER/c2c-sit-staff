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
  User
} from "lucide-react";
// import { IconType } from "react-icons";
import { SiSlack } from "react-icons/si";

export type NavRole = "admin" | "assistant" | "partner" | "coach" | "cse" | "sales" | "technology" | "business" | "client";

export interface NavChild {
  name: string;
  href: string;
  icon: any;
  role?: NavRole; // for switch persona
}

export interface NavLink {
  name: string;
  href?: string;
  icon: any;
  groupId?: number;
  access?: NavRole[];
  children?: NavChild[];
}

export const ADMIN_NAV_LINKS: NavLink[] = [
  { name: "Home", href: "/admin/dashboard", icon: House },
  { name: "Status Report", href: "/admin/status-report", icon: SlidersHorizontal },
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
      { name: "Promotional Mgt.", href: "/admin/promotion", icon: Star },
      { name: "Blog", href: "/admin/blog", icon: Newspaper },
    ],
  },
  {
    name: "AI",
    groupId: 3,
    icon: Bot,
    access: ["admin"],
    children: [
      { name: "QA AI Prompt", href: "/admin/prompts/qa-ai", icon: Folders },
      { name: "AQ AI Prompt", href: "/admin/prompts/aq-ai", icon: Folders },
      { name: "CV AI Prompt", href: "/admin/prompts/cv-ai", icon: Folders },
      { name: "Preference AI Prompt", href: "/admin/prompts/preference-ai", icon: Folders },
      { name: "Job Match AI Prompt", href: "/admin/prompts/job-match-ai", icon: Folders },
      { name: "Interview Prep", href: "/admin/prompts/interview-preparation", icon: Folders },
      { name: "Keyword Generation", href: "/admin/prompts/keyword-generator", icon: Folders },
      { name: "Market Viability", href: "/admin/prompts/market-viability", icon: Folders },
      { name: "VA AI Prompt", href: "/admin/prompts/va-ai", icon: Folders },
    ],
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
    ],
  },
];

// Placeholders for other personas - to be expanded
export const COACH_NAV_LINKS: NavLink[] = [
  { name: "Home", href: "/coach/dashboard", icon: House },
  { name: "Profile", href: "/coach/profile", icon: User },
];

export const ASSISTANT_NAV_LINKS: NavLink[] = [
  { name: "Home", href: "/assistant/dashboard", icon: House },
];

export const NAV_LINKS_BY_ROLE: Record<string, NavLink[]> = {
  admin: ADMIN_NAV_LINKS,
  coach: COACH_NAV_LINKS,
  assistant: ASSISTANT_NAV_LINKS,
  // Add others as needed
};
