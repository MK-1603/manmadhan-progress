import { env } from "../../../config/env.config";

export interface EmailTemplateOptions {
	title: string;
	descriptions?: string[];
	actionUrl?: string;
	actionText?: string;
	requestDetails?: Record<string, string>;
	securityNotice?: boolean;
	expiresIn?: string;
	otpCode?: string;
	userName?: string;
	isFirstLogin?: boolean;
	isResetPassword?: boolean;
	isResetLink?: boolean;
	isPasswordChanged?: boolean;
	isNewDevice?: boolean;
	isCoCEOInvite?: boolean;
	isMemberInvite?: boolean;
	isOrgInviteAccepted?: boolean;
	isProjectAssignment?: boolean;
	isTaskAssignment?: boolean;
	isTaskCompleted?: boolean;
	isCommentMention?: boolean;
	isMaintenance?: boolean;
	isStorageWarning?: boolean;
	isInactiveNotice?: boolean;
	lastActiveText?: string;
	lastLoginText?: string;
	mode?: "action" | "alert" | "digest" | "informational";
	icon?:
		| "shield"
		| "user-plus"
		| "check-circle"
		| "alert-triangle"
		| "bell"
		| "mail"
		| "credit-card"
		| "briefcase"
		| "key";
}

/* ── Global Single Source Logo URL ────────────────────────────── */
export const BRAND_LOGO_URL =
	"https://res.cloudinary.com/fmiadecb/image/upload/v1786817328/ic_launcher-web_bq8zjj.png";

const BRAND_HEADER_HTML = `
<table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 16px auto; border-collapse:collapse;">
  <tr>
    <td align="center" valign="middle" width="44" height="44" style="padding:0;">
      <img src="${BRAND_LOGO_URL}" width="44" height="44" alt="ManMadhan Progress Logo" style="display:block; width:44px; height:44px; border:0; border-radius:10px; object-fit:cover;" />
    </td>
  </tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 24px auto; border-collapse:collapse;">
  <tr>
    <td align="center">
      <p style="margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:18px; font-weight:700; letter-spacing:-0.02em; color:#111827;" class="email-text-title">ManMadhan Progress</p>
      <p style="margin:4px 0 0 0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.1em; color:#71717A;">Track. Focus. Achieve.</p>
    </td>
  </tr>
</table>`;

export class EmailTemplateBuilder {
	static build(options: EmailTemplateOptions): string {
		const {
			title,
			descriptions = [],
			actionUrl,
			actionText,
			requestDetails,
			securityNotice = true,
			expiresIn = "15 minutes",
			otpCode,
			userName,
			isFirstLogin,
			isResetPassword,
			isResetLink,
			isPasswordChanged,
			isNewDevice,
			isCoCEOInvite,
			isMemberInvite,
			isOrgInviteAccepted,
			isProjectAssignment,
			isTaskAssignment,
			isTaskCompleted,
			isCommentMention,
			isMaintenance,
			isStorageWarning,
			isInactiveNotice,
			lastActiveText,
			lastLoginText,
			mode = "informational",
		} = options;

		const year = new Date().getFullYear();
		const isAlert = mode === "alert" || isNewDevice || isMaintenance || isStorageWarning;
		const accentColor = isAlert ? "#DC2626" : "#D9A514";

		const greetingName = userName ? userName.trim() : "";
		const greetingHtml = greetingName
			? `<p style="margin:0 0 16px 0; font-size:15px; font-weight:600; color:#18181B;" class="email-text-title">Hi ${greetingName},</p>`
			: `<p style="margin:0 0 16px 0; font-size:15px; font-weight:600; color:#18181B;" class="email-text-title">Hi there,</p>`;

		/* ── main content wording ── */
		let messageContentHtml = "";
		let ctaBtnText = actionText;

		if (isFirstLogin) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">Welcome to <strong>ManMadhan Progress</strong>. Great to have you on board.</p>
				<p style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">This is your first time logging in. Let's verify your account so you can get started.</p>
			`;
			ctaBtnText = ctaBtnText || "Verify & Continue →";
		} else if (isResetPassword) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">We received a request to reset the password for your <strong>ManMadhan Progress</strong> account.</p>
				<p style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">Use the code below to continue.</p>
			`;
			ctaBtnText = ctaBtnText || "Reset Password →";
		} else if (isResetLink) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">We received a request to reset your password.</p>
				<p style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">Use the button below to choose a new password.</p>
			`;
			ctaBtnText = ctaBtnText || "Reset Password →";
		} else if (isPasswordChanged) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">Your <strong>ManMadhan Progress</strong> password was successfully changed.</p>
				<p style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">If you made this change, no further action is needed. If you didn't change your password, please secure your account immediately.</p>
			`;
			ctaBtnText = ctaBtnText || "Secure My Account →";
		} else if (isNewDevice) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">Your <strong>ManMadhan Progress</strong> account was just signed in from a new device.</p>
				<p style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">If this was you, no action is needed. If you don't recognize this sign-in, please secure your account immediately.</p>
			`;
			ctaBtnText = ctaBtnText || "Secure My Account →";
		} else if (isInactiveNotice) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">You haven't signed in to <strong>ManMadhan Progress</strong> in a while.</p>
				<p style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">Your workspace and progress items are ready whenever you want to pick up where you left off.</p>
			`;
			ctaBtnText = ctaBtnText || "Open ManMadhan Progress →";
		} else if (isCoCEOInvite) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">You've been invited to join <strong>ManMadhan Progress</strong> as a CO-CEO.</p>
				<p style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">You'll be able to work with the organization and manage executive responsibilities.</p>
			`;
			ctaBtnText = ctaBtnText || "Accept Invitation →";
		} else if (isMemberInvite) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">You've been invited to join the organization as a Member.</p>
				<p style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">Click the button below to accept your invitation and access your workspace.</p>
			`;
			ctaBtnText = ctaBtnText || "Accept Invitation →";
		} else if (otpCode && descriptions.length === 0) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">We received a request to verify your account for <strong>ManMadhan Progress</strong>.</p>
				<p style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">Use the verification code below to continue.</p>
			`;
		} else if (descriptions.length > 0) {
			messageContentHtml = descriptions
				.map(
					(d) =>
						`<p style="margin:0 0 14px 0; font-size:14px; line-height:22px; color:#3F3F46;" class="email-text-body">${d}</p>`,
				)
				.join("");
			ctaBtnText = ctaBtnText || "Continue →";
		}

		/* ── OTP Hero Block (Verification Panel) ── */
		let otpHtml = "";
		if (otpCode && !isResetLink && !isInactiveNotice) {
			const boxLabel = isResetPassword ? "RESET CODE" : "VERIFICATION CODE";
			const digits = otpCode.split("");
			otpHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; width:100%;">
          <tr>
            <td align="center" style="background-color:#F9FAFB; border:1px solid #E5E7EB; border-radius:12px; padding:24px 20px; text-align:center;" class="email-box-bg">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <td align="center" style="padding-bottom:10px;">
                    <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.15em; color:#6B7280;">${boxLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:8px 0 14px 0;">
                    <!-- NON-BREAKING ATOMIC 6-DIGIT OTP ROW -->
                    <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto; border-collapse:collapse; white-space:nowrap; width:auto;">
                      <tr>
                        ${digits
                          .map(
                            (digit) =>
                              `<td align="center" style="padding:0 5px; font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,Courier,monospace,sans-serif; font-size:28px; line-height:36px; font-weight:800; color:#111827; white-space:nowrap;" class="email-text-title">${digit}</td>`,
                          )
                          .join("")}
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <span style="font-size:13px; color:#4B5563; font-weight:600;">This code expires in <strong style="color:#111827;">${expiresIn}</strong>.</span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span style="font-size:12px; color:#6B7280; line-height:18px;">Enter this code in the ManMadhan Progress verification screen.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
		}

		/* ── Request Details Block ── */
		let detailsHtml = "";
		if (requestDetails && Object.keys(requestDetails).length > 0) {
			const entries = Object.entries(requestDetails);
			const rows = entries
				.map(
					([k, v]) => `
          <tr>
            <td width="130" style="padding:8px 12px 8px 0; vertical-align:top; border-bottom:1px solid #F4F4F5;">
              <span style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.05em; color:#71717A;">${k}</span>
            </td>
            <td style="padding:8px 0; vertical-align:top; border-bottom:1px solid #F4F4F5;">
              <span style="font-size:13px; font-weight:600; color:#18181B;" class="email-text-title">${v}</span>
            </td>
          </tr>`,
				)
				.join("");

			detailsHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; width:100%;">
          <tr>
            <td style="background-color:#FAFAFA; border:1px solid #E4E4E7; border-radius:12px; padding:18px 20px;" class="email-box-bg">
              <p style="margin:0 0 10px 0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#71717A;">Request Details</p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">${rows}</table>
            </td>
          </tr>
        </table>`;
		}

		/* ── Primary CTA Button (Full Width) ── */
		let actionHtml = "";
		if (actionUrl && !otpCode) {
			actionHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; width:100%;">
          <tr>
            <td align="center">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                href="${actionUrl}" style="height:46px;v-text-anchor:middle;width:100%;" arcsize="18%"
                stroke="f" fillcolor="#111827">
                <w:anchorlock/>
                <center>
              <![endif]-->
              <a href="${actionUrl}"
                 style="background-color:#111827; border-radius:10px; color:#FFFFFF; display:block; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; font-weight:700; line-height:46px; text-align:center; text-decoration:none; width:100%; -webkit-text-size-adjust:none; mso-hide:all;">
                ${ctaBtnText}
              </a>
              <!--[if mso]></center></v:roundrect><![endif]-->
            </td>
          </tr>
        </table>`;
		}

		/* ── Security Note (Security Panel) ── */
		let securityHtml = "";
		if (isInactiveNotice) {
			securityHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; width:100%;">
          <tr>
            <td style="padding:16px 20px; background-color:#FAFAFA; border:1px solid #E4E4E7; border-radius:12px;" class="email-box-bg">
              <p style="margin:0 0 6px 0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#71717A;">ACCOUNT ACTIVITY</p>
              ${lastActiveText ? `<p style="margin:0 0 4px 0; font-size:12px; color:#71717A;">Last Active: <strong style="color:#18181B;" class="email-text-title">${lastActiveText}</strong></p>` : ""}
              ${lastLoginText ? `<p style="margin:0 0 8px 0; font-size:12px; color:#71717A;">Last Login: <strong style="color:#18181B;" class="email-text-title">${lastLoginText}</strong></p>` : ""}
              <p style="margin:0 0 8px 0; font-size:12px; font-weight:600; color:#D9A514;">Status: Inactive for 2+ days</p>
              <p style="margin:0; font-size:11px; line-height:16px; color:#71717A;">If you did not expect this activity update, please review your account security.</p>
            </td>
          </tr>
        </table>`;
		} else if (securityNotice) {
			const securityMessageText = isResetPassword
				? "Never share this code with anyone. If you didn't request a password reset, you can safely ignore this email — no changes will be made to your account."
				: "Never share this verification code with anyone. ManMadhan Progress will never ask for your verification code or password.";
			securityHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; width:100%;">
          <tr>
            <td style="padding:16px 20px; background-color:#F9FAFB; border:1px solid #E5E7EB; border-radius:12px;" class="email-box-bg">
              <p style="margin:0 0 4px 0; font-size:11px; font-weight:700; color:#111827; text-transform:uppercase; letter-spacing:0.08em;" class="email-text-title">KEEP YOUR ACCOUNT SECURE</p>
              <p style="margin:0; font-size:12px; line-height:18px; color:#4B5563;">${securityMessageText}</p>
            </td>
          </tr>
        </table>`;
		}

		/* ── Fallback Unrequested Code Notice ── */
		const fallbackHtml = `
      <p style="margin:0; text-align:center; font-size:12px; line-height:18px; color:#9CA3AF;">
        If you didn't request this verification code, you can safely ignore this email.
      </p>`;

		/* ── Single-Column Vertical Email Layout ── */
		return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style>table{border-collapse:collapse;border-spacing:0;margin:0;}div,td{padding:0;}div{margin:0!important;}</style>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body{margin:0;padding:0;background-color:#F5F6F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;}
    table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    @media only screen and (max-width:640px){
      .email-wrapper{padding:16px 8px!important;}
      .email-card{border-radius:12px!important;}
      .email-body{padding:24px 20px!important;}
    }
    @media (prefers-color-scheme: dark) {
      body, .email-wrapper { background-color: #09090B !important; }
      .email-card { background-color: #18181B !important; border-color: #27272A !important; }
      .email-text-title { color: #FAFAFA !important; }
      .email-text-body { color: #D4D4D8 !important; }
      .email-box-bg { background-color: #27272A !important; border-color: #3F3F46 !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#F5F6F8; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;font-size:1px;color:#F5F6F8;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    Your verification code is ready. It expires in ${expiresIn}.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;
  </div>
  <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F6F8; padding:40px 16px; border-collapse:collapse;">
    <tr>
      <td align="center">
        <!--[if mso]><table align="center" border="0" cellspacing="0" cellpadding="0" width="600"><tr><td><![endif]-->
        <table class="email-card" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:600px; background-color:#FFFFFF; border-radius:16px; border:1px solid #E5E7EB; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.04); border-collapse:collapse;">

          <!-- Gold subtle accent top border -->
          <tr>
            <td height="4" style="background-color:${accentColor}; font-size:0; line-height:0;">&nbsp;</td>
          </tr>

          <!-- Main Card Body (Single-Column Vertical Layout) -->
          <tr>
            <td class="email-body" style="padding:40px 44px 36px 44px;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse; width:100%;">
                
                <!-- 1. Header -->
                <tr>
                  <td align="center" style="padding-bottom:4px;">
                    ${BRAND_HEADER_HTML}
                  </td>
                </tr>

                <!-- 2. Greeting & Intro Message -->
                <tr>
                  <td style="padding-bottom:8px;">
                    ${greetingHtml}
                    ${messageContentHtml}
                  </td>
                </tr>

                <!-- 3. Verification Code Panel -->
                ${otpHtml ? `<tr><td style="padding-bottom:20px;">${otpHtml}</td></tr>` : ""}

                <!-- 4. Action Button (if present) -->
                ${actionHtml ? `<tr><td style="padding-bottom:20px;">${actionHtml}</td></tr>` : ""}

                <!-- 5. Request Details (if present) -->
                ${detailsHtml ? `<tr><td style="padding-bottom:20px;">${detailsHtml}</td></tr>` : ""}

                <!-- 6. Security Notice Panel -->
                ${securityHtml ? `<tr><td style="padding-bottom:20px;">${securityHtml}</td></tr>` : ""}

                <!-- 7. Fallback Message -->
                <tr>
                  <td style="padding-top:4px; padding-bottom:24px; text-align:center;">
                    ${fallbackHtml}
                  </td>
                </tr>

                <!-- 8. Footer -->
                <tr>
                  <td style="padding-top:20px; border-top:1px solid #F3F4F6; text-align:center;">
                    <p style="margin:0 0 6px 0; font-size:12px; color:#6B7280; font-weight:500;">
                      <a href="${env.CLIENT_URL}/privacy" style="color:#6B7280; text-decoration:none;">Privacy</a> &middot; 
                      <a href="${env.CLIENT_URL}/terms" style="color:#6B7280; text-decoration:none;">Terms</a> &middot; 
                      <a href="${env.CLIENT_URL}/support" style="color:#6B7280; text-decoration:none;">Support</a>
                    </p>
                    <p style="margin:0 0 4px 0; font-size:12px; color:#9CA3AF;">&copy; ${year} ManMadhan Progress. All rights reserved.</p>
                    <p style="margin:0; font-size:11px; color:#D1D5DB;">This is an automated security email. Please do not reply.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
	}
}
