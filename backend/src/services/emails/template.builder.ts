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
<table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 14px auto;">
  <tr>
    <td align="center" valign="middle" width="44" height="44" style="padding:0;">
      <img src="${BRAND_LOGO_URL}" width="44" height="44" alt="ManMadhan Progress Logo" style="display:block; width:44px; height:44px; border:0; border-radius:10px; object-fit:cover;" />
    </td>
  </tr>
</table>
<table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 24px auto;">
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
				<p style="margin:0 0 20px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">This is your first time logging in. Let's verify your account so you can get started.</p>
			`;
			ctaBtnText = ctaBtnText || "Verify & Continue →";
		} else if (isResetPassword) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">We received a request to reset the password for your <strong>ManMadhan Progress</strong> account.</p>
				<p style="margin:0 0 20px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">Use the code below to continue.</p>
			`;
			ctaBtnText = ctaBtnText || "Reset Password →";
		} else if (isResetLink) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">We received a request to reset your password.</p>
				<p style="margin:0 0 20px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">Use the button below to choose a new password.</p>
			`;
			ctaBtnText = ctaBtnText || "Reset Password →";
		} else if (isPasswordChanged) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">Your <strong>ManMadhan Progress</strong> password was successfully changed.</p>
				<p style="margin:0 0 20px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">If you made this change, no further action is needed. If you didn't change your password, please secure your account immediately.</p>
			`;
			ctaBtnText = ctaBtnText || "Secure My Account →";
		} else if (isNewDevice) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">Your <strong>ManMadhan Progress</strong> account was just signed in from a new device.</p>
				<p style="margin:0 0 20px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">If this was you, no action is needed. If you don't recognize this sign-in, please secure your account immediately.</p>
			`;
			ctaBtnText = ctaBtnText || "Secure My Account →";
		} else if (isInactiveNotice) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">You haven't signed in to <strong>ManMadhan Progress</strong> in a while.</p>
				<p style="margin:0 0 20px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">Your workspace and progress items are ready whenever you want to pick up where you left off.</p>
			`;
			ctaBtnText = ctaBtnText || "Open ManMadhan Progress →";
		} else if (isCoCEOInvite) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">You've been invited to join <strong>ManMadhan Progress</strong> as a CO-CEO.</p>
				<p style="margin:0 0 20px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">You'll be able to work with the organization and manage executive responsibilities.</p>
			`;
			ctaBtnText = ctaBtnText || "Accept Invitation →";
		} else if (isMemberInvite) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">You've been invited to join the organization as a Member.</p>
				<p style="margin:0 0 20px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">Click the button below to accept your invitation and access your workspace.</p>
			`;
			ctaBtnText = ctaBtnText || "Accept Invitation →";
		} else if (otpCode && descriptions.length === 0) {
			messageContentHtml = `
				<p style="margin:0 0 12px 0; font-size:15px; line-height:24px; color:#27272A;" class="email-text-body">We received a request to verify your account for <strong>ManMadhan Progress</strong>.</p>
				<p style="margin:0 0 20px 0; font-size:14px; line-height:22px; color:#52525B;" class="email-text-body">Use the verification code below to continue.</p>
			`;
			ctaBtnText = ctaBtnText || "Verify & Continue →";
		} else if (descriptions.length > 0) {
			messageContentHtml = descriptions
				.map(
					(d) =>
						`<p style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#3F3F46;" class="email-text-body">${d}</p>`,
				)
				.join("");
			ctaBtnText = ctaBtnText || "Continue →";
		}

		/* ── OTP block ── */
		let otpHtml = "";
		if (otpCode && !isResetLink && !isInactiveNotice) {
			const boxLabel = isResetPassword ? "Your Reset Code" : "Verification Code";
			otpHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-box-bg"
                     style="background:#FAFAFA; border:1px solid #E4E4E7; border-radius:10px; padding:22px 16px; text-align:center;">
                <tr>
                  <td align="center" style="padding-bottom:6px;">
                    <span style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:#71717A;">${boxLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:6px 0 8px 0;">
                    <span style="font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,Courier,monospace; font-size:32px; font-weight:800; letter-spacing:0.25em; color:#09090B; display:inline-block; padding-left:0.25em;" class="email-text-title">${otpCode}</span>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <span style="font-size:12px; color:#71717A; font-weight:500;">This code expires in ${expiresIn}.</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
		}

		/* ── request details ── */
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
        <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-box-bg"
               style="margin:20px 0; background:#FAFAFA; border:1px solid #E4E4E7; border-radius:10px; padding:16px 20px;">
          <tr>
            <td>
              <p style="margin:0 0 10px 0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#71717A;">Request Details</p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">${rows}</table>
            </td>
          </tr>
        </table>`;
		}

		/* ── primary CTA button ── */
		let actionHtml = "";
		if (actionUrl) {
			actionHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:24px 0 16px 0;">
          <tr>
            <td align="left">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                href="${actionUrl}" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%"
                stroke="f" fillcolor="#111827">
                <w:anchorlock/>
                <center>
              <![endif]-->
              <a href="${actionUrl}"
                 style="background-color:#111827; border-radius:8px; color:#FFFFFF; display:inline-block; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; font-weight:600; line-height:44px; text-align:center; text-decoration:none; padding:0 28px; width:auto; min-width:180px; -webkit-text-size-adjust:none; mso-hide:all;">
                ${ctaBtnText}
              </a>
              <!--[if mso]></center></v:roundrect><![endif]-->
            </td>
          </tr>
        </table>`;
		}

		/* ── security note ── */
		let securityHtml = "";
		if (isInactiveNotice) {
			securityHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;">
          <tr>
            <td style="padding:16px; background-color:#FAFAFA; border:1px solid #E4E4E7; border-radius:10px;" class="email-box-bg">
              <p style="margin:0 0 6px 0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#71717A;">ACCOUNT ACTIVITY</p>
              ${lastActiveText ? `<p style="margin:0 0 4px 0; font-size:12px; color:#71717A;">Last Active: <strong style="color:#18181B;" class="email-text-title">${lastActiveText}</strong></p>` : ""}
              ${lastLoginText ? `<p style="margin:0 0 8px 0; font-size:12px; color:#71717A;">Last Login: <strong style="color:#18181B;" class="email-text-title">${lastLoginText}</strong></p>` : ""}
              <p style="margin:0 0 8px 0; font-size:12px; font-weight:600; color:#D9A514;">Status: Inactive for 2+ days</p>
              <p style="margin:0; font-size:11px; line-height:16px; color:#71717A;">If you did not expect this activity update, please review your account security.</p>
            </td>
          </tr>
        </table>`;
		} else if (isResetLink) {
			securityHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;">
          <tr>
            <td style="padding:16px; background-color:#FAFAFA; border:1px solid #E4E4E7; border-radius:10px;" class="email-box-bg">
              <p style="margin:0 0 6px 0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#71717A;">PASSWORD RESET</p>
              <p style="margin:0 0 8px 0; font-size:12px; line-height:18px; color:#3F3F46;" class="email-text-body">We received a password reset request for this account.</p>
              <p style="margin:0 0 8px 0; font-size:12px; line-height:18px; color:#71717A;">This reset link is secure and will expire after ${expiresIn}.</p>
              <p style="margin:0; font-size:12px; line-height:18px; color:#71717A;">If you didn't request this, no action is needed.</p>
            </td>
          </tr>
        </table>`;
		} else if (securityNotice) {
			const securityMessageText = isResetPassword
				? "Never share this code with anyone. If you didn't request a password reset, you can safely ignore this email — no changes will be made to your account."
				: "Never share this code with anyone. ManMadhan Progress will never ask you for your verification code or password.";
			securityHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;">
          <tr>
            <td style="padding:14px 18px; background-color:#FAFAFA; border:1px solid #F4F4F5; border-radius:8px;" class="email-box-bg">
              <p style="margin:0 0 4px 0; font-size:12px; font-weight:700; color:#18181B; text-transform:uppercase; letter-spacing:0.05em;" class="email-text-title">Keep your account secure</p>
              <p style="margin:0; font-size:12px; line-height:18px; color:#71717A;">${securityMessageText}</p>
            </td>
          </tr>
        </table>`;
		}

		/* ── fallback message ── */
		const fallbackHtml = `
      <p style="margin:16px 0 0 0; text-align:center; font-size:12px; color:#A1A1AA;">
        Didn't request this? You can safely ignore this email.
      </p>`;

		/* ── Single-Column layout for Reset Password Link ── */
		if (isResetLink) {
			const resetLinkBodyHtml = `
				${greetingHtml}
				${messageContentHtml}
				<table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0 24px 0;">
					<tr>
						<td align="center">
							<!--[if mso]>
							<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
								href="${actionUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="16%"
								stroke="f" fillcolor="#111827">
								<w:anchorlock/>
								<center>
							<![endif]-->
							<a href="${actionUrl}"
								 style="background-color:#111827; border-radius:8px; color:#FFFFFF; display:inline-block; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; font-size:14px; font-weight:600; line-height:48px; text-align:center; text-decoration:none; padding:0 32px; min-width:220px; max-width:260px; -webkit-text-size-adjust:none; mso-hide:all;">
								Reset Password →
							</a>
							<!--[if mso]></center></v:roundrect><![endif]-->
						</td>
					</tr>
				</table>
				<p style="margin:0 0 8px 0; text-align:center; font-size:13px; color:#71717A;">
					This link expires in ${expiresIn}.
				</p>
				<p style="margin:0 0 24px 0; text-align:center; font-size:13px; color:#71717A;">
					If you didn't request a password reset, you can safely ignore this email.
				</p>`;

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
    body{margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;}
    table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    @media only screen and (max-width:600px){
      .email-wrapper{padding:16px 12px!important;}
      .email-card{border-radius:10px!important;}
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
<body style="margin:0; padding:0; background-color:#F4F4F5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5; padding:40px 16px;">
    <tr>
      <td align="center">
        <!--[if mso]><table align="center" border="0" cellspacing="0" cellpadding="0" width="620"><tr><td><![endif]-->
        <table class="email-card" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:620px; background-color:#FFFFFF; border-radius:12px; border:1px solid #E4E4E7; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.03);">

          <!-- Gold subtle accent top border -->
          <tr>
            <td height="4" style="background-color:${accentColor}; font-size:0; line-height:0;">&nbsp;</td>
          </tr>

          <!-- Main Card Body -->
          <tr>
            <td class="email-body" style="padding:36px 40px 32px 40px;">
              ${BRAND_HEADER_HTML}

              ${resetLinkBodyHtml}

              <!-- Instagram ONLY Footer -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px; padding-top:24px; border-top:1px solid #F4F4F5;">
                <tr>
                  <td align="center">
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-bottom:12px; text-decoration:none;">
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td valign="middle" style="padding-right:6px;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                            </svg>
                          </td>
                          <td valign="middle">
                            <span style="font-size:12px; font-weight:500; color:#71717A;">Instagram</span>
                          </td>
                        </tr>
                      </table>
                    </a>
                    <p style="margin:0 0 4px 0; font-size:12px; color:#A1A1AA;">&copy; ${year} ManMadhan Progress. All rights reserved.</p>
                    <p style="margin:0; font-size:11px; color:#D4D4D8;">This is an automated email. Please do not reply.</p>
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

		/* ── Desktop 2-Column composition (60% Left / 40% Right) ── */
		const desktopBodyHtml = `
      <!--[if mso]><table border="0" cellspacing="0" cellpadding="0" width="100%"><tr><td width="330" valign="top"><![endif]-->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-col-left" style="width:60%; display:inline-block; vertical-align:top;">
        <tr>
          <td style="padding-right:16px;">
            ${greetingHtml}
            ${messageContentHtml}
            ${otpHtml}
            ${actionHtml}
          </td>
        </tr>
      </table>
      <!--[if mso]></td><td width="210" valign="top"><![endif]-->
      <table border="0" cellpadding="0" cellspacing="0" width="100%" class="email-col-right" style="width:38%; display:inline-block; vertical-align:top;">
        <tr>
          <td>
            ${detailsHtml}
            ${securityHtml}
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->`;

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
    body{margin:0;padding:0;background-color:#F4F4F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;}
    table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    @media only screen and (max-width:600px){
      .email-wrapper{padding:16px 12px!important;}
      .email-card{border-radius:10px!important;}
      .email-body{padding:24px 20px!important;}
      .email-col-left, .email-col-right{width:100%!important; display:block!important; padding-right:0!important;}
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
<body style="margin:0; padding:0; background-color:#F4F4F5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table class="email-wrapper" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F4F5; padding:40px 16px;">
    <tr>
      <td align="center">
        <!--[if mso]><table align="center" border="0" cellspacing="0" cellpadding="0" width="580"><tr><td><![endif]-->
        <table class="email-card" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:620px; background-color:#FFFFFF; border-radius:12px; border:1px solid #E4E4E7; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.03);">

          <!-- Gold subtle accent top border -->
          <tr>
            <td height="4" style="background-color:${accentColor}; font-size:0; line-height:0;">&nbsp;</td>
          </tr>

          <!-- Main Card Body -->
          <tr>
            <td class="email-body" style="padding:36px 36px 32px 36px;">
              ${BRAND_HEADER_HTML}

              ${desktopBodyHtml}

              ${fallbackHtml}

              <!-- Instagram ONLY Footer -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:32px; padding-top:24px; border-top:1px solid #F4F4F5;">
                <tr>
                  <td align="center">
                    <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" style="display:inline-block; margin-bottom:12px; text-decoration:none;">
                      <table border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td valign="middle" style="padding-right:6px;">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                              <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
                              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                              <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
                            </svg>
                          </td>
                          <td valign="middle">
                            <span style="font-size:12px; font-weight:500; color:#71717A;">Instagram</span>
                          </td>
                        </tr>
                      </table>
                    </a>
                    <p style="margin:0 0 4px 0; font-size:12px; color:#A1A1AA;">&copy; ${year} ManMadhan Progress. All rights reserved.</p>
                    <p style="margin:0; font-size:11px; color:#D4D4D8;">This is an automated email. Please do not reply.</p>
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



