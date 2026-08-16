/**
 * Safely normalize any timestamp input (Date, ISO string, timestamp number, null/undefined)
 * into a valid JavaScript Date object or null.
 */
export function normalizeDate(value: any): Date | null {
	if (value === null || value === undefined) return null;
	if (value instanceof Date) {
		return isNaN(value.getTime()) ? null : value;
	}
	if (typeof value === "string" || typeof value === "number") {
		const parsed = new Date(value);
		return isNaN(parsed.getTime()) ? null : parsed;
	}
	if (typeof value === "object" && typeof value.toISOString === "function") {
		try {
			const parsed = new Date(value.toISOString());
			return isNaN(parsed.getTime()) ? null : parsed;
		} catch (e) {
			return null;
		}
	}
	return null;
}

/**
 * Safely convert any date-like value to an ISO string. Returns fallback if invalid.
 */
export function safeToISOString(value: any, fallback: string = new Date().toISOString()): string {
	const d = normalizeDate(value);
	return d ? d.toISOString() : fallback;
}
