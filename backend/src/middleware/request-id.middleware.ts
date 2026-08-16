import { type Request, type Response, type NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const incomingId = req.headers["x-request-id"] || req.headers["x-correlation-id"];
  const requestId = typeof incomingId === "string" && incomingId.trim()
    ? incomingId.trim()
    : `req_${uuidv4().replace(/-/g, "").slice(0, 12)}`;
  
  (req as any).id = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
};
