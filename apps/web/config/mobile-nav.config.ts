import {
  ORGANIZATION_NAV_GROUPS,
  PERSONAL_NAV_GROUPS,
  RoleType,
  getOrgItemHref
} from "./navigation.config";
import {
  BarChart3, Archive, FileText, Bell, Sparkles, Cpu, Settings, Users, Trophy, ShieldCheck, CheckSquare, Calendar as Cal, History, Brain, Building2, BookOpen
} from "lucide-react";

export type { RoleType };

export type NavItem = {
  label: string;
  href: string;
  icon: any;
  roles?: RoleType[];
};

export type NavSection = {
  section: string;
  items: NavItem[];
};

export const PERSONAL_MOBILE_NAV: NavSection[] = PERSONAL_NAV_GROUPS.map((group) => ({
  section: group.label,
  items: group.items.map((item) => ({
    label: item.name,
    href: item.href,
    icon: item.icon,
  })),
}));

export const ORGANIZATION_MOBILE_NAV = (role: RoleType): NavSection[] => {
  return ORGANIZATION_NAV_GROUPS
    .filter((group) => group.allowedRoles.includes(role))
    .map((group) => {
      const filteredItems = group.items.filter(
        (item) => !item.allowedRoles || item.allowedRoles.includes(role)
      );

      return {
        section: group.label,
        items: filteredItems.map((item) => ({
          label: item.name,
          href: getOrgItemHref(role, item.href),
          icon: item.icon,
        })),
      };
    })
    .filter((sec) => sec.items.length > 0);
};

export const MORE_SHEET_SHORTCUTS = (workspace: "personal" | "organization", role: RoleType = "CEO") => {
  if (workspace === "personal") {
    return [
      { label: "Reports", href: "/personal/reports", icon: BarChart3 },
      { label: "Documents", href: "/personal/documents", icon: Archive },
      { label: "Notes", href: "/personal/notes", icon: FileText },
      { label: "Reminders", href: "/personal/reminders", icon: Bell },
      { label: "Prompt Library", href: "/personal/prompt-library", icon: BookOpen },
      { label: "Automation", href: "/personal/automation", icon: Cpu },
      { label: "Settings", href: "/personal/settings", icon: Settings },
    ];
  }

  if (role === "MEMBER") {
    return [
      { label: "My Work", href: "/member/my-work", icon: CheckSquare },
      { label: "Calendar", href: "/member/calendar", icon: Cal },
      { label: "Timeline", href: "/member/timeline", icon: History },
      { label: "AI Builder", href: "/member/ai-builder", icon: Brain },
      { label: "Reports", href: "/member/reports", icon: BarChart3 },
      { label: "Settings", href: "/member/settings", icon: Settings },
    ];
  }

  if (role === "CO-CEO") {
    return [
      { label: "My Work", href: "/co-ceo/my-work", icon: CheckSquare },
      { label: "People", href: "/co-ceo/people", icon: Users },
      { label: "Leaderboard", href: "/co-ceo/leaderboard", icon: Trophy },
      { label: "AI Builder", href: "/co-ceo/ai-builder", icon: Brain },
      { label: "Reports", href: "/co-ceo/reports", icon: BarChart3 },
      { label: "Settings", href: "/co-ceo/settings", icon: Settings },
    ];
  }

  return [
    { label: "AI Builder", href: "/ceo/ai-builder", icon: Brain },
    { label: "Reports", href: "/ceo/reports", icon: BarChart3 },
    { label: "Automation", href: "/ceo/automation", icon: Cpu },
    { label: "Organization", href: "/ceo/organization", icon: Building2 },
    { label: "Org Profile", href: "/ceo/profile", icon: ShieldCheck },
    { label: "Org Settings", href: "/ceo/settings", icon: Settings },
  ];
};
