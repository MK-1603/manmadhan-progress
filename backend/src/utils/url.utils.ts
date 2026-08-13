export interface UrlMetadata {
	url: string;
	title?: string;
	description?: string;
	image?: string;
	siteName?: string;
	type?: string;
}

// ─── Centralized URL Builder ────────────────────────────────────────────────
// All production URLs must be constructed through this function to prevent
// double-slash URLs and accidental use of localhost/preview URLs in production.

/**
 * Strips trailing slash from a base URL so joining paths never produces `//`.
 */
export function normalizeBase(base: string): string {
	return base.replace(/\/+$/, "");
}

/**
 * Returns the frontend (CLIENT_URL) base, normalized.
 * Falls back to localhost:3000 in development.
 */
export function getClientBase(): string {
	return normalizeBase(process.env.CLIENT_URL || "http://localhost:3000");
}

/**
 * Builds an absolute frontend URL, preventing double slashes.
 * @param path - Must start with "/"
 */
export function buildClientUrl(path: string): string {
	const base = getClientBase();
	const cleanPath = path.replace(/^\/+/, "");
	return `${base}/${cleanPath}`;
}

/**
 * Builds the invitation acceptance URL.
 */
export function buildInviteUrl(token: string): string {
	return buildClientUrl(`/invite/${token}`);
}

export function extractUrls(text: string): string[] {
	const urlRegex = /(https?:\/\/[^\s]+)/g;
	const matches = text.match(urlRegex);
	return matches || [];
}

export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
	const result: UrlMetadata = { url };

	try {
		const response = await fetch(url, {
			headers: {
				// Pretend to be a browser so sites don't block us automatically
				"User-Agent":
					"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
				Accept:
					"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			},
			signal: AbortSignal.timeout(5000), // 5s timeout
		});

		if (!response.ok) {
			return result;
		}

		const html = await response.text();

		// Regex extractors for standard Meta tags
		const getMetaProperty = (prop: string) => {
			// Handles <meta property="og:title" content="..." /> and <meta name="..." content="..." />
			const regex = new RegExp(
				`<meta[^>]*?(?:property|name)=["']${prop}["'][^>]*?content=["']([^"']+)["']`,
				"i",
			);
			const match = html.match(regex);

			// Try inverted (content="..." property="...")
			if (!match) {
				const regexInv = new RegExp(
					`<meta[^>]*?content=["']([^"']+)["'][^>]*?(?:property|name)=["']${prop}["']`,
					"i",
				);
				const matchInv = html.match(regexInv);
				return matchInv ? matchInv[1] : undefined;
			}
			return match[1];
		};

		// Title fallback
		const titleRegex = /<title[^>]*>([^<]+)<\/title>/i;
		const titleMatch = html.match(titleRegex);

		result.title =
			getMetaProperty("og:title") ||
			getMetaProperty("twitter:title") ||
			(titleMatch ? titleMatch[1] : undefined);
		result.description =
			getMetaProperty("og:description") ||
			getMetaProperty("twitter:description") ||
			getMetaProperty("description");
		result.image =
			getMetaProperty("og:image") || getMetaProperty("twitter:image");
		result.siteName = getMetaProperty("og:site_name");
		result.type = getMetaProperty("og:type");

		return result;
	} catch (_error) {
		// Ignore fetch errors (timeout, DNS, blocked) to gracefully degrade
		return result;
	}
}
