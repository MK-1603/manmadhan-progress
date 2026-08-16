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

  const sections: NavSection[] = [
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
  ];

  // PEOPLE & PERFORMANCE are for Leadership (CEO & CO-CEO)
  if (role === "CEO" || role === "CO-CEO") {
    sections.push({
      section: "PEOPLE",
      items: [
        { label: "People", href: getHref("people"), icon: Users },
      ],
    });

    sections.push({
      section: "PERFORMANCE",
      items: [
        { label: "Organization Graph", href: getHref("graph"), icon: Network },
        { label: "Leaderboard", href: getHref("leaderboard"), icon: Trophy },
        { label: "Performance", href: getHref("performance"), icon: BarChart },
      ],
    });
  }

  // ADMINISTRATION is strictly for Organization CEO
  if (role === "CEO") {
    sections.push({
      section: "ADMINISTRATION",
      items: [
        { label: "Automation", href: getHref("automation"), icon: Zap },
        { label: "Organization", href: getHref("organization"), icon: Building },
        { label: "Org Profile", href: getHref("org-profile"), icon: ShieldCheck },
        { label: "Org Settings", href: getHref("settings"), icon: Settings },
      ],
    });
  }

  return sections;
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

  if (role === "MEMBER") {
    return [
      { label: "My Work", href: "/member/my-work", icon: CheckSquare },
      { label: "Calendar", href: "/member/calendar", icon: Cal },
      { label: "Timeline", href: "/member/timeline", icon: History },
      { label: "Command", href: "/member/ai-builder", icon: Brain },
    ];
  }

  if (role === "CO-CEO") {
    return [
      { label: "People", href: "/co-ceo/people", icon: Users },
      { label: "Org Graph", href: "/co-ceo/graph", icon: Network },
      { label: "Leaderboard", href: "/co-ceo/leaderboard", icon: Trophy },
      { label: "Performance", href: "/co-ceo/performance", icon: BarChart },
    ];
  }

  return [
    { label: "Automation", href: "/ceo/automation", icon: Zap },
    { label: "Organization", href: "/ceo/organization", icon: Building },
    { label: "Org Profile", href: "/ceo/profile", icon: ShieldCheck },
    { label: "Org Settings", href: "/ceo/settings", icon: Settings },
  ];
};
