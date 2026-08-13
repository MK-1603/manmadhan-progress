"use client";

import { useEffect } from "react";

export default function GlobalRouteError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error("Route rendering error", error);
	}, [error]);

	return (
		<main className="min-h-dvh grid place-items-center bg-background px-6">
			<section className="max-w-md space-y-4 text-center">
				<p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">ManMadhan Progress</p>
				<h1 className="text-2xl font-semibold text-foreground">This workspace could not be loaded</h1>
				<p className="text-sm text-muted-foreground">The data may be temporarily unavailable. Try again before leaving the page.</p>
				<button onClick={reset} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Try again</button>
			</section>
		</main>
	);
}
