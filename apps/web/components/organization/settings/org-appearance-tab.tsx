"use client";

import { useTheme } from "next-themes";
import { Palette, Sun, Moon, Monitor, Check } from "lucide-react";
import { PremiumCard } from "@/components/ui/premium-card";

export function OrgAppearanceTab() {
	const { theme, setTheme } = useTheme();

	const options = [
		{
			value: "dark",
			label: "Dark Theme (Default Premium)",
			description: "Restrained dark surface architecture optimized for intensive executive operations.",
			icon: Moon,
		},
		{
			value: "light",
			label: "Light Theme",
			description: "High-contrast light mode for daytime review.",
			icon: Sun,
		},
		{
			value: "system",
			label: "System Theme",
			description: "Automatically matches your operating system preference.",
			icon: Monitor,
		},
	];

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h2 className="text-xl font-bold text-foreground tracking-tight flex items-center gap-2">
					<Palette className="w-5 h-5 text-gold dark:text-[#E3AA18]" /> Appearance & Interface Settings
				</h2>
				<p className="text-sm text-muted-foreground mt-1">
					Choose your interface color palette preference for the Organization Workspace.
				</p>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-5">
				{options.map((opt) => {
					const Icon = opt.icon;
					const isActive = theme === opt.value;
					return (
						<PremiumCard
							key={opt.value}
							onClick={() => setTheme(opt.value)}
							className={`cursor-pointer transition-all border-2 relative ${
								isActive
									? "border-gold bg-gold/5 dark:bg-gold/10 shadow-lg"
									: "border-border/60 hover:border-gold/40"
							}`}
						>
							{isActive && (
								<div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-gold text-black flex items-center justify-center">
									<Check className="w-3.5 h-3.5 stroke-[3]" />
								</div>
							)}
							<div className="p-3 bg-gold/10 text-gold dark:text-[#F0BC2B] rounded-xl w-fit mb-4">
								<Icon className="w-6 h-6" />
							</div>
							<h3 className="text-base font-bold text-foreground mb-1">{opt.label}</h3>
							<p className="text-xs text-muted-foreground leading-relaxed">{opt.description}</p>
						</PremiumCard>
					);
				})}
			</div>
		</div>
	);
}
