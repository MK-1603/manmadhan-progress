import { type Request, type Response, Router } from "express";
import { authenticate } from "../middleware/auth.middleware";
import { RequestEngineService } from "../services/request-engine.service";
import { logger } from "../services/logger.service";

export const requestsRouter = Router();
requestsRouter.use(authenticate);

// ─── List Central Requests for User ──────────────────────────────────────────
requestsRouter.get("/", async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const userRole = (req as any).user?.role || "MEMBER";
		const workspaceId = req.query.workspaceId ? String(req.query.workspaceId) : undefined;

		const requestsList = await RequestEngineService.getRequestsForUser(userId, userRole, workspaceId);
		res.json({ success: true, data: requestsList });
	} catch (err: any) {
		logger.error("Get requests error: " + (err?.message || String(err)));
		res.status(500).json({ success: false, error: err.message || "Failed to fetch requests" });
	}
});

// ─── Process Request Decision (Approve / Request Changes / Reject) ───────────
requestsRouter.post("/:id/decision", async (req: Request, res: Response) => {
	try {
		const requestId = req.params.id;
		const userId = (req as any).user?.id;
		const { decision, reason } = req.body;

		if (!decision || !["APPROVED", "CHANGES_REQUESTED", "REJECTED"].includes(decision)) {
			return res.status(400).json({
				success: false,
				error: "Valid decision required: APPROVED, CHANGES_REQUESTED, or REJECTED",
			});
		}

		if ((decision === "CHANGES_REQUESTED" || decision === "REJECTED") && (!reason || !reason.trim())) {
			return res.status(400).json({
				success: false,
				error: "A valid feedback reason is required when requesting changes or rejecting a request.",
			});
		}

		const updated = await RequestEngineService.processDecision(requestId, userId, decision, reason?.trim());
		res.json({ success: true, data: updated });
	} catch (err: any) {
		logger.error("Process request decision error: " + (err?.message || String(err)));
		res.status(500).json({ success: false, error: err.message || "Failed to process request decision" });
	}
});
