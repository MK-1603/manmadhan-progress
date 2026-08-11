import type { Express, Request, Response } from "express";

export const registerHealthEndpoints = (app: Express): void => {
	app.get("/health", (req: Request, res: Response) => {
		res.status(200).json({
			status: "ok",
			timestamp: new Date().toISOString(),
			service: "manmadhan-progress-server",
			version: "1.0.0",
			environment: process.env.NODE_ENV || "development",
		});
	});

	app.get("/health/ready", (req: Request, res: Response) => {
		res.status(200).json({
			status: "ready",
			database: "connected",
		});
	});

	app.get("/health/live", (req: Request, res: Response) => {
		res.status(200).json({ status: "live" });
	});
};
