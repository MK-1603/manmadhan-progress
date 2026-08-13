import type { Express, Request, Response } from "express";

export const registerHealthEndpoints = (app: Express): void => {
	app.get("/health", (_req: Request, res: Response) => {
		res.status(200).json({
			status: "ok",
			timestamp: new Date().toISOString(),
			service: "manmadhan-progress-server",
			version: "1.0.0",
			environment: process.env.NODE_ENV || "development",
		});
	});

	app.get("/health/ready", (_req: Request, res: Response) => {
		res.status(200).json({
			status: "ready",
			database: "connected",
		});
	});

	app.get("/health/live", (_req: Request, res: Response) => {
		res.status(200).json({ status: "live" });
	});
};
