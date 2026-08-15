import {
  LayoutDashboard, Focus, FolderKanban, CheckSquare, Calendar as Cal,
  History, PenSquare, BookOpen, Headphones, GraduationCap, FileText,
  Archive, Brain, Sparkles, Zap, Bell, BarChart, Settings, UserCheck,
  Users, UserPlus, Network, Trophy, Building, ShieldCheck, LucideIcon
} from "lucide-react";

export type RoleType = "CEO" | "CO-CEO" | "MEMBER";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: RoleType[];
};

export type NavSection = {
  section: string;
  items: NavItem[];
};

export const PERSONAL_MOBILE_NAV: NavSection[] = [
  {
    section: "OVERVIEW",
    items: [
      { label: "Dashboard", href: "/personal/dashboard", icon: LayoutDashboard },
      { label: "Focus", href: "/personal/focus", icon: Focus },
    ],
  },
  {
    section: "WORK",
    items: [
      { label: "Projects", href: "/personal/projects", icon: FolderKanban },
      { label: "Tasks", href: "/personal/tasks", icon: CheckSquare },
      { label: "Calendar", href: "/personal/calendar", icon: Cal },
      { label: "Timeline", href: "/personal/timeline", icon: History },
    ],
  },
  {
    section: "LIFE",
    items: [
      { label: "Journal", href: "/personal/journal", icon: PenSquare },
      { label: "Books", href: "/personal/books", icon: BookOpen },
      { label: "Podcasts", href: "/personal/podcasts", icon: Headphones },
      { label: "Learning", href: "/personal/learning", icon: GraduationCap },
    ],
  },
  {
    section: "CONTENT",
    items: [
      { label: "Notes", href: "/personal/notes", icon: FileText },
      { label: "Documents", href: "/personal/documents", icon: Archive },
    ],
  },
  {
    section: "AI",
    items: [
      { label: "AI Builder", href: "/personal/ai-builder", icon: Brain },
      { label: "Prompt Library", href: "/personal/prompt-library", icon: Sparkles },
    ],
  },
  {
    section: "SYSTEM",
    items: [
      { label: "Automation", href: "/personal/automation", icon: Zap },
      { label: "Reminders", href: "/personal/reminders", icon: Bell },
      { label: "Reports", href: "/personal/reports", icon: BarChart },
    ],
  },
];

export const ORGANIZATION_MOBILE_NAV = (role: RoleType): NavSection[] => {
  const getHref = (page: string) => {
    if (role === "CO-CEO") return `/co-ceo/${page}`;
    if (role === "MEMBER") return `/member/${page}`;
    return `/ceo/${page}`;
  };

  const peopleItems: NavItem[] = [
    { label: "CO-CEOs", href: getHref("co-ceos"), icon: UserCheck, roles: ["CEO", "CO-CEO"] as RoleType[] },
    { label: "Members", href: getHref("members"), icon: Users },
    { label: "Invitations", href: getHref("invitations"), icon: UserPlus, roles: ["CEO", "CO-CEO"] as RoleType[] },
  ];

  const adminItems: NavItem[] = [
    { label: "Automation", href: getHref("automation"), icon: Zap },
    { label: "Organization", href: getHref("organization"), icon: Building },
    { label: "Org Profile", href: getHref("org-profile"), icon: ShieldCheck },
    { label: "Org Settings", href: getHref("settings"), icon: Settings, roles: ["CEO"] as RoleType[] },
  ];

  return [
    {
      section: "OVERVIEW",
      items: [
        { label: "Dashboard", href: getHref("dashboard"), icon: LayoutDashboard },
        { label: "Focus", href: getHref("focus"), icon: Focus },
      ],
    },
    {
      section: "WORK",
      items: [
        { label: "Projects", href: getHref("projects"), icon: FolderKanban },
        { label: "Tasks", href: getHref("tasks"), icon: CheckSquare },
        { label: "Calendar", href: getHref("calendar"), icon: Cal },
        { label: "Timeline", href: getHref("timeline"), icon: History },
      ],
    },
    {
      section: "PEOPLE",
      items: peopleItems.filter(item => !item.roles || item.roles.includes(role)),
    },
    {
      section: "PERFORMANCE",
      items: [
        { label: "Org Graph", href: getHref("graph"), icon: Network },
        { label: "Leaderboard", href: getHref("leaderboard"), icon: Trophy },
      ],
    },
    {
      section: "ADMINISTRATION",
      items: adminItems.filter(item => !item.roles || item.roles.includes(role)),
    },
  ];
};

export const MORE_SHEET_SHORTCUTS = (workspace: "personal" | "organization", role: RoleType = "CEO") => {
  if (workspace === "personal") {
    return [
      { label: "Reports", href: "/personal/reports", icon: BarChart },
      { label: "Documents", href: "/personal/documents", icon: Archive },
      { label: "Notes", href: "/personal/notes", icon: FileText },
      { label: "Reminders", href: "/personal/reminders", icon: Bell },
      { label: "Prompt Library", href: "/personal/prompt-library", icon: Sparkles },
      { label: "Automation", href: "/personal/automation", icon: Zap },
      { label: "Settings", href: "/personal/settings", icon: Settings },
    ];
  }

  const getHref = (page: string) => {
    if (role === "CO-CEO") return `/co-ceo/${page}`;
    if (role === "MEMBER") return `/member/${page}`;
    return `/ceo/${page}`;
  };

  return [
    { label: "Automation", href: getHref("automation"), icon: Zap },
    { label: "Organization", href: getHref("organization"), icon: Building },
    { label: "Org Profile", href: getHref("org-profile"), icon: ShieldCheck },
    { label: "Org Settings", href: getHref("settings"), icon: Settings },
  ];
};
