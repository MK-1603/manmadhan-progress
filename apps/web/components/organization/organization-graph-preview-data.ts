export interface GraphTaskItem {
  id: string;
  title: string;
  projectName: string;
  status: "In Progress" | "Completed" | "Pending Approval" | "Overdue";
  priority: "High" | "Medium" | "Low";
  deadline: string;
  assignedTo: string;
  supervisor: string;
  approvalStatus?: string;
  createdAt?: string;
}

export interface GraphMemberNode {
  id: string;
  name: string;
  email: string;
  role: "CEO" | "CO-CEO" | "MEMBER";
  department?: string;
  status: "Active" | "Away" | "On Leave";
  managerId?: string;
  managerName?: string;
  supervisor?: string;
  projectsCount: number;
  tasksCount: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  focusTime?: string;
  sessionsCount?: number;
  onTimeRate: number;
  approvalRate: number;
  recentWork: GraphTaskItem[];
}

export interface OrganizationGraphData {
  id: string;
  name: string;
  preview: boolean;
  ceoNode: GraphMemberNode;
  coCeoNodes: GraphMemberNode[];
  memberNodes: GraphMemberNode[];
}

export const organizationGraphPreviewData: OrganizationGraphData = {
  id: "org-preview-manmadhan",
  name: "ManMadhan",
  preview: true,
  ceoNode: {
    id: "ceo-hemanth",
    name: "HEMANTH",
    email: "hemanth@manmadhan.org",
    role: "CEO",
    department: "Executive Leadership",
    status: "Active",
    projectsCount: 4,
    tasksCount: 12,
    completedTasks: 8,
    inProgressTasks: 4,
    overdueTasks: 0,
    focusTime: "5h 40m",
    sessionsCount: 6,
    onTimeRate: 98,
    approvalRate: 96,
    recentWork: [
      {
        id: "task-ceo-1",
        title: "Organization Structure & Execution Operating System",
        projectName: "ManMadhan Progress",
        status: "In Progress",
        priority: "High",
        deadline: "Aug 20",
        assignedTo: "HEMANTH (CEO)",
        supervisor: "Organization Board",
        approvalStatus: "Approved",
        createdAt: "Aug 10",
      },
      {
        id: "task-ceo-2",
        title: "Executive Performance Governance Protocol",
        projectName: "ManMadhan Governance",
        status: "Completed",
        priority: "High",
        deadline: "Aug 14",
        assignedTo: "HEMANTH (CEO)",
        supervisor: "Organization Board",
        approvalStatus: "Approved",
        createdAt: "Aug 05",
      },
    ],
  },
  coCeoNodes: [
    {
      id: "co-ss0778",
      name: "SS0778",
      email: "ss0778@manmadhan.org",
      role: "CO-CEO",
      department: "Leadership & Operations",
      status: "Active",
      managerId: "ceo-sai",
      managerName: "HEMANTH",
      projectsCount: 3,
      tasksCount: 8,
      completedTasks: 6,
      inProgressTasks: 2,
      overdueTasks: 0,
      focusTime: "4h 15m",
      sessionsCount: 5,
      onTimeRate: 94,
      approvalRate: 91,
      recentWork: [
        {
          id: "task-ss-1",
          title: "Execution Workflow & Approval Pipeline",
          projectName: "ManMadhan Operations",
          status: "In Progress",
          priority: "High",
          deadline: "Aug 19",
          assignedTo: "SS0778 (CO-CEO)",
          supervisor: "HEMANTH (CEO)",
          approvalStatus: "Under Review",
          createdAt: "Aug 12",
        },
        {
          id: "task-ss-2",
          title: "Team Task Review & Quality Oversight",
          projectName: "ManMadhan Quality",
          status: "Completed",
          priority: "Medium",
          deadline: "Aug 15",
          assignedTo: "SS0778 (CO-CEO)",
          supervisor: "HEMANTH (CEO)",
          approvalStatus: "Approved",
          createdAt: "Aug 08",
        },
      ],
    },
    {
      id: "co-tn0813",
      name: "TN0813",
      email: "tn0813@manmadhan.org",
      role: "CO-CEO",
      department: "Leadership & Engineering",
      status: "Active",
      managerId: "ceo-sai",
      managerName: "HEMANTH",
      projectsCount: 2,
      tasksCount: 5,
      completedTasks: 4,
      inProgressTasks: 1,
      overdueTasks: 0,
      focusTime: "3h 50m",
      sessionsCount: 4,
      onTimeRate: 89,
      approvalRate: 86,
      recentWork: [
        {
          id: "task-tn-1",
          title: "System Integration & Security Audit",
          projectName: "ManMadhan Core",
          status: "In Progress",
          priority: "High",
          deadline: "Aug 22",
          assignedTo: "TN0813 (CO-CEO)",
          supervisor: "HEMANTH (CEO)",
          approvalStatus: "In Progress",
          createdAt: "Aug 11",
        },
      ],
    },
  ],
  memberNodes: [
    {
      id: "mem-mb001",
      name: "MB001",
      email: "mb001@manmadhan.org",
      role: "MEMBER",
      department: "Execution & UI",
      status: "Active",
      managerId: "co-ss0778",
      managerName: "SS0778",
      projectsCount: 2,
      tasksCount: 5,
      completedTasks: 3,
      inProgressTasks: 1,
      overdueTasks: 1,
      focusTime: "3h 24m",
      sessionsCount: 4,
      onTimeRate: 92,
      approvalRate: 88,
      recentWork: [
        {
          id: "task-mk-1",
          title: "Dashboard Redesign & Responsive Viewport",
          projectName: "ManMadhan Progress",
          status: "In Progress",
          priority: "High",
          deadline: "Aug 18",
          assignedTo: "MB001",
          supervisor: "SS0778 (CO-CEO)",
          approvalStatus: "Not submitted",
          createdAt: "Aug 13",
        },
        {
          id: "task-mk-2",
          title: "API Integration & Realtime Data Sync",
          projectName: "ManMadhan Progress",
          status: "Completed",
          priority: "Medium",
          deadline: "Aug 15",
          assignedTo: "MB001",
          supervisor: "SS0778 (CO-CEO)",
          approvalStatus: "Approved",
          createdAt: "Aug 09",
        },
      ],
    },
    {
      id: "mem-ae2358",
      name: "AE2358",
      email: "ae2358@manmadhan.org",
      role: "MEMBER",
      department: "Development & Data",
      status: "Active",
      managerId: "co-ss0778",
      managerName: "SS0778",
      projectsCount: 1,
      tasksCount: 4,
      completedTasks: 4,
      inProgressTasks: 0,
      overdueTasks: 0,
      focusTime: "4h 10m",
      sessionsCount: 5,
      onTimeRate: 96,
      approvalRate: 95,
      recentWork: [
        {
          id: "task-ae-1",
          title: "Database Migration & Query Optimization",
          projectName: "ManMadhan Backend",
          status: "Completed",
          priority: "High",
          deadline: "Aug 14",
          assignedTo: "AE2358",
          supervisor: "SS0778 (CO-CEO)",
          approvalStatus: "Approved",
          createdAt: "Aug 07",
        },
      ],
    },
    {
      id: "mem-mktest01",
      name: "MK-TEST-01",
      email: "mktest01@manmadhan.org",
      role: "MEMBER",
      department: "Quality & Testing",
      status: "Active",
      managerId: "co-tn0813",
      managerName: "TN0813",
      projectsCount: 1,
      tasksCount: 4,
      completedTasks: 3,
      inProgressTasks: 1,
      overdueTasks: 0,
      focusTime: "2h 15m",
      sessionsCount: 3,
      onTimeRate: 90,
      approvalRate: 87,
      recentWork: [
        {
          id: "task-test-1",
          title: "UI Accessibility & Keyboard Focus Audit",
          projectName: "ManMadhan QA",
          status: "In Progress",
          priority: "Medium",
          deadline: "Aug 19",
          assignedTo: "MK-TEST-01",
          supervisor: "TN0813 (CO-CEO)",
          approvalStatus: "In Progress",
          createdAt: "Aug 14",
        },
      ],
    },
  ],
};
