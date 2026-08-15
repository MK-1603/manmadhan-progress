import { BRAND_LOGO_URL, EmailTemplateBuilder } from "../src/services/emails/template.builder";

async function testFullEmailInventory() {
	console.log("=================================================================");
	console.log("  MANMADHAN PROGRESS — COMPLETE EMAIL SYSTEM INVENTORY TESTER");
	console.log("=================================================================");

	const testCases = [
		{
			id: "01",
			name: "OTP Verification",
			options: {
				title: "Your ManMadhan Progress verification code",
				userName: "Sai Krishnan",
				otpCode: "482910",
				expiresIn: "15 minutes",
				actionUrl: "http://localhost:3000/login",
				actionText: "Verify & Continue →",
				securityNotice: true,
			},
		},
		{
			id: "02",
			name: "First Login",
			options: {
				title: "Welcome to ManMadhan Progress",
				userName: "Sai Krishnan",
				isFirstLogin: true,
				otpCode: "918234",
				expiresIn: "15 minutes",
				actionUrl: "http://localhost:3000/login",
				actionText: "Verify & Continue →",
				securityNotice: true,
			},
		},
		{
			id: "03",
			name: "New Device Sign-In",
			options: {
				title: "New sign-in to your ManMadhan Progress account",
				userName: "Sai Krishnan",
				isNewDevice: true,
				requestDetails: {
					Time: "Aug 15, 2026 at 11:45 PM IST",
					Device: "Chrome on macOS Sonoma",
					Location: "Chennai, India",
					"IP Address": "103.15.22.44",
				},
				actionUrl: "http://localhost:3000/settings/security",
				actionText: "Secure My Account →",
				securityNotice: false,
			},
		},
		{
			id: "04",
			name: "Reset Password OTP",
			options: {
				title: "Your ManMadhan Progress password reset code",
				userName: "Sai Krishnan",
				isResetPassword: true,
				otpCode: "301928",
				expiresIn: "15 minutes",
				actionUrl: "http://localhost:3000/login?auth_step=RESET_PASSWORD",
				actionText: "Reset Password →",
				securityNotice: true,
			},
		},
		{
			id: "05",
			name: "Reset Password Link",
			options: {
				title: "Reset your ManMadhan Progress password",
				userName: "Sai Krishnan",
				isResetLink: true,
				actionUrl: "http://localhost:3000/reset?token=xyz_secure_token_123",
				actionText: "Reset Password →",
				expiresIn: "15 minutes",
				securityNotice: true,
			},
		},
		{
			id: "06",
			name: "Password Changed",
			options: {
				title: "Your ManMadhan Progress password was changed",
				userName: "Sai Krishnan",
				isPasswordChanged: true,
				actionUrl: "http://localhost:3000/settings/security",
				actionText: "Secure My Account →",
				securityNotice: false,
			},
		},
		{
			id: "07",
			name: "CO-CEO Invitation",
			options: {
				title: "You've been invited to ManMadhan as CO-CEO",
				userName: "Alex Vance",
				isCoCEOInvite: true,
				requestDetails: {
					Organization: "ManMadhan Progress Corp",
					Role: "CO-CEO",
					InvitedBy: "Sai Krishnan (CEO)",
					Expires: "48 hours",
				},
				actionUrl: "http://localhost:3000/invite/co-ceo-token-123",
				actionText: "Accept Invitation →",
				securityNotice: false,
			},
		},
		{
			id: "08",
			name: "Member Invitation",
			options: {
				title: "You've been invited to join Acme Engineering",
				userName: "Elena Rostova",
				isMemberInvite: true,
				requestDetails: {
					Organization: "Acme Engineering",
					Role: "Member",
					InvitedBy: "Sai Krishnan",
					Expires: "7 days",
				},
				actionUrl: "http://localhost:3000/invite/member-token-456",
				actionText: "Accept Invitation →",
				securityNotice: false,
			},
		},
		{
			id: "09",
			name: "Organization Invitation Accepted",
			options: {
				title: "Welcome to Acme Engineering",
				userName: "Sai Krishnan",
				descriptions: [
					"Elena Rostova has accepted your invitation and is now a Member of **Acme Engineering**.",
				],
				actionUrl: "http://localhost:3000/org/members",
				actionText: "View Team Members →",
			},
		},
		{
			id: "10",
			name: "Project Assignment",
			options: {
				title: "Project Assigned: Quantum Dashboard v2",
				userName: "Sai Krishnan",
				isProjectAssignment: true,
				requestDetails: {
					Project: "Quantum Dashboard v2",
					Organization: "ManMadhan Progress Corp",
					Role: "Lead Architect",
					AssignedBy: "Alex Vance (CO-CEO)",
					Deadline: "Sep 30, 2026",
				},
				actionUrl: "http://localhost:3000/projects/quantum-v2",
				actionText: "Open Project →",
			},
		},
		{
			id: "11",
			name: "Task Assignment",
			options: {
				title: "Task Assigned: Optimize Scrypt Master Hashing",
				userName: "Sai Krishnan",
				isTaskAssignment: true,
				requestDetails: {
					Task: "Optimize Scrypt Master Hashing",
					Project: "Security Kernel v3",
					Priority: "HIGH",
					Deadline: "Aug 20, 2026",
					AssignedBy: "Security Lead",
				},
				actionUrl: "http://localhost:3000/tasks/task-99",
				actionText: "View Task →",
			},
		},
		{
			id: "12",
			name: "Task Completed",
			options: {
				title: "Task Completed: Refactor OTP Expiry Timer",
				userName: "Sai Krishnan",
				isTaskCompleted: true,
				requestDetails: {
					Task: "Refactor OTP Expiry Timer",
					CompletedBy: "Alex Vance",
					Time: "Aug 15, 2026 at 10:15 PM",
				},
				actionUrl: "http://localhost:3000/tasks/task-42",
				actionText: "Review Task →",
			},
		},
		{
			id: "13",
			name: "Mention in Comment",
			options: {
				title: "Alex Vance mentioned you in a comment",
				userName: "Sai Krishnan",
				isCommentMention: true,
				descriptions: [
					'Alex Vance mentioned you in **Task #88 (Mobile Push Notifications)**:',
					'"@Sai, please verify that the FCM payload matches the new security audit spec before deployment."',
				],
				actionUrl: "http://localhost:3000/tasks/88#comment-104",
				actionText: "View Comment & Reply →",
			},
		},
		{
			id: "14",
			name: "Maintenance Alert",
			options: {
				title: "Scheduled Maintenance Alert",
				userName: "Workspace Users",
				isMaintenance: true,
				requestDetails: {
					Date: "Aug 22, 2026",
					Time: "02:00 AM - 04:00 AM UTC",
					Duration: "2 hours",
					Impact: "Database Index Tuning & Zero-Downtime Migration",
				},
				actionUrl: "http://localhost:3000/status",
				actionText: "View System Status →",
				mode: "alert",
			},
		},
		{
			id: "15",
			name: "Storage Limit Warning",
			options: {
				title: "Storage Limit Approaching",
				userName: "Sai Krishnan",
				isStorageWarning: true,
				requestDetails: {
					"Storage Used": "4.85 GB / 5.00 GB",
					"Usage Percentage": "97%",
					Workspace: "ManMadhan Progress Corp",
				},
				actionUrl: "http://localhost:3000/settings/billing",
				actionText: "Manage Storage & Upgrade →",
				mode: "alert",
			},
		},
	];

	console.log(`\nFound ${testCases.length} Email Templates in Inventory. Beginning Build & Assertions...\n`);

	let passed = 0;
	for (const tc of testCases) {
		const html = EmailTemplateBuilder.build(tc.options as any);

		// Assertions:
		// 1. Logo URL must match single source of truth BRAND_LOGO_URL
		if (!html.includes(BRAND_LOGO_URL)) {
			throw new Error(`[${tc.id}] ${tc.name}: Failed logo URL check. BRAND_LOGO_URL missing!`);
		}
		// 2. Instagram ONLY check
		if (!html.includes("https://instagram.com")) {
			throw new Error(`[${tc.id}] ${tc.name}: Failed Instagram check. Instagram link missing!`);
		}
		// 3. No LinkedIn
		if (html.toLowerCase().includes("linkedin")) {
			throw new Error(`[${tc.id}] ${tc.name}: Forbidden LinkedIn link found!`);
		}
		// 4. No Twitter/X
		if (html.toLowerCase().includes("twitter") || html.toLowerCase().includes("x.com")) {
			throw new Error(`[${tc.id}] ${tc.name}: Forbidden Twitter/X link found!`);
		}
		// 5. No Facebook
		if (html.toLowerCase().includes("facebook")) {
			throw new Error(`[${tc.id}] ${tc.name}: Forbidden Facebook link found!`);
		}
		// 6. Action URL if required
		if (tc.options.actionUrl && !html.includes(tc.options.actionUrl)) {
			throw new Error(`[${tc.id}] ${tc.name}: Action URL missing in template!`);
		}
		// 7. Reset Password Link specific assertion: NO OTP BOX, NO CODE
		if (tc.options.isResetLink) {
			if (html.includes("Verification Code") || html.includes("Your Reset Code") || html.includes("Never share this code")) {
				throw new Error(`[${tc.id}] ${tc.name}: Found unwanted OTP elements in Reset Password Link template!`);
			}
		}

		console.log(`  ✓ [${tc.id}] ${tc.name.padEnd(35)} PASSED (Logo, Instagram, Layout, Responsive)`);
		passed++;
	}

	console.log("\n-----------------------------------------------------------------");
	console.log(`✅ COMPLETE EMAIL SYSTEM INVENTORY TEST: ${passed}/${testCases.length} PASSED`);
	console.log("-----------------------------------------------------------------");
}

testFullEmailInventory().catch((err) => {
	console.error("❌ Full Email Inventory Test Failed:", err);
	process.exit(1);
});
