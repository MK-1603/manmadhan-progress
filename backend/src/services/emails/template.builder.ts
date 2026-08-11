export interface EmailTemplateOptions {
	title: string;
	descriptions?: string[];
	actionUrl?: string;
	actionText?: string;
	requestDetails?: Record<string, string>;
	securityNotice?: boolean;
	expiresIn?: string;
	otpCode?: string;
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

/* ── SVG icons (dark stroke for light email bg) ─────────────────── */
const getSvgIcon = (iconName?: string, color = "#D9A514") => {
	switch (iconName) {
		case "shield":
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
		case "user-plus":
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`;
		case "check-circle":
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
		case "alert-triangle":
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
		case "bell":
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
		case "mail":
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
		case "credit-card":
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
		case "briefcase":
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
		case "key":
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>`;
		default:
			return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
	}
};

/* ── brand logo mark as inline SVG ─────────────────────────────── */
const LOGO_SVG = `
<table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 20px auto;">
  <tr>
    <td align="center" valign="middle" width="52" height="52"
        style="background-color: #111827; border-radius: 14px; border: 1px solid #1F2937;">
      <svg width="30" height="30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 80V22L44 60V80H18Z" fill="#FFFFFF"/>
        <path d="M44 60L75 20H88L56 62V80H44V60Z" fill="#D9A514"/>
        <polygon points="60,20 88,20 77,38" fill="#F5CC6A"/>
      </svg>
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
			securityNotice,
			expiresIn,
			otpCode,
			mode = "informational",
			icon,
		} = options;

		const brandName = "ManMadhan Progress";
		const brandTagline = "ENTERPRISE EXECUTION OPERATING SYSTEM";
		const year = new Date().getFullYear();
		const isAlert = mode === "alert";
		const accentColor = isAlert ? "#DC2626" : "#D9A514"; // red or gold

		/* ── description paragraphs ── */
		const descriptionsHtml = descriptions
			.map(
				(d) =>
					`<p style="margin:0 0 16px 0;font-size:15px;line-height:26px;color:#374151;">${d}</p>`,
			)
			.join("");

		/* ── request details grid ── */
		let detailsHtml = "";
		if (requestDetails && Object.keys(requestDetails).length > 0) {
			const entries = Object.entries(requestDetails);
			const rows = entries
				.map(
					([k, v]) => `
          <tr>
            <td width="140" style="padding:10px 16px 10px 0;vertical-align:top;border-bottom:1px solid #F3F4F6;">
              <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#9CA3AF;">${k}</span>
            </td>
            <td style="padding:10px 0;vertical-align:top;border-bottom:1px solid #F3F4F6;">
              <span style="font-size:14px;font-weight:600;color:#111827;">${v}</span>
            </td>
          </tr>`,
				)
				.join("");

			detailsHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%"
               style="margin:28px 0;background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;overflow:hidden;">
          <tr><td style="padding:20px 24px;">
            <p style="margin:0 0 14px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#6B7280;">
              Request Details
            </p>
            <table border="0" cellpadding="0" cellspacing="0" width="100%">
              ${rows}
            </table>
          </td></tr>
        </table>`;
		}

		/* ── action button ── */
		const actionHtml =
			actionUrl && actionText
				? `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:36px 0 24px 0;">
          <tr>
            <td align="center">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
                href="${actionUrl}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="17%"
                stroke="f" fillcolor="${accentColor}">
                <w:anchorlock/>
                <center>
              <![endif]-->
              <a href="${actionUrl}"
                 style="background-color:${accentColor};border-radius:8px;color:${isAlert ? "#ffffff" : "#111827"};display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:700;line-height:48px;text-align:center;text-decoration:none;width:100%;max-width:280px;-webkit-text-size-adjust:none;mso-hide:all;">
                ${actionText}
              </a>
              <!--[if mso]></center></v:roundrect><![endif]-->
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:16px;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">Or copy and paste this link into your browser:</p>
              <p style="margin:6px 0 0 0;font-size:11px;word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">
                <a href="${actionUrl}" style="color:#6B7280;text-decoration:underline;">${actionUrl}</a>
              </p>
            </td>
          </tr>
        </table>`
				: "";

		/* ── OTP digit boxes ── */
		let otpHtml = "";
		if (otpCode) {
			const boxes = otpCode
				.split("")
				.map(
					(d) => `
          <td align="center" style="padding:0 4px;">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" valign="middle" width="44" height="52"
                    style="background:#FFFFFF;border:2px solid #E5E7EB;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:24px;font-weight:700;color:#111827;">
                  ${d}
                </td>
              </tr>
            </table>
          </td>`,
				)
				.join("");

			otpHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:36px 0;">
          <tr>
            <td align="center">
              <table border="0" cellpadding="0" cellspacing="0"
                     style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:14px;padding:28px 24px;display:inline-table;">
                <tr>
                  <td align="center" style="padding-bottom:14px;">
                    <p style="margin:0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#6B7280;">
                      Your Authorization Code
                    </p>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <table border="0" cellpadding="0" cellspacing="0"><tr>${boxes}</tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`;
		}

		/* ── expires badge ── */
		const expiresHtml = expiresIn
			? `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:20px;">
          <tr>
            <td align="center">
              <div style="display:inline-block;background:#FFFBEB;border:1px solid #FDE68A;padding:6px 16px;border-radius:20px;">
                <p style="margin:0;font-size:12px;font-weight:600;color:#92400E;">
                  &#x23F0; Expires in ${expiresIn}
                </p>
              </div>
            </td>
          </tr>
        </table>`
			: "";

		/* ── security notice ── */
		const securityHtml = securityNotice
			? `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top:40px;">
          <tr>
            <td style="padding:20px 24px;background:#F9FAFB;border-radius:10px;border:1px dashed #D1D5DB;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="28" valign="top" style="padding-right:12px;padding-top:2px;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    </svg>
                  </td>
                  <td>
                    <p style="margin:0 0 4px 0;font-size:13px;font-weight:600;color:#111827;">Security Notice</p>
                    <p style="margin:0;font-size:13px;line-height:20px;color:#6B7280;">
                      If you did not initiate this action, please ignore this email or contact your Workspace Administrator immediately.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`
			: "";

		/* ── icon badge ── */
		const iconBgColor = isAlert ? "#FEF2F2" : "#FFFBEB";
		const iconBorderColor = isAlert ? "#FECACA" : "#FDE68A";
		const iconBadgeHtml = icon
			? `
        <td width="52" valign="top" style="padding-right:16px;padding-top:2px;">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:10px;background:${iconBgColor};border:1px solid ${iconBorderColor};">
            ${getSvgIcon(icon, isAlert ? "#DC2626" : "#D9A514")}
          </div>
        </td>`
			: "";

		return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <style>table{border-collapse:collapse;border-spacing:0;margin:0;}div,td{padding:0;}div{margin:0!important;}</style>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body{margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-font-smoothing:antialiased;}
    table{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}
    img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;}
    @media only screen and (max-width:600px){
      .wrapper{padding:20px 12px!important;}
      .card{border-radius:12px!important;}
      .header-pad{padding:32px 24px 24px!important;}
      .body-pad{padding:0 24px 32px!important;}
      .footer-pad{padding:24px!important;}
      h2{font-size:20px!important;}
    }
  </style>
</head>
<body>
  <table class="wrapper" width="100%" cellpadding="0" cellspacing="0"
         style="background-color:#F3F4F6;padding:48px 20px;">
    <tr>
      <td align="center">

        <!--[if mso]><table align="center" border="0" cellspacing="0" cellpadding="0" width="580"><tr><td><![endif]-->
        <table class="card" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:580px;background-color:#FFFFFF;border-radius:16px;border:1px solid #E5E7EB;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">

          <!-- accent stripe -->
          <tr>
            <td height="4" style="background-color:${accentColor};font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- header: logo + brand -->
          <tr>
            <td class="header-pad" align="center" style="padding:40px 48px 28px 48px;border-bottom:1px solid #F3F4F6;">
              ${LOGO_SVG}
              <p style="margin:0;font-size:19px;font-weight:800;letter-spacing:-0.03em;color:#111827;">${brandName}</p>
              <p style="margin:5px 0 0 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#9CA3AF;">${brandTagline}</p>
            </td>
          </tr>

          <!-- body -->
          <tr>
            <td class="body-pad" style="padding:32px 48px 44px 48px;">

              <!-- title row with optional icon -->
              <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #F3F4F6;">
                <tr>
                  ${iconBadgeHtml}
                  <td valign="middle">
                    <h2 style="margin:0;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.025em;line-height:1.3;">${title}</h2>
                  </td>
                </tr>
              </table>

              <!-- description paragraphs -->
              ${descriptionsHtml}

              <!-- OTP -->
              ${otpHtml}

              <!-- request details -->
              ${detailsHtml}

              <!-- action button + URL -->
              ${actionHtml}

              <!-- expires -->
              ${expiresHtml}

              <!-- security notice -->
              ${securityHtml}

            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td class="footer-pad" align="center"
                style="padding:24px 48px 32px 48px;background-color:#F9FAFB;border-top:1px solid #E5E7EB;">
              <p style="margin:0 0 12px 0;font-size:12px;color:#6B7280;">
                <a href="#" style="color:#6B7280;text-decoration:none;margin:0 10px;">Privacy Policy</a>&nbsp;&bull;&nbsp;
                <a href="#" style="color:#6B7280;text-decoration:none;margin:0 10px;">Terms of Service</a>&nbsp;&bull;&nbsp;
                <a href="#" style="color:#6B7280;text-decoration:none;margin:0 10px;">Security</a>
              </p>
              <p style="margin:0 0 4px 0;font-size:12px;color:#9CA3AF;">&copy; ${year} ${brandName}. All rights reserved.</p>
              <p style="margin:0;font-size:11px;color:#D1D5DB;">Enterprise Execution Operating System</p>
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
