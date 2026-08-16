/**
 * ManMadhan Progress V1 — Frontend Demo Data Layer
 * Standardized typed dataset for frontend UI testing and development without live backend dependency.
 */

export interface DemoUser {
  id: string;
  name: string;
  displayName: string;
  role: string;
  email: string;
  initials: string;
}

export interface DemoProject {
  id: string;
  name: string;
  status: "Active" | "Planning" | "Completed" | "At Risk";
  progress: number;
  priority: "High" | "Medium" | "Low";
  owner: string;
}

export interface DemoTask {
  id: string;
  title: string;
  projectName: string;
  projectId?: string;
  assignee: string;
  owner?: string;
  status: "In Progress" | "In Review" | "Not Started" | "Completed";
  priority: "High" | "Medium" | "Low";
  progress: number;
  dueDate: string;
  category?: string;
  isDecision?: boolean;
}

export interface DemoLeaderboardItem {
  id: string;
  name: string;
  role: "CO-CEO" | "MEMBER";
  completedTasks: number;
  progress: number;
  score: number;
  members?: string[];
}

export interface DemoActivity {
  id: string;
  userName: string;
  eventType: string;
  details: string;
  createdAt: string;
}

export interface DashboardDataShape {
  organizationName: string;
  user: DemoUser;
  health: {
    membersCount: number;
    teamMembersCount: number;
    activeProjectsCount: number;
    activeTasksCount: number;
    pendingReviewCount: number;
    overallProgress: number;
    completedTodayCount: number;
    completedTotalCount: number;
    onTimeCompletionRate: number;
    overdueCount: number;
    blockedCount: number;
  };
  workingHours: {
    today: string;
    week: string;
    average: string;
  };
  todayPriorities: DemoTask[];
  attentionItems: DemoTask[];
  projectHealth: DemoProject[];
  deadlineWatch: {
    overdue: DemoTask[];
    dueToday: DemoTask[];
    dueTomorrow: DemoTask[];
  };
  coCeoPerformance: DemoLeaderboardItem[];
  recentActivities: DemoActivity[];
  currentFocus: {
    title: string;
    currentTask: string;
    progress: number;
    remainingTime: string;
  };
}

export const MOCK_CEO_USER: DemoUser = {
  id: "usr_ceo_001",
  name: "Sai Krishnan S",
  displayName: "Sai Krishnan S",
  role: "CEO",
  email: "sai@manmadhan.org",
  initials: "SK",
};

export const FULL_DEMO_DASHBOARD_DATA: DashboardDataShape = {
  organizationName: "ManMadhan Organization",
  user: MOCK_CEO_USER,
  health: {
    membersCount: 6,
    teamMembersCount: 6,
    activeProjectsCount: 4,
    activeTasksCount: 5,
    pendingReviewCount: 2,
    overallProgress: 68,
    completedTodayCount: 4,
    completedTotalCount: 38,
    onTimeCompletionRate: 94,
    overdueCount: 1,
    blockedCount: 1,
  },
  workingHours: {
    today: "6h 42m",
    week: "31h 18m",
    average: "6h 15m",
  },
  todayPriorities: [
    {
      id: "task_001",
      title: "Finalize authentication flow review",
      projectName: "ManMadhan Progress V1",
      projectId: "proj_001",
      assignee: "Arjun Kumar",
      owner: "Arjun Kumar",
      status: "In Progress",
      priority: "High",
      progress: 82,
      dueDate: "Today",
      category: "Security & Auth",
      isDecision: true,
    },
    {
      id: "task_002",
      title: "Mobile refresh testing & verification",
      projectName: "Mobile Experience Upgrade",
      projectId: "proj_002",
      assignee: "Kavin R",
      owner: "Kavin R",
      status: "In Progress",
      priority: "High",
      progress: 68,
      dueDate: "Today",
      category: "Mobile UX",
      isDecision: false,
    },
    {
      id: "task_003",
      title: "Dashboard analytics architecture approval",
      projectName: "Organization Automation",
      projectId: "proj_003",
      assignee: "Priya N",
      owner: "Priya N",
      status: "In Review",
      priority: "Medium",
      progress: 90,
      dueDate: "Tomorrow",
      category: "Analytics",
      isDecision: true,
    },
  ],
  attentionItems: [
    {
      id: "dec_001",
      title: "Authentication architecture review",
      projectName: "ManMadhan Progress V1",
      assignee: "Arjun Kumar",
      owner: "Arjun Kumar",
      status: "In Review",
      priority: "High",
      progress: 90,
      dueDate: "Today",
      isDecision: true,
    },
    {
      id: "dec_002",
      title: "Mobile UX implementation signoff",
      projectName: "Mobile Experience Upgrade",
      assignee: "Priya N",
      owner: "Priya N",
      status: "In Review",
      priority: "Medium",
      progress: 85,
      dueDate: "Today",
      isDecision: true,
    },
  ],
  projectHealth: [
    {
      id: "proj_001",
      name: "ManMadhan Progress V1",
      status: "Active",
      progress: 78,
      priority: "High",
      owner: "Sai Krishnan S",
    },
    {
      id: "proj_002",
      name: "Mobile Experience Upgrade",
      status: "At Risk",
      progress: 62,
      priority: "High",
      owner: "Arjun Kumar",
    },
    {
      id: "proj_003",
      name: "Organization Automation",
      status: "Active",
      progress: 41,
      priority: "Medium",
      owner: "Priya N",
    },
    {
      id: "proj_004",
      name: "Documentation & Launch",
      status: "Planning",
      progress: 24,
      priority: "Medium",
      owner: "Sai Krishnan S",
    },
  ],
  deadlineWatch: {
    overdue: [
      {
        id: "task_ov_1",
        title: "Legacy endpoint deprecation audit",
        projectName: "Organization Automation",
        assignee: "Nithin S",
        status: "In Progress",
        priority: "High",
        progress: 30,
        dueDate: "Yesterday",
      },
    ],
    dueToday: [
      {
        id: "task_dt_1",
        title: "Finalize authentication flow",
        projectName: "ManMadhan Progress V1",
        assignee: "Arjun Kumar",
        status: "In Progress",
        priority: "High",
        progress: 82,
        dueDate: "Today",
      },
      {
        id: "task_dt_2",
        title: "Fix mobile pull-to-refresh interaction",
        projectName: "Mobile Experience Upgrade",
        assignee: "Kavin R",
        status: "In Progress",
        priority: "High",
        progress: 68,
        dueDate: "Today",
      },
    ],
    dueTomorrow: [
      {
        id: "task_dtm_1",
        title: "Review OTP verification flow",
        projectName: "ManMadhan Progress V1",
        assignee: "Rahul M",
        status: "In Review",
        priority: "Medium",
        progress: 90,
        dueDate: "Tomorrow",
      },
    ],
  },
  coCeoPerformance: [
    {
      id: "leader_001",
      name: "Arjun Kumar",
      role: "CO-CEO",
      completedTasks: 14,
      progress: 92,
      score: 92,
      members: ["Rahul M", "Kavin R"],
    },
    {
      id: "leader_002",
      name: "Priya N",
      role: "CO-CEO",
      completedTasks: 11,
      progress: 86,
      score: 86,
      members: ["Nithin S", "Harish K"],
    },
    {
      id: "leader_003",
      name: "Rahul M",
      role: "MEMBER",
      completedTasks: 9,
      progress: 79,
      score: 79,
    },
    {
      id: "leader_004",
      name: "Kavin R",
      role: "MEMBER",
      completedTasks: 8,
      progress: 74,
      score: 74,
    },
    {
      id: "leader_005",
      name: "Nithin S",
      role: "MEMBER",
      completedTasks: 6,
      progress: 68,
      score: 68,
    },
    {
      id: "leader_006",
      name: "Harish K",
      role: "MEMBER",
      completedTasks: 4,
      progress: 61,
      score: 61,
    },
  ],
  recentActivities: [
    {
      id: "act_001",
      userName: "Kavin R",
      eventType: "completed",
      details: "completed Mobile refresh interaction task",
      createdAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    },
    {
      id: "act_002",
      userName: "Arjun Kumar",
      eventType: "submitted",
      details: "submitted Authentication flow review for approval",
      createdAt: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
    },
    {
      id: "act_003",
      userName: "Priya N",
      eventType: "approved",
      details: "approved Automation architecture spec",
      createdAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    },
    {
      id: "act_004",
      userName: "Rahul M",
      eventType: "updated",
      details: "updated OTP verification task progress to 90%",
      createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    },
    {
      id: "act_005",
      userName: "Sai Krishnan S",
      eventType: "created",
      details: "created Launch checklist project task",
      createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
    },
  ],
  currentFocus: {
    title: "Authentication & Mobile Experience",
    currentTask: "Finalize authentication flow",
    progress: 82,
    remainingTime: "1h 24m",
  },
};

export const EMPTY_DEMO_DASHBOARD_DATA: DashboardDataShape = {
  organizationName: "ManMadhan Organization",
  user: MOCK_CEO_USER,
  health: {
    membersCount: 1,
    teamMembersCount: 1,
    activeProjectsCount: 0,
    activeTasksCount: 0,
    pendingReviewCount: 0,
    overallProgress: 0,
    completedTodayCount: 0,
    completedTotalCount: 0,
    onTimeCompletionRate: 0,
    overdueCount: 0,
    blockedCount: 0,
  },
  workingHours: {
    today: "0h 0m",
    week: "0h 0m",
    average: "0h 0m",
  },
  todayPriorities: [],
  attentionItems: [],
  projectHealth: [],
  deadlineWatch: {
    overdue: [],
    dueToday: [],
    dueTomorrow: [],
  },
  coCeoPerformance: [],
  recentActivities: [],
  currentFocus: {
    title: "No Focus Set",
    currentTask: "None",
    progress: 0,
    remainingTime: "0m",
  },
};
