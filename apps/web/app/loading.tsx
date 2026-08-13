export default function Loading() {
	return (
		<main className="min-h-dvh grid place-items-center bg-background">
			<div className="flex items-center gap-3 text-sm text-muted-foreground" role="status" aria-live="polite">
				<span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
				Loading workspace…
			</div>
		</main>
	);
}
