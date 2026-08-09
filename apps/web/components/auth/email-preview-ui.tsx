"use client";

import { Mail, KeyRound, ShieldCheck, UserPlus, Zap, Ban, AlertTriangle, MonitorSmartphone } from "lucide-react";

export function EmailPreviewUI({ type }: { type: "activation" | "otp" | "invitation" | "login_alert" | "password_changed" | "password_reset" | "new_device" | "deleted" }) {
  const getEmailContent = () => {
    switch (type) {
      case "otp":
        return {
          icon: <ShieldCheck className="w-8 h-8 text-gold" />,
          title: "Secure Verification Code",
          body: "Your 3D Verification Code is 749201. This code is valid for 5 minutes. Do not share this with anyone.",
          action: "749201"
        };
      case "activation":
        return {
          icon: <Zap className="w-8 h-8 text-emerald-500" />,
          title: "Account Activated",
          body: "Your ManMadhan Progress workspace account has been successfully activated. You can now access your execution environments.",
          action: "Access Workspace"
        };
      case "invitation":
        return {
          icon: <UserPlus className="w-8 h-8 text-blue-500" />,
          title: "Workspace Invitation",
          body: "You have been invited by the Executive Administrator to join Acme Global Corp's workspace.",
          action: "Accept Invitation"
        };
      case "login_alert":
      case "new_device":
        return {
          icon: <MonitorSmartphone className="w-8 h-8 text-amber-500" />,
          title: "New Device Sign-In",
          body: "A new device (MacBook Pro 16\", Safari) just signed into your account from San Francisco, CA.",
          action: "Review Activity"
        };
      case "password_reset":
        return {
          icon: <KeyRound className="w-8 h-8 text-rose-500" />,
          title: "Password Reset Request",
          body: "We received a request to reset your password. Click the secure link below to create a new password.",
          action: "Reset Password"
        };
      case "password_changed":
        return {
          icon: <KeyRound className="w-8 h-8 text-emerald-500" />,
          title: "Password Changed",
          body: "Your password was successfully updated. If you did not make this change, secure your account immediately.",
          action: "Secure Account"
        };
      case "deleted":
        return {
          icon: <Ban className="w-8 h-8 text-rose-500" />,
          title: "Account Deleted",
          body: "Your ManMadhan Progress account and all associated workspaces have been permanently deleted.",
          action: null
        };
      default:
        return {
          icon: <Mail className="w-8 h-8 text-muted-foreground" />,
          title: "Notification",
          body: "You have a new message.",
          action: null
        };
    }
  };

  const content = getEmailContent();

  return (
    <div className="w-full max-w-lg mx-auto bg-foreground dark:bg-background rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-border font-sans">
      <div className="bg-slate-50 dark:bg-muted border-b border-slate-200 dark:border-border p-6 text-center">
        <div className="mx-auto w-16 h-16 bg-foreground dark:bg-background rounded-2xl shadow-sm border border-slate-200 dark:border-border flex items-center justify-center mb-4">
          {content.icon}
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-foreground tracking-tight">{content.title}</h1>
      </div>
      
      <div className="p-8 space-y-6">
        <p className="text-sm text-slate-600 dark:text-muted-foreground leading-relaxed">
          Hello Sai,
        </p>
        <p className="text-sm text-slate-600 dark:text-muted-foreground leading-relaxed">
          {content.body}
        </p>

        {content.action && type !== "otp" && (
          <button className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-gold text-foreground dark:text-black font-extrabold shadow-md hover:opacity-90 transition-opacity">
            {content.action}
          </button>
        )}

        {content.action && type === "otp" && (
          <div className="w-full py-4 rounded-xl bg-slate-100 dark:bg-background border border-slate-200 dark:border-gold/30 text-center">
            <span className="text-3xl font-mono font-extrabold text-slate-900 dark:text-gold tracking-[0.2em]">{content.action}</span>
          </div>
        )}

        <hr className="border-slate-200 dark:border-border" />
        
        <p className="text-[10px] text-muted-foreground text-center uppercase tracking-wider font-semibold">
          ManMadhan Progress • Execution OS<br/>
          Secure Encrypted Communication
        </p>
      </div>
    </div>
  );
}
