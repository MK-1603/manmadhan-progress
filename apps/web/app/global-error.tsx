"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
	return (
		<html lang="en">
			<body className="bg-background text-foreground">
				<main className="min-h-dvh grid place-items-center px-6 text-center">
					<div className="space-y-4">
						<h1 className="text-2xl font-semibold">Something went wrong</h1>
						<p className="text-sm text-muted-foreground">Reload the application to restore your session.</p>
						<button onClick={reset} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Reload</button>
					</div>
				</main>
			</body>
		</html>
	);
}
