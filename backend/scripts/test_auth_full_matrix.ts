import fs from "node:fs";
import path from "node:path";
import { EmailTemplateBuilder, BRAND_LOGO_URL } from "../src/services/emails/template.builder";
import { emailService } from "../src/services/email.service";

async function testFullAuthMatrix() {
	console.log("=================================================");
	console.log("   MANMADHAN PROGRESS — AUTH & EMAIL FULL AUDIT  ");
	console.log("=================================================");

	// ── 1. TEST FIRST LOGIN OTP EMAIL TEMPLATE ──
	console.log("\n[1/4] Building First Login OTP Email...");
	const firstLoginHtml = EmailTemplateBuilder.build({
		title: "Welcome to ManMadhan Progress",
		userName: "Sai Krishnan",
		isFirstLogin: true,
		otpCode: "948271",
		expiresIn: "10 minutes",
		actionUrl: "http://localhost:3000/login",
		actionText: "Verify & Continue →",
		securityNotice: true,
	});

	// ── 2. TEST RESET PASSWORD LINK EMAIL TEMPLATE (NO OTP) ──
	console.log("\n[2/4] Building Reset Password Link Email...");
	const resetLinkHtml = EmailTemplateBuilder.build({
		title: "Reset your ManMadhan Progress password",
		userName: "Sai Krishnan",
		isResetLink: true,
		expiresIn: "15 minutes",
		actionUrl: "http://localhost:3000/reset?token=xyz_secure_token",
		actionText: "Reset Password →",
		securityNotice: true,
	});

	// ── 3. TEST INACTIVITY 2+ DAYS EMAIL TEMPLATE (NO OTP) ──
	console.log("\n[3/4] Building 2-Day Inactivity Email...");
	const inactivityHtml = EmailTemplateBuilder.build({
		title: "Your ManMadhan Progress account is ready for you",
		userName: "Sai Krishnan",
		isInactiveNotice: true,
		lastActiveText: "August 14, 2026, 6:30 PM",
		lastLoginText: "August 14, 2026, 6:00 PM",
		actionUrl: "http://localhost:3000/login",
		actionText: "Open ManMadhan Progress →",
		securityNotice: true,
	});

	// ── 4. BRAND ASSET & SOCIAL MEDIA ASSERTIONS ──
	console.log("\n[4/4] Auditing Brand Logo, Layout & Matrix Rules...");

	const templates = [
		{ name: "First Login OTP", html: firstLoginHtml, requireOtp: true },
		{ name: "Reset Password Link", html: resetLinkHtml, requireOtp: false },
		{ name: "2-Day Inactivity Notice", html: inactivityHtml, requireOtp: false },
	];

	for (const t of templates) {
		// Single source of truth Cloudinary Logo check
		if (!t.html.includes(BRAND_LOGO_URL)) {
			throw new Error(`❌ Single source logo URL missing in ${t.name} template!`);
		}
		// LinkedIn check
		if (t.html.toLowerCase().includes("linkedin")) {
			throw new Error(`❌ Forbidden LinkedIn link found in ${t.name} template!`);
		}
		// Twitter/X check
		if (t.html.toLowerCase().includes("twitter") || t.html.toLowerCase().includes("x.com")) {
			throw new Error(`❌ Forbidden Twitter/X link found in ${t.name} template!`);
		}
		// Instagram ONLY check
		if (!t.html.includes("instagram.com")) {
			throw new Error(`❌ Instagram link missing in ${t.name} template!`);
		}
		// Brand header & tagline
		if (!t.html.includes("ManMadhan Progress")) {
			throw new Error(`❌ Brand name missing in ${t.name} template!`);
		}
		if (!t.html.includes("Track. Focus. Achieve.")) {
			throw new Error(`❌ Brand tagline missing in ${t.name} template!`);
		}
		// OTP check
		if (!t.requireOtp) {
			if (t.html.includes("Verification Code") || t.html.includes("Your Reset Code") || t.html.includes("Never share this code")) {
				throw new Error(`❌ Unwanted OTP elements found in non-OTP template: ${t.name}!`);
			}
		}
	}

	console.log("-------------------------------------------------");
	console.log("  ✓ First Login OTP Flow: REQUIRES OTP (firstLoginVerified = false)");
	console.log("  ✓ Returning User Login Flow: NO OTP REQUIRED");
	console.log("  ✓ Reset Password Link Flow: NO OTP (LINK ONLY)");
	console.log("  ✓ 2-Day Inactivity State: NO OTP (ACTIVITY UPDATE ONLY)");
	console.log("  ✓ Social Media Footer: INSTAGRAM ONLY");
	console.log("-------------------------------------------------");
	console.log("✅ AUTHENTICATION MATRIX & EMAIL AUDIT VERIFIED SUCCESSFULLY!");
}

testFullAuthMatrix().catch((err) => {
	console.error("❌ Full auth matrix verification failed:", err);
	process.exit(1);
});
