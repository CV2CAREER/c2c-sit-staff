import { Request, Response } from "express";
import * as WebhookService from "../../services/deploy-webhook/deploy-webhook.service";
import catchAsyncError from "../../utils/catchAsyncError";
import ErrorHandler from "../../utils/errorHandler";
import { getServiceLogger } from "../../utils/createLogger";
import {
  sendDeploymentFailureEmail,
  sendDeploymentSuccessEmail,
} from "../../services/email.service";
import { SlackService } from "../../services/slack.service";
import {
  SlackChannel,
  SlackEventType,
  SlackLocation,
  SlackNode,
  SlackProvider,
  SlackSeverity,
} from "../../utils/enum";


const logger = getServiceLogger("deploy-webhook-controller");

export const handleGithubWebhook = catchAsyncError(
  async (req: any, res: Response) => {
    const signature = req.headers["x-hub-signature-256"] as string;

    // 1. Verify Signature
    if (!WebhookService.verifyGithubSignature(req.rawBody, signature)) {
      throw new ErrorHandler("Invalid signature", 400);
    }

    const { repository, ref } = req.body;

    // Safety check for non-push events (like ping)
    if (!repository || !ref) {
      return res.apiSuccess("Webhook received, but no action required.");
    }

    const initiative = repository.name;
    const branch = ref.replace("refs/heads/", "");
    const deployedBy = req.body.pusher?.name ?? "GitHub Actions";
    const commitSha = req.body.after ?? "unknown";
    const commitMessage = req.body.head_commit?.message ?? "No commit message";

    try {
      const startTime = Date.now();

      // Slack notification for deployment start
      setImmediate(async () => {
        try {
          await SlackService.notify({
            location: branch === "prod" ? SlackLocation.PRODUCTION : SlackLocation.STAGING,
            host: repository.html_url,
            node: SlackNode.APPLICATION,
            provider: SlackProvider.GITHUB,
            severity: SlackSeverity.INFO,
            trigger: "Deployment Started",
            type: SlackEventType.USER_TRIGGERED,
            channel: SlackChannel.DEPLOYMENTS_LOGS,
            body: `Deployment started for ${initiative} on ${branch} by ${deployedBy}. Commit: ${commitSha} - ${commitMessage}`,
            teamMentions: "CSM",
          });
          
          logger.info(`Slack notification sent for deployment start of ${initiative}`);
        } catch (err) {
          logger.error(`Failed to send Slack notification: ${err}`);
        }
      });

      // 2. Trigger the shell script
      WebhookService.triggerDeployment(initiative, branch);

      const duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;

      logger.info(`🚀 Deployment started: ${initiative} (${branch}).`);

      await sendDeploymentSuccessEmail({
        email: "emmanueld1topthings@gmail.com",
        appName: initiative,
        environment: branch as "rat" | "iat" | "sit" | "uat" | "prod",
        commitSha,
        commitMessage,
        deployedBy,
        duration,
        deploymentUrl: repository.homepage ?? repository.html_url,
        logsUrl: `${repository.html_url}/actions`,
      });

      // Slack notification for deployment success
      setImmediate(async () => {
        try {
          await SlackService.notify({
            location: branch === "prod" ? SlackLocation.PRODUCTION : SlackLocation.STAGING,
            host: repository.html_url,
            node: SlackNode.APPLICATION,
            provider: SlackProvider.GITHUB,
            severity: SlackSeverity.INFO,
            trigger: "Deployment Success",
            type: SlackEventType.USER_TRIGGERED,
            channel: SlackChannel.DEPLOYMENTS_LOGS,
            body: `Deployment successful for ${initiative} on ${branch}. Duration: ${duration}. Commit: ${commitSha} - ${commitMessage}`,
            teamMentions: "CSM",
          });
          
          logger.info(`Slack notification sent for deployment success of ${initiative}`);
        } catch (err) {
          logger.error(`Failed to send Slack notification: ${err}`);
        }
      });


      return res.apiSuccess(
        `Deployment triggered for ${initiative} on ${branch} environment.`,
      );
    } catch (error: any) {
      // Log the specific service error
      logger.error(`❌ Deployment failed for ${initiative}: ${error.message}`);

      await sendDeploymentFailureEmail({
        email: "emmanueld1topthings@gmail.com",
        appName: initiative,
        environment: branch,
        errorMessage: error.message,
      });

      // Slack notification for deployment failure
      setImmediate(async () => {
        try {
          await SlackService.notify({
            location: branch === "prod" ? SlackLocation.PRODUCTION : SlackLocation.STAGING,
            host: repository.html_url,
            node: SlackNode.APPLICATION,
            provider: SlackProvider.GITHUB,
            severity: SlackSeverity.ERROR,
            trigger: "Deployment Failed",
            type: SlackEventType.USER_TRIGGERED,
            channel: SlackChannel.DEPLOYMENTS_LOGS,
            body: `Deployment failed for ${initiative} on ${branch}. Error: ${error.message}. Commit: ${commitSha} - ${commitMessage}`,
            teamMentions: "CSM",
          });
          
          logger.info(`Slack notification sent for deployment failure of ${initiative}`);
        } catch (err) {
          logger.error(`Failed to send Slack notification: ${err}`);
        }
      });

      // We still return 200/Success to GitHub so it doesn't keep retrying
      // if the error is just an unconfigured branch.
      return res.apiSuccess(
        `Webhook received, but execution failed: ${error.message}`,
      );
    }
  },
);
