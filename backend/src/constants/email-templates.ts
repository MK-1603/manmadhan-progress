export type NotificationMode = "action" | "alert" | "digest" | "informational";
export type NotificationData = Record<
	string,
	string | number | boolean | null | undefined
>;

export interface NotificationTemplate {
	type: string;
	mode: NotificationMode;
	icon:
		| "shield"
		| "user-plus"
		| "check-circle"
		| "alert-triangle"
		| "bell"
		| "mail"
		| "credit-card"
		| "briefcase"
		| "key";
	subjectTemplate: (data: NotificationData) => string;
	titleTemplate: (data: NotificationData) => string;
	bodyTemplate: (data: NotificationData) => string[];
	actionText?: string;
	getDefaultActionUrl?: (data: NotificationData, clientUrl: string) => string;
}

export const AppEvents: Record<string, NotificationTemplate> = {
	// --- AUTH ---
	PASSWORD_RESET: {
		type: "PASSWORD_RESET",
		mode: "action",
		icon: "key",
		subjectTemplate: () => "Password Reset Request",
		titleTemplate: () => "Password Reset Request",
		bodyTemplate: () => [
			"We received a request to reset your ManMadhan Progress master password.",
		],
		actionText: "Reset Password",
		getDefaultActionUrl: (data, url) =>
			`${url}/api/auth/verify-reset?token=${data.token}`,
	},
	PASSWORD_CHANGED: {
		type: "PASSWORD_CHANGED",
		mode: "alert",
		icon: "shield",
		subjectTemplate: () => "Password Changed Successfully",
		titleTemplate: () => "Security Alert: Password Changed",
		bodyTemplate: () => [
			"Your ManMadhan Progress master password has been successfully updated.",
			"If you did not make this change, please contact your Workspace Administrator immediately.",
		],
		actionText: "Sign In Now",
		getDefaultActionUrl: (_data, url) => `${url}/login`,
	},
	OTP_LOGIN: {
		type: "OTP_LOGIN",
		mode: "informational",
		icon: "shield",
		subjectTemplate: () => "Authentication Code",
		titleTemplate: () => "Sign in to ManMadhan Progress",
		bodyTemplate: () => [
			"Please use the authentication code below to complete your sign in process.",
		],
	},
	NEW_DEVICE_LOGIN: {
		type: "NEW_DEVICE_LOGIN",
		mode: "alert",
		icon: "shield",
		subjectTemplate: () => "New Device Sign-In",
		titleTemplate: () => "New Device Detected",
		bodyTemplate: (data) => [
			`We detected a new sign-in to your account from a new device (${data.device || "Unknown"}).`,
		],
		actionText: "Review Account Security",
		getDefaultActionUrl: (_data, url) => `${url}/settings/security`,
	},
	MFA_ENABLED: {
		type: "MFA_ENABLED",
		mode: "informational",
		icon: "shield",
		subjectTemplate: () => "Two-Factor Authentication Enabled",
		titleTemplate: () => "Security Upgraded",
		bodyTemplate: () => [
			"Two-factor authentication has been successfully enabled on your account.",
		],
	},
	WELCOME_EMAIL: {
		type: "WELCOME_EMAIL",
		mode: "informational",
		icon: "user-plus",
		subjectTemplate: () => "Welcome to ManMadhan Progress",
		titleTemplate: () => "Welcome Aboard!",
		bodyTemplate: (data) => [
			`Hi ${data.userName}, welcome to ManMadhan Progress!`,
			"Your intelligent workspace is now fully configured and ready for execution.",
			"Get started by exploring your new dashboard and setting up your first project.",
		],
		actionText: "Go to Dashboard",
		getDefaultActionUrl: (_data, url) => `${url}/login`,
	},

	// --- WORKSPACE & ORG ---
	WORKSPACE_INVITE: {
		type: "WORKSPACE_INVITE",
		mode: "action",
		icon: "user-plus",
		subjectTemplate: (data) =>
			`You have been invited to join ${data.workspaceName}`,
		titleTemplate: (data) => `Invitation to ${data.workspaceName}`,
		bodyTemplate: (data) => [
			`${data.inviterName} has invited you to join their workspace on ManMadhan Progress.`,
		],
		actionText: "Accept Invitation",
		getDefaultActionUrl: (data, url) =>
			`${url.replace(/\/+$/, "")}/invite/${data.inviteToken}`,
	},
	ROLE_CHANGED: {
		type: "ROLE_CHANGED",
		mode: "informational",
		icon: "briefcase",
		subjectTemplate: (data) =>
			`Your role in ${data.workspaceName} has been updated`,
		titleTemplate: () => "Role Update",
		bodyTemplate: (data) => [
			`Your role has been updated to **${data.newRole}** in ${data.workspaceName}.`,
		],
	},
	ORG_CREATED: {
		type: "ORG_CREATED",
		mode: "informational",
		icon: "briefcase",
		subjectTemplate: (data) => `Organization ${data.orgName} Created`,
		titleTemplate: () => "Organization Created",
		bodyTemplate: (data) => [
			`The organization **${data.orgName}** has been successfully provisioned.`,
		],
		actionText: "View Organization",
		getDefaultActionUrl: (data, url) => `${url}/org/${data.orgId}`,
	},
	MEMBER_REMOVED: {
		type: "MEMBER_REMOVED",
		mode: "alert",
		icon: "alert-triangle",
		subjectTemplate: (data) => `Access Revoked: ${data.workspaceName}`,
		titleTemplate: () => "Workspace Access Revoked",
		bodyTemplate: (data) => [
			`Your access to the workspace **${data.workspaceName}** has been revoked by an administrator.`,
		],
	},

	// --- TASKS & PROJECTS ---
	TASK_ASSIGNED: {
		type: "TASK_ASSIGNED",
		mode: "action",
		icon: "bell",
		subjectTemplate: (data) => `New Task: ${data.taskTitle}`,
		titleTemplate: () => "New Task Assigned",
		bodyTemplate: (data) => [
			`You have been assigned a new task: **${data.taskTitle}** by ${data.assignerName}.`,
		],
		actionText: "View Task",
		getDefaultActionUrl: (data, url) => `${url}/tasks/${data.taskId}`,
	},
	TASK_COMPLETED: {
		type: "TASK_COMPLETED",
		mode: "informational",
		icon: "check-circle",
		subjectTemplate: (data) => `Task Completed: ${data.taskTitle}`,
		titleTemplate: () => "Task Completed",
		bodyTemplate: (data) => [
			`The task **${data.taskTitle}** has been marked as completed by ${data.userName}.`,
		],
		actionText: "View Task",
		getDefaultActionUrl: (data, url) => `${url}/tasks/${data.taskId}`,
	},
	MENTIONED_IN_COMMENT: {
		type: "MENTIONED_IN_COMMENT",
		mode: "action",
		icon: "mail",
		subjectTemplate: (data) => `${data.userName} mentioned you`,
		titleTemplate: () => "New Mention",
		bodyTemplate: (data) => [
			`${data.userName} mentioned you in a comment: "${data.commentExcerpt}"`,
		],
		actionText: "Reply",
		getDefaultActionUrl: (data, url) =>
			`${url}/tasks/${data.taskId}#comment-${data.commentId}`,
	},

	// --- SYSTEM ---
	MAINTENANCE_ALERT: {
		type: "MAINTENANCE_ALERT",
		mode: "alert",
		icon: "alert-triangle",
		subjectTemplate: () => "Scheduled Maintenance Alert",
		titleTemplate: () => "Scheduled Maintenance",
		bodyTemplate: (data) => [
			`ManMadhan Progress will undergo scheduled maintenance on ${data.date}. Expected downtime is ${data.duration}.`,
		],
	},
	STORAGE_LIMIT_WARNING: {
		type: "STORAGE_LIMIT_WARNING",
		mode: "alert",
		icon: "credit-card",
		subjectTemplate: () => "Storage Limit Approaching",
		titleTemplate: () => "Storage Limit Warning",
		bodyTemplate: (data) => [
			`Your workspace has used ${data.usedPercentage}% of its allocated storage.`,
		],
		actionText: "Upgrade Plan",
		getDefaultActionUrl: (_data, url) => `${url}/settings/billing`,
	},

	// --- AUTOMATION & REVIEWS ---
	AUTOMATION_ALERT: {
		type: "AUTOMATION_ALERT",
		mode: "alert",
		icon: "bell",
		subjectTemplate: (data) => (data.title ? String(data.title) : "Automation Alert"),
		titleTemplate: (data) => (data.title ? String(data.title) : "Automation Alert"),
		bodyTemplate: (data) => [
			String(data.message || "An automated execution workflow was triggered."),
		],
		actionText: "View Automation",
		getDefaultActionUrl: (_data, url) => `${url}/co-ceo/automation`,
	},
	AUTOMATION_TRIGGERED: {
		type: "AUTOMATION_TRIGGERED",
		mode: "informational",
		icon: "bell",
		subjectTemplate: (data) => (data.title ? String(data.title) : "Automation Triggered"),
		titleTemplate: (data) => (data.title ? String(data.title) : "Automation Executed"),
		bodyTemplate: (data) => [
			String(data.message || "An automation rule has executed successfully."),
		],
	},
	AUTOMATION_FAILED: {
		type: "AUTOMATION_FAILED",
		mode: "alert",
		icon: "alert-triangle",
		subjectTemplate: (data) => (data.title ? String(data.title) : "Automation Failed"),
		titleTemplate: (data) => (data.title ? String(data.title) : "Automation Error"),
		bodyTemplate: (data) => [
			String(data.message || "An automation rule execution encountered an error."),
		],
	},
	TASK_SUBMITTED: {
		type: "TASK_SUBMITTED",
		mode: "action",
		icon: "check-circle",
		subjectTemplate: (data) => `Task Submitted: ${data.taskTitle || "Work Submission"}`,
		titleTemplate: () => "Work Submitted for Review",
		bodyTemplate: (data) => [
			`${data.userName || "Team Member"} submitted work for task "${data.taskTitle || "Task"}".`,
		],
		actionText: "Review Submission",
		getDefaultActionUrl: (_data, url) => `${url}/co-ceo/approvals`,
	},
	TASK_APPROVED: {
		type: "TASK_APPROVED",
		mode: "informational",
		icon: "check-circle",
		subjectTemplate: (data) => `Task Approved: ${data.taskTitle || "Work Approved"}`,
		titleTemplate: () => "Submission Approved",
		bodyTemplate: (data) => [
			`Your submission for task "${data.taskTitle || "Task"}" has been approved.`,
		],
	},
	TASK_CHANGES_REQUESTED: {
		type: "TASK_CHANGES_REQUESTED",
		mode: "alert",
		icon: "alert-triangle",
		subjectTemplate: (data) => `Changes Requested: ${data.taskTitle || "Task Review"}`,
		titleTemplate: () => "Changes Requested",
		bodyTemplate: (data) => [
			`Changes have been requested for task "${data.taskTitle || "Task"}": ${data.feedback || "Please review notes."}`,
		],
	},
	DEADLINE_APPROACHING: {
		type: "DEADLINE_APPROACHING",
		mode: "alert",
		icon: "bell",
		subjectTemplate: (data) => `Deadline Approaching: ${data.taskTitle || "Task"}`,
		titleTemplate: () => "Deadline Approaching",
		bodyTemplate: (data) => [
			`Task "${data.taskTitle || "Task"}" is due soon.`,
		],
	},
	TASK_OVERDUE: {
		type: "TASK_OVERDUE",
		mode: "alert",
		icon: "alert-triangle",
		subjectTemplate: (data) => `Task Overdue: ${data.taskTitle || "Task"}`,
		titleTemplate: () => "Task Overdue",
		bodyTemplate: (data) => [
			`Task "${data.taskTitle || "Task"}" has passed its deadline and is overdue.`,
		],
	},
	DAILY_MOTIVATION: {
		type: "DAILY_MOTIVATION",
		mode: "informational",
		icon: "bell",
		subjectTemplate: (data) => (data.title ? String(data.title) : "Daily Execution Motivation"),
		titleTemplate: (data) => (data.title ? String(data.title) : "Daily Motivation"),
		bodyTemplate: (data) => [
			String(data.message || "Stay focused on execution today."),
		],
	},
};
