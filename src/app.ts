import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import hpp from "hpp";
// import "./jobs";
import {
  COOKIE_SECRET,
  IAT_FRONTEND_URL,
  LOCAL_FRONTEND_URL,
  NODE_ENV,
  PROD_FRONTEND_URL,
  RAT_FRONTEND_URL,
  UAT_FRONTEND_URL,
} from "./config/env";
import cookieParser from "cookie-parser";
import userRouterV1 from "./routes/v1/user.route";
import { getServiceLogger } from "./utils/createLogger";
import centralAppErrors from "./middlewares/centralAppErrors";
import responseFormatter from "./middlewares/responseFormatter";
import deployWebhookRouterV1 from "./routes/v1/deploy-webhook.route";
import { swaggerSpec } from "./config/swagger";
import swaggerUi from "swagger-ui-express";

export const app = express();

const logger = getServiceLogger("app");

// / 1. Trust proxy (important for rate limiting & secure cookies if behind proxy/CDN)
app.set("trust proxy", 1);

//  Silence browser favicon requests (EARLY EXIT)
app.get("/favicon.ico", (_req, res) => res.sendStatus(204));

// 2. CORS – Allow requests from trusted origins
app.use(
  cors({
    origin: [
      LOCAL_FRONTEND_URL!,
      RAT_FRONTEND_URL!,
      UAT_FRONTEND_URL!,
      IAT_FRONTEND_URL!,
      PROD_FRONTEND_URL!,
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// 3. Basic body parsers (must come early so req.body is populated)
app.use(
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString(); // Save raw string for signature check
    },
  }),
);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(COOKIE_SECRET));

// 4. Security: Prevent HTTP parameter pollution
app.use(hpp());

// 6. Set strict security HTTP headers manually (for fine control)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  next();
});

// 7. Security: Helmet + CSP
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  }),
);

// 8. Rate limiting (early to stop abusive traffic)

// 9. Compression (wrap the final response to reduce payload size)
app.use(compression());

// 10. Format responses
app.use(responseFormatter);

app.get("/api", async (_, res: Response) => {
  res.status(200).send("Welcome to C2C STAFF SERVER API..");
});

// Testing endpoint
app.get("/api/health", (req: Request, res: Response, next: NextFunction) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
    statusCode: 200,
  });
});

// ping db
app.get("/api/ping", async (req, res) => {
  logger.info("C2C Staff Server is alive");
  res.status(200).send("pong");
});

// 🟡 11.  DB readiness middleware here

// 12. API Routes
app.use("/api/v1/user", userRouterV1);
app.use("/api/v1/deployWebhook", deployWebhookRouterV1);

// 15. Swagger Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 13. Unknown route
app.all("*", (req, res, next) => {
  const error = new Error(`Route ${req.originalUrl} not found`) as any;
  error.statusCode = 400;
  next(error);
});

// 14. App Error Middleware
app.use(centralAppErrors);
