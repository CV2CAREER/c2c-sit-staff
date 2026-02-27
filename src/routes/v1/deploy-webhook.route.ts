import { Router } from "express";
import { handleGithubWebhook } from "../../controllers/v1/deploy-webhook.controller";

const deployWebhookRouterV1 = Router();
deployWebhookRouterV1.post("/deploy", handleGithubWebhook);

export default deployWebhookRouterV1;
