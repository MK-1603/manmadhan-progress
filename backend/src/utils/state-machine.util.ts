// State Machine Utility for Tasks and Projects

export type TaskStatus =
	| "Draft"
	| "Assigned"
	| "Accepted"
	| "In Progress"
	| "Blocked"
	| "Review"
	| "Approved"
	| "Completed"
	| "Archived";
export type ProjectStatus =
	| "Planning"
	| "Active"
	| "Paused"
	| "Completed"
	| "Archived"
	| "Cancelled";

export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
	Draft: ["Assigned", "In Progress", "Archived"],
	Assigned: ["Draft", "Accepted", "In Progress", "Archived"],
	Accepted: ["In Progress", "Blocked", "Archived"],
	"In Progress": ["Blocked", "Review", "Completed", "Archived"], // Review = Submitted
	Blocked: ["In Progress", "Archived"],
	Review: ["In Progress", "Approved", "Blocked", "Archived"], // Moving back to In Progress = Rejected
	Approved: ["Completed", "Archived"],
	Completed: ["Archived"],
	Archived: ["Draft"],
};

export const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
	Planning: ["Active", "Paused", "Cancelled", "Archived"],
	Active: ["Paused", "Completed", "Cancelled", "Archived"],
	Paused: ["Active", "Cancelled", "Archived"],
	Completed: ["Archived"],
	Archived: ["Planning"], // Restore
	Cancelled: ["Archived"],
};

export const isValidTaskTransition = (
	current: TaskStatus,
	next: TaskStatus,
): boolean => {
	if (current === next) return true;
	return TASK_TRANSITIONS[current]?.includes(next) || false;
};

export const isValidProjectTransition = (
	current: ProjectStatus,
	next: ProjectStatus,
): boolean => {
	if (current === next) return true;
	return PROJECT_TRANSITIONS[current]?.includes(next) || false;
};
