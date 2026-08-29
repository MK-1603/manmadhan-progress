export type TaskSource = "manual" | "prompt" | "template" | "automation";

export type TaskPriority = "Low" | "Medium" | "High" | "Critical";

export type TaskType =
  | "Development"
  | "Design"
  | "Documentation"
  | "Testing"
  | "Research"
  | "Review"
  | "Meeting"
  | "Administrative"
  | "Custom";

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface TaskDraft {
  workspaceId?: string;
  creatorId?: string;
  source: TaskSource;
  templateId?: string;
  automationId?: string;

  // Basic Details
  title: string;
  description?: string;

  // Context
  projectId?: string;
  milestoneId?: string;
  workId?: string;

  // Assignment & Planning
  assigneeId?: string;
  priority: TaskPriority;
  type: TaskType;
  startAt?: string;
  dueAt?: string;
  estimatedMinutes: number;

  // Execution & Policy
  focusRequired: boolean;
  evidenceRequired: boolean;
  reviewRequired: boolean;

  // Advanced
  dependencies: string[];
  subtasks: TaskSubtask[];

  // Template/Type Specific Metadata
  learningTopic?: string;
  resourceUrl?: string;
  expectedOutcome?: string;
  docType?: string;
  researchTopic?: string;
  acceptanceCriteria?: string;
}

export function createEmptyTaskDraft(
  source: TaskSource = "manual",
  context?: { workspaceId?: string; projectId?: string; milestoneId?: string }
): TaskDraft {
  return {
    workspaceId: context?.workspaceId || "",
    source,
    title: "",
    description: "",
    projectId: context?.projectId || "",
    milestoneId: context?.milestoneId || "",
    priority: "Medium",
    type: "Development",
    estimatedMinutes: 60,
    focusRequired: false,
    evidenceRequired: false,
    reviewRequired: true,
    dependencies: [],
    subtasks: [],
  };
}

export function normalizeTaskDraft(raw: Partial<TaskDraft>): TaskDraft {
  return {
    workspaceId: raw.workspaceId || "",
    creatorId: raw.creatorId || undefined,
    source: raw.source || "manual",
    templateId: raw.templateId || undefined,
    automationId: raw.automationId || undefined,
    title: (raw.title || "").trim(),
    description: (raw.description || "").trim(),
    projectId: raw.projectId || undefined,
    milestoneId: raw.milestoneId || undefined,
    workId: raw.workId || undefined,
    assigneeId: raw.assigneeId || undefined,
    priority: raw.priority || "Medium",
    type: raw.type || "Development",
    startAt: raw.startAt || undefined,
    dueAt: raw.dueAt || undefined,
    estimatedMinutes: Number(raw.estimatedMinutes) || 60,
    focusRequired: Boolean(raw.focusRequired),
    evidenceRequired: Boolean(raw.evidenceRequired),
    reviewRequired: raw.reviewRequired !== undefined ? Boolean(raw.reviewRequired) : true,
    dependencies: Array.isArray(raw.dependencies) ? raw.dependencies : [],
    subtasks: Array.isArray(raw.subtasks) ? raw.subtasks : [],
    learningTopic: raw.learningTopic || undefined,
    resourceUrl: raw.resourceUrl || undefined,
    expectedOutcome: raw.expectedOutcome || undefined,
    docType: raw.docType || undefined,
    researchTopic: raw.researchTopic || undefined,
    acceptanceCriteria: raw.acceptanceCriteria || undefined,
  };
}
