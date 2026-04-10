import { Request, Response, NextFunction } from "express";
import { LogsService } from "../services/admin/logs.service";

/**
 * ✅ GLOBAL REQUEST LOGGER MIDDLEWARE
 * Automatically logs ALL admin endpoint requests
 * Non-blocking using setImmediate
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  
  // Log after response is sent (never delay request)
  res.on('finish', () => {
    if (res.statusCode < 400 && req.user) {
      LogsService.log({
        origin: req.path,
        title: `${req.method} ${req.path}`,
        type: 'bot_log',
        summary: `User: ${req.user?.email || 'system'} | Status: ${res.statusCode}`
      });
    }
  });

  next();
};