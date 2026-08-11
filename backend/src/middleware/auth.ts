import type { Request } from "express";

// Compatibility helper for legacy personal route modules.
export const getUserId = (req: Request): string | undefined => {
	const user = (req as any).user;
	return user?.id || user?.userId || user?.sub;
};
