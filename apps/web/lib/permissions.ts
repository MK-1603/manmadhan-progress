export type OrganizationRole = "CEO" | "CO-CEO" | "MEMBER";

export type Resource =
  | "dashboard"
  | "focus"
  | "projects"
  | "tasks"
  | "learning"
  | "command"
  | "calendar"
  | "timeline"
  | "people"
  | "graph"
  | "leaderboard"
  | "performance"
  | "automation"
  | "organization"
  | "org_profile"
  | "org_settings";

export type Action = "read" | "create" | "update" | "delete" | "manage" | "invite";

/**
 * Centralized RBAC Permission Matrix for ManMadhan Progress V1
 */
const ROLE_PERMISSIONS: Record<OrganizationRole, Record<Resource, Action[]>> = {
  CEO: {
    dashboard: ["read"],
    focus: ["read", "manage"],
    projects: ["read", "create", "update", "delete", "manage"],
    tasks: ["read", "create", "update", "delete", "manage"],
    learning: ["read", "manage"],
    command: ["read", "manage"],
    calendar: ["read", "manage"],
    timeline: ["read"],
    people: ["read", "create", "update", "delete", "manage", "invite"],
    graph: ["read", "manage"],
    leaderboard: ["read"],
    performance: ["read"],
    automation: ["read", "manage"],
    organization: ["read", "manage"],
    org_profile: ["read", "manage"],
    org_settings: ["read", "manage"],
  },
  "CO-CEO": {
    dashboard: ["read"],
    focus: ["read", "manage"],
    projects: ["read", "create", "update", "delete"],
    tasks: ["read", "create", "update", "delete"],
    learning: ["read"],
    command: ["read"],
    calendar: ["read"],
    timeline: ["read"],
    people: ["read", "invite"], // Scoped to assigned members
    graph: ["read"],
    leaderboard: ["read"],
    performance: ["read"],
    automation: [],
    organization: [],
    org_profile: [],
    org_settings: [],
  },
  MEMBER: {
    dashboard: ["read"],
    focus: ["read", "manage"],
    projects: ["read"],
    tasks: ["read", "create", "update"],
    learning: ["read"],
    command: ["read"],
    calendar: ["read"],
    timeline: ["read"],
    people: [], // NO PEOPLE ACCESS
    graph: [], // NO GRAPH ACCESS
    leaderboard: [], // NO LEADERBOARD ACCESS
    performance: [], // NO PERFORMANCE ACCESS
    automation: [],
    organization: [],
    org_profile: [],
    org_settings: [],
  },
};

/**
 * Check if a role can perform an action on a resource
 */
export function canAccess(
  role: string | undefined | null,
  resource: Resource,
  action: Action = "read"
): boolean {
  const normalizedRole = ((role || "MEMBER").toUpperCase() as OrganizationRole);
  const permissions = ROLE_PERMISSIONS[normalizedRole] || ROLE_PERMISSIONS.MEMBER;
  const allowedActions = permissions[resource] || [];
  return allowedActions.includes(action);
}

/**
 * Helper to check if a route is authorized for a role
 */
export function isRouteAuthorized(pathname: string, role?: string): boolean {
  const r = (role || "MEMBER").toUpperCase() as OrganizationRole;
  if (!pathname) return true;

  // Member restrictions
  if (r === "MEMBER") {
    if (
      pathname.includes("/people") ||
      pathname.includes("/members") ||
      pathname.includes("/co-ceos") ||
      pathname.includes("/invitations") ||
      pathname.includes("/graph") ||
      pathname.includes("/organization-graph") ||
      pathname.includes("/leaderboard") ||
      pathname.includes("/performance") ||
      pathname.includes("/organization") ||
      pathname.includes("/settings")
    ) {
      return false;
    }
  }

  // CO-CEO restrictions
  if (r === "CO-CEO") {
    if (
      pathname.includes("/organization") ||
      pathname.includes("/settings")
    ) {
      return false;
    }
  }

  return true;
}
