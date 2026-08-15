import fs from "node:fs";
import path from "node:path";
import { EmailTemplateBuilder } from "../src/services/emails/template.builder";
import { emailService } from "../src/services/email.service";

async function verifyEmailTemplates() {
	console.log("=== 1. VERIFYING EMAIL TEMPLATE GENERATION ===");

	const scratchDir = path.resolve(__dirname, "../../scratch");
	if (!fs.existsSync(scratchDir)) {
		fs.mkdirSync(scratchDir, { recursive: true });
	}

	// 1. Standard OTP Email
	const otpEmailHtml = EmailTemplateBuilder.build({
		title: "Verification Code",
		userName: "Sai Krishnan",
		otpCode: "724631",
		expiresIn: "10 minutes",
		actionUrl: "http://localhost:3000/login",
		actionText: "Verify & Continue →",
		securityNotice: true,
	});
	fs.writeFileSync(path.join(scratchDir, "otp_email_preview.html"), otpEmailHtml);
	console.log("✅ Rendered otp_email_preview.html");

	// 2. First Login Email
	const firstLoginEmailHtml = EmailTemplateBuilder.build({
		title: "Welcome to ManMadhan Progress",
		userName: "Sai Krishnan",
		isFirstLogin: true,
		otpCode: "859402",
		expiresIn: "10 minutes",
		actionUrl: "http://localhost:3000/login",
		actionText: "Verify & Continue →",
		securityNotice: true,
	});
	fs.writeFileSync(path.join(scratchDir, "first_login_email_preview.html"), firstLoginEmailHtml);
	console.log("✅ Rendered first_login_email_preview.html");

	// 3. Workspace Invitation Email
	const inviteHtml = emailService.buildTemplate({
		title: "Workspace Invitation",
		userName: "Alex Mercer",
		descriptions: [
			"<strong>Sai Krishnan</strong> has invited you to join the enterprise workspace as a <strong>CO-CEO</strong>.",
			"Click the button below to set up your account and securely join the workspace.",
		],
		actionUrl: "http://localhost:3000/setup/sample-token",
		actionText: "Accept Workspace Invitation →",
		securityNotice: true,
	});
	fs.writeFileSync(path.join(scratchDir, "invitation_email_preview.html"), inviteHtml);
	console.log("✅ Rendered invitation_email_preview.html");

	// 4. Task Assignment Email
	const taskHtml = emailService.buildTemplate({
		title: "New Task Assignment",
		userName: "Team Member",
		descriptions: [
			"You have been assigned a new task: <strong>Verify Cache Infrastructure Architecture</strong>.",
		],
		requestDetails: {
			"Task Title": "Verify Cache Infrastructure Architecture",
			"Project": "ManMadhan Progress",
			"Milestone": "03 — TRD",
			"Assigned By": "Sai Krishnan (CEO)",
			"Deadline": "2026-08-20",
		},
		actionUrl: "http://localhost:3000/ceo/my-work?taskId=123",
		actionText: "Review Assignment →",
		securityNotice: true,
	});
	fs.writeFileSync(path.join(scratchDir, "task_assignment_preview.html"), taskHtml);
	console.log("✅ Rendered task_assignment_preview.html");

	// ── 5. ASSERTION CHECKS ──
	console.log("\n=== 2. RUNNING DESIGN CONTRACT CHECKS ===");

	const allPreviews = [otpEmailHtml, firstLoginEmailHtml, inviteHtml, taskHtml];

	for (const html of allPreviews) {
		// Check LinkedIn is completely removed
		if (html.toLowerCase().includes("linkedin")) {
			throw new Error("❌ Validation Error: LinkedIn link found in email template!");
		}
		// Check Twitter / X is removed
		if (html.toLowerCase().includes("twitter") || html.toLowerCase().includes("x.com")) {
			throw new Error("❌ Validation Error: Twitter link found in email template!");
		}
		// Check Instagram is present
		if (!html.includes("instagram.com")) {
			throw new Error("❌ Validation Error: Instagram link missing from footer!");
		}
		// Check brand title
		if (!html.includes("ManMadhan Progress")) {
			throw new Error("❌ Validation Error: Brand title 'ManMadhan Progress' missing!");
		}
		// Check tagline
		if (!html.includes("Track. Focus. Achieve.")) {
			throw new Error("❌ Validation Error: Brand tagline 'Track. Focus. Achieve.' missing!");
		}
		// Check human fallback
		if (!html.includes("Didn't request this? You can safely ignore this email.")) {
			throw new Error("❌ Validation Error: Fallback message missing!");
		}
	}

	console.log("✅ All social media, brand asset, and layout contract checks PASSED!");
}

verifyEmailTemplates().catch((err) => {
	console.error("❌ Email template verification failed:", err);
	process.exit(1);
});
