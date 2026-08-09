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
  icon?: "shield" | "user-plus" | "check-circle" | "alert-triangle" | "bell" | "mail" | "credit-card" | "briefcase" | "key";
}

const getSvgIcon = (iconName?: string, color: string = "#111827") => {
  switch (iconName) {
    case "shield": return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
    case "user-plus": return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>`;
    case "check-circle": return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
    case "alert-triangle": return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`;
    case "bell": return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;
    case "mail": return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`;
    case "credit-card": return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`;
    case "briefcase": return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`;
    case "key": return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/></svg>`;
    default: return "";
  }
};

export class EmailTemplateBuilder {
  static build(options: EmailTemplateOptions): string {
    const { title, descriptions, actionUrl, actionText, requestDetails, securityNotice, expiresIn, otpCode, mode = "informational", icon = "mail" } = options;

    const brandName = "ManMadhan Progress";
    const brandTagline = "Enterprise Execution Operating System";
    const currentYear = new Date().getFullYear();

    const descriptionsHtml = descriptions?.map(d => `<p style="margin: 0 0 18px 0; font-size: 15px; line-height: 26px; color: #3F3F46;">${d}</p>`).join("") || "";

    let detailsHtml = "";
    if (requestDetails && Object.keys(requestDetails).length > 0) {
      const keys = Object.keys(requestDetails);
      const rows = [];
      for (let i = 0; i < keys.length; i += 2) {
        const key1 = keys[i];
        const val1 = requestDetails[key1];
        const key2 = keys[i + 1];
        const val2 = key2 ? requestDetails[key2] : "";
        
        let rowHtml = `
          <tr>
            <td style="padding: 12px 0; width: 50%; vertical-align: top; border-bottom: 1px solid #F4F4F5;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #A1A1AA; margin-bottom: 4px;">${key1}</div>
              <div style="font-size: 14px; font-weight: 600; color: #09090B;">${val1}</div>
            </td>`;
            
        if (key2) {
          rowHtml += `
            <td style="padding: 12px 0 12px 24px; width: 50%; vertical-align: top; border-bottom: 1px solid #F4F4F5;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #A1A1AA; margin-bottom: 4px;">${key2}</div>
              <div style="font-size: 14px; font-weight: 600; color: #09090B;">${val2}</div>
            </td>
          </tr>`;
        } else {
          rowHtml += `
            <td style="width: 50%; border-bottom: 1px solid #F4F4F5;"></td>
          </tr>`;
        }
        rows.push(rowHtml);
      }
      
      detailsHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 32px 0; background-color: #FAFAFA; border: 1px solid #E4E4E7; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 24px;">
              <p style="margin: 0 0 16px 0; font-size: 12px; font-weight: 700; color: #09090B; text-transform: uppercase; letter-spacing: 0.05em;">Request Details</p>
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                ${rows.join("")}
              </table>
            </td>
          </tr>
        </table>
      `;
    }

    const buttonBgColor = options.mode === "alert" ? "#E11D48" : "#09090B"; // Rose 600 or Zinc 950
    const actionHtml = (actionUrl && actionText) ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 40px 0;">
        <tr>
          <td align="center">
            <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${actionUrl}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="13%" stroke="f" fillcolor="${buttonBgColor}">
                <w:anchorlock/>
                <center>
              <![endif]-->
                  <a href="${actionUrl}"
            style="background-color:${buttonBgColor};border-radius:8px;color:#ffffff;display:inline-block;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;line-height:48px;text-align:center;text-decoration:none;width:100%;max-width:280px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.05);-webkit-text-size-adjust:none;">${actionText}</a>
              <!--[if mso]>
                </center>
              </v:roundrect>
            <![endif]-->
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-top: 20px;">
            <p style="margin: 0; font-size: 12px; color: #71717A;">
              Or copy and paste this link into your browser:
            </p>
            <p style="margin: 6px 0 0 0; font-size: 11px; color: #A1A1AA; word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
              <a href="${actionUrl}" style="color: #71717A; text-decoration: underline;">${actionUrl}</a>
            </p>
          </td>
        </tr>
      </table>
    ` : "";

    let otpCodeHtml = "";
    if (otpCode) {
      const digits = otpCode.split("");
      const digitBoxes = digits.map(d => `
        <td align="center" style="padding: 0 4px;">
          <table border="0" cellpadding="0" cellspacing="0">
            <tr>
              <td align="center" valign="middle" width="48" height="56" style="background-color: #FFFFFF; border: 1px solid #D4D4D8; border-radius: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 24px; font-weight: 700; color: #09090B; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                ${d}
              </td>
            </tr>
          </table>
        </td>
      `).join("");

      otpCodeHtml = `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 40px 0;">
          <tr>
            <td align="center">
              <div style="background-color: #F4F4F5; border-radius: 16px; padding: 32px 24px; border: 1px solid #E4E4E7; display: inline-block;">
                <p style="margin: 0 0 16px 0; font-size: 12px; font-weight: 700; color: #52525B; text-transform: uppercase; letter-spacing: 0.1em; text-align: center;">Your Authorization Code</p>
                <table border="0" cellpadding="0" cellspacing="0" align="center">
                  <tr>
                    ${digitBoxes}
                  </tr>
                </table>
              </div>
            </td>
          </tr>
        </table>
      `;
    }

    const securityNoticeHtml = securityNotice ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 48px;">
        <tr>
          <td style="padding: 24px; background-color: #FAFAFA; border-radius: 12px; border: 1px dashed #D4D4D8; text-align: left;">
            <div style="display: flex; align-items: flex-start;">
              <div style="width: 20px; height: 20px; flex-shrink: 0; margin-right: 12px;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <div>
                <p style="margin: 0 0 4px 0; font-size: 13px; font-weight: 600; color: #09090B;">Security Notice</p>
                <p style="margin: 0; font-size: 13px; line-height: 20px; color: #52525B;">If you didn't request this, please securely ignore it or contact your Workspace Administrator immediately. This is an automated enterprise security event.</p>
              </div>
            </div>
          </td>
        </tr>
      </table>
    ` : "";
    
    const expiresHtml = expiresIn ? `
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-top: 24px;">
        <tr>
          <td align="center">
            <div style="display: inline-block; background-color: #FEF3C7; border: 1px solid #FDE68A; padding: 6px 16px; border-radius: 20px;">
              <p style="margin: 0; font-size: 12px; font-weight: 600; color: #92400E; display: flex; align-items: center; justify-content: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Expires in ${expiresIn}
              </p>
            </div>
          </td>
        </tr>
      </table>
    ` : "";

    const accentColor = options.mode === "alert" ? "#E11D48" : "#09090B";

    return `<!DOCTYPE html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
    <style type="text/css">
      table {border-collapse:collapse;border-spacing:0;margin:0;}
      div, td {padding:0;}
      div {margin:0 !important;}
    </style>
    <noscript>
      <xml>
        <o:OfficeDocumentSettings>
          <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
      </xml>
    </noscript>
  <![endif]-->
  <style>
    :root { color-scheme: light dark; supported-color-schemes: light dark; }
    body { margin: 0; padding: 0; font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; background-color: #FAFAFA; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; line-height: 100%; text-decoration: none; outline: none; }
    .wrapper { width: 100%; table-layout: fixed; padding: 64px 20px; background-color: #FAFAFA; background-image: radial-gradient(#E4E4E7 1px, transparent 1px); background-size: 24px 24px; }
    .main { max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E4E4E7; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); }
    .header { padding: 48px 48px 32px 48px; text-align: center; }
    .content { padding: 0 48px 48px 48px; }
    .footer { padding: 32px 48px; background-color: #FFFFFF; border-top: 1px solid #F4F4F5; text-align: center; }
    
    @media screen and (max-width: 600px) {
      .wrapper { padding: 24px 16px !important; background-image: none !important; }
      .main { border-radius: 12px !important; }
      .header { padding: 32px 24px 24px 24px !important; }
      .content { padding: 0 24px 32px 24px !important; }
      .footer { padding: 24px !important; }
      h2 { font-size: 20px !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <!--[if mso]>
    <table align="center" border="0" cellspacing="0" cellpadding="0" width="600">
    <tr>
    <td align="center" valign="top" width="600">
    <![endif]-->
    <table class="main" width="100%" cellpadding="0" cellspacing="0" align="center" style="max-width: 600px;">
      <tr>
        <td style="height: 6px; width: 100%; background-color: ${accentColor};"></td>
      </tr>
      <tr>
        <td class="header">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 20px auto;">
                  <tr>
                    <td align="center" valign="middle" width="56" height="56" style="background-color: #000000; border-radius: 16px; border: 1px solid #27272A; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                      <svg width="34" height="34" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 0 auto;">
                        <path d="M20 80V22L45 55V80H20Z" fill="#FFFFFF"/>
                        <path d="M45 55L76 18H90L57 60V80H45V55Z" fill="#D4AF37"/>
                        <polygon points="60,18 90,18 78,38" fill="#F3E5AB"/>
                      </svg>
                    </td>
                  </tr>
                </table>
                <p style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.04em; color: #09090B;">${brandName}</p>
                <p style="margin: 6px 0 0 0; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #A1A1AA;">${brandTagline}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td class="content">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-bottom: 1px solid #F4F4F5; padding-bottom: 24px;">
            <tr>
              ${options.icon ? `<td width="56" valign="middle" style="padding-bottom: 24px;"><div style="display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 12px; background-color: ${options.mode === 'alert' ? '#FFF1F2' : '#F4F4F5'}; border: 1px solid ${options.mode === 'alert' ? '#FECDD3' : '#E4E4E7'}; box-shadow: inset 0 1px 2px rgba(255,255,255,0.5);">${getSvgIcon(options.icon, options.mode === 'alert' ? '#E11D48' : '#18181B')}</div></td>` : ''}
              <td valign="middle" style="padding-bottom: 24px;">
                <h2 style="margin: 0; font-size: 22px; font-weight: 700; color: #09090B; letter-spacing: -0.03em; line-height: 1.3;">${options.title}</h2>
              </td>
            </tr>
          </table>
          ${descriptionsHtml}
          ${otpCodeHtml}
          ${detailsHtml}
          ${actionHtml}
          ${expiresHtml}
          ${securityNoticeHtml}
        </td>
      </tr>
      <tr>
        <td class="footer">
          <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td align="center">
                <p style="margin: 0 0 16px 0; font-size: 13px; color: #71717A; font-weight: 500;">
                  <a href="#" style="color: #52525B; text-decoration: none; margin: 0 12px;">Privacy Policy</a> • 
                  <a href="#" style="color: #52525B; text-decoration: none; margin: 0 12px;">Terms of Service</a> • 
                  <a href="#" style="color: #52525B; text-decoration: none; margin: 0 12px;">Security</a>
                </p>
                <p style="margin: 0 0 4px 0; font-size: 12px; color: #A1A1AA;">&copy; ${currentYear} ${brandName}. All rights reserved.</p>
                <p style="margin: 0; font-size: 11px; color: #D4D4D8;">
                  Powered by ManMadhan Progress OS
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <!--[if mso]>
    </td>
    </tr>
    </table>
    <![endif]-->
  </div>
</body>
</html>`;
  }
}
