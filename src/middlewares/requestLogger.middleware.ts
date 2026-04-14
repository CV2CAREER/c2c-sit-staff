import { Request, Response, NextFunction } from "express";
import { LogsService } from "../services/admin/logs.service";
import { AuditLogService } from "../services/admin/audit-log.service";
import { getServiceLogger } from "../utils/createLogger";

const logger = getServiceLogger("request-logger");

/**
 * ✅ GLOBAL REQUEST LOGGER MIDDLEWARE
 * Automatically logs ALL admin endpoint requests
 * Non-blocking using setImmediate
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  
  // Log after response is sent (never delay request)
  res.on('finish', () => {
    const user = (req as any).user;

    if (res.statusCode < 400 && user) {
      LogsService.log({
        origin: req.originalUrl,
        title: `${req.method} ${req.originalUrl}`,
        type: 'bot_log',
        summary: `User: ${user.email || 'system'} | Status: ${res.statusCode}`
      });

      // Log audit trail for ALL requests
      setImmediate(() => {
        AuditLogService.log({
          userId: user.id,
          userFullName: `${user.firstName} ${user.lastName}`.trim(),
          userRole: user.role,
          method: req.method,
          url: req.originalUrl,
          deviceUsed: req.headers['user-agent'] || 'unknown',
          dataEntry: {
            body: req.body,
            query: req.query,
            statusCode: res.statusCode
          },
          description: `${req.method} ${req.originalUrl}`
        });
      });
    }
  });

  next();
};
