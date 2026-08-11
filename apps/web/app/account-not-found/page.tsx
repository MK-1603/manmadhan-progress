"use client";

import Link from "next/link";
import { UserX, ArrowLeft, ShieldAlert } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

export default function AccountNotFoundPage() {
	return (
		<div className="min-h-screen w-full flex items-center justify-center p-6 bg-background">
			<div className="w-full max-w-md space-y-6 text-center">
				<div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-md">
					<UserX className="w-8 h-8" />
				</div>

				<div className="space-y-2">
					<h1 className="text-2xl font-black text-foreground tracking-tight">
						Account Not Found
					</h1>
					<p className="text-sm text-muted-foreground leading-relaxed">
						The account you are attempting to log in with is not registered in this Organization Workspace or has been removed.
					</p>
				</div>

				<PremiumCard className="text-left space-y-3 bg-muted/20 border-border/60">
					<div className="flex items-center gap-2 text-xs font-semibold text-foreground">
						<ShieldAlert className="w-4 h-4 text-gold dark:text-[#E3AA18]" /> Access Notice
					</div>
					<p className="text-xs text-muted-foreground leading-relaxed">
						Google OAuth sign-in and direct login require pre-registration by your organization CEO or Administrator. Please verify your email address or request an invitation.
					</p>
				</PremiumCard>

				<div className="flex flex-col gap-3 pt-2">
					<Link
						href="/login"
						className="w-full py-3 bg-gold hover:bg-[#F0BC2B] text-black text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm"
					>
						<ArrowLeft className="w-4 h-4 stroke-[2.5]" /> Back to Login
					</Link>
				</div>
			</div>
		</div>
	);
}
