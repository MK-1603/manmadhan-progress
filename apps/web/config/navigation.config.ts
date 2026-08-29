import {
  Home,
  Zap,
  FolderKanban,
  CheckSquare,
  ClipboardList,
  Calendar as CalendarIcon,
  Clock,
  Users,
  Trophy,
  Cpu,
  Building2,
  User as UserIcon,
  Settings,
  Sparkles,
  BookOpen,
  BarChart3,
  Folder,
  FileText,
  Network,
  ShieldCheck,
  GraduationCap,
  PenSquare,
  Headphones,
  Bell,
  Archive,
  Brain,
  History,
  LucideIcon
} from "lucide-react";

export type RoleType = "CEO" | "CO-CEO" | "MEMBER";

export type NavItem = {
  id: string;
  name: string;
  href: string; // Base href or relative path
  icon: LucideIcon;
  allowedRoles?: RoleType[];
  badge?: string | number;
};

export type NavGroup = {
  id: string;
  label: string;
  allowedRoles: string[]; // ["CEO", "CO-CEO", "MEMBER", "PERSONAL"]
  items: NavItem[];
};

// --- Personal Workspace Navigation Schema ---
export const PERSONAL_NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "OVERVIEW",
    allowedRoles: ["PERSONAL"],
    items: [
      { id: "personal-dashboard", name: "Home", href: "/personal/dashboard", icon: Home },
      { id: "personal-focus", name: "Focus", href: "/personal/focus", icon: Zap },
    ]
  },
  {
    id: "work",
    label: "WORK",
    allowedRoles: ["PERSONAL"],
    items: [
      { id: "personal-projects", name: "Projects", href: "/personal/projects", icon: FolderKanban },
      { id: "personal-tasks", name: "Tasks", href: "/personal/tasks", icon: CheckSquare },
      { id: "personal-learning", name: "Learning", href: "/personal/learning", icon: GraduationCap },
      { id: "personal-calendar", name: "Calendar", href: "/personal/calendar", icon: CalendarIcon },
      { id: "personal-timeline", name: "Timeline", href: "/personal/timeline", icon: Clock },
    ]
  },
  {
    id: "content",
    label: "CONTENT",
    allowedRoles: ["PERSONAL"],
    items: [
      { id: "personal-notes", name: "Notes", href: "/personal/notes", icon: FileText },
      { id: "personal-documents", name: "Documents", href: "/personal/documents", icon: Folder },
      { id: "personal-journal", name: "Journal", href: "/personal/journal", icon: PenSquare },
      { id: "personal-books", name: "Books", href: "/personal/books", icon: BookOpen },
    ]
  },
  {
    id: "ai",
    label: "AI & INTELLIGENCE",
    allowedRoles: ["PERSONAL"],
    items: [
      { id: "personal-ai-builder", name: "AI Builder", href: "/personal/ai-builder", icon: Cpu },
      { id: "personal-prompt-library", name: "Prompt Library", href: "/personal/prompt-library", icon: BookOpen },
    ]
  },
  {
    id: "system",
    label: "SYSTEM",
    allowedRoles: ["PERSONAL"],
    items: [
      { id: "personal-automation", name: "Automation", href: "/personal/automation", icon: Cpu },
      { id: "personal-reminders", name: "Reminders", href: "/personal/reminders", icon: Bell },
      { id: "personal-reports", name: "Reports", href: "/personal/reports", icon: BarChart3 },
    ]
  }
];

// --- Organization Workspace Navigation Schema ---
export const ORGANIZATION_NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "OVERVIEW",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { id: "dashboard", name: "Home", href: "/dashboard", icon: Home },
      { id: "focus", name: "Focus", href: "/focus", icon: Zap, allowedRoles: ["CO-CEO", "MEMBER"] },
    ]
  },
  {
    id: "work",
    label: "WORK",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { id: "my-work", name: "My Work", href: "/my-work", icon: CheckSquare, allowedRoles: ["CO-CEO", "MEMBER"] },
      { id: "projects", name: "Projects", href: "/projects", icon: FolderKanban },
      { id: "tasks", name: "Tasks", href: "/tasks", icon: ClipboardList },
      { id: "learning", name: "Learning", href: "/learning", icon: GraduationCap },
      { id: "calendar", name: "Calendar", href: "/calendar", icon: CalendarIcon },
      { id: "timeline", name: "Timeline", href: "/timeline", icon: Clock },
    ]
  },
  {
    id: "people",
    label: "PEOPLE",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { id: "people", name: "People", href: "/people", icon: Users },
      { id: "approvals", name: "Approvals", href: "/approvals", icon: ShieldCheck, allowedRoles: ["CEO", "CO-CEO"] },
    ]
  },
  {
    id: "productivity",
    label: "PRODUCTIVITY & INTELLIGENCE",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { id: "ai-builder", name: "AI Builder", href: "/ai-builder", icon: Cpu },
      { id: "prompt-library", name: "Prompt Library", href: "/prompt-library", icon: BookOpen },
      { id: "reports", name: "Reports", href: "/reports", icon: BarChart3 },
      { id: "documents", name: "Documents", href: "/documents", icon: Folder },
      { id: "notes", name: "Notes", href: "/notes", icon: FileText },
      { id: "integrations", name: "Integrations", href: "/integrations", icon: Network },
    ]
  },
  {
    id: "performance",
    label: "PERFORMANCE",
    allowedRoles: ["CEO", "CO-CEO", "MEMBER"],
    items: [
      { id: "leaderboard", name: "Leaderboard", href: "/leaderboard", icon: Trophy },
    ]
  },
  {
    id: "administration",
    label: "ADMINISTRATION",
    allowedRoles: ["CEO", "CO-CEO"],
    items: [
      { id: "automation", name: "Automation", href: "/automation", icon: Cpu, allowedRoles: ["CEO", "CO-CEO"] },
      { id: "audit", name: "Audit Logs", href: "/audit", icon: ShieldCheck, allowedRoles: ["CEO"] },
      { id: "organization", name: "Organization", href: "/organization", icon: Building2, allowedRoles: ["CEO", "CO-CEO"] },
    ]
  }
];

/**
 * Resolves full path for an organization nav item based on role
 */
export function getOrgItemHref(role: RoleType, relativeHref: string): string {
  const base = role === "CO-CEO" ? "/co-ceo" : role === "MEMBER" ? "/member" : "/ceo";
  if (relativeHref === "/organization" && (role === "CO-CEO" || role === "MEMBER")) {
    return `${base}/org-profile`;
  }
  return `${base}${relativeHref}`;
}
