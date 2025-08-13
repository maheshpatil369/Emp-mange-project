import { NextFunction, Request, Response } from "express";

// rateLimitMiddleware.ts
const userRequestTimestamps = new Map<string, number>();

export function rateLimitOnePerMinute(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = req.user?.uid || req.ip; // Use authenticated user ID or fallback to IP
  const now = Date.now();

  if (userRequestTimestamps.has(userId as string)) {
    const lastRequestTime = userRequestTimestamps.get(userId as string)!;
    const diffInSeconds = (now - lastRequestTime) / 1000;

    if (diffInSeconds < 60) {
      return res.status(429).json({
        error: "You can only make this request once per minute.",
      });
    }
  }

  // Record current request time
  userRequestTimestamps.set(userId as string, now);
  next();
}
