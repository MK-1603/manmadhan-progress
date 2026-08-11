import { type Request, type Response, Router } from "express";

export const personalRouter = Router();

// Sample route for personal dashboard
personalRouter.get("/dashboard", (req: Request, res: Response) => {
	res.json({ success: true, message: "Welcome to Personal Space Sample API" });
});
