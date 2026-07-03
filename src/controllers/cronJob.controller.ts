// import { Request, Response } from 'express';
// import { getServiceLogger } from '../utils/createLogger';
// import { runPlacPipelineOpsReportJob } from '../jobs/cron/placementPipelineOpsReport.job';
// // import { runPipelineLeaderboardJob } from '../jobs/cron/pipelineLeaderboard.job';
// // import { runUnsatisfiedClientsJob } from '../jobs/cron/unsatisfiedClient.job';

// const logger = getServiceLogger('pipeline-jobs-controller');

// /**
//  * POST /admin/jobs/pipeline/ops-report
//  * Manually triggers the PlacPipeline Ops Report job.
//  */
// export async function triggerOpsReportJob(
//   req: Request,
//   res: Response
// ): Promise<void> {
//   logger.info('🔧 Manual trigger: PlacPipeline Ops Report job');

//   try {
//     await runPlacPipelineOpsReportJob();

//     res.status(200).json({
//       success: true,
//       message: 'PlacPipeline Ops Report job completed successfully.',
//       triggeredAt: new Date().toISOString(),
//     });
//   } catch (error: any) {
//     logger.error(
//       `❌ Manual trigger failed for Ops Report job: ${error.message}`
//     );

//     res.status(500).json({
//       success: false,
//       message: 'PlacPipeline Ops Report job failed.',
//       error: error.message,
//       triggeredAt: new Date().toISOString(),
//     });
//   }
// }

// /**
//  * POST /admin/jobs/pipeline/leaderboard
//  * Manually triggers the Pipeline Performance Leaderboard job.
//  */
// // export async function triggerLeaderboardJob(
// //   req: Request,
// //   res: Response
// // ): Promise<void> {
// //   logger.info('🔧 Manual trigger: Pipeline Leaderboard job');

// //   try {
// //     await runPipelineLeaderboardJob();

// //     res.status(200).json({
// //       success: true,
// //       message: 'Pipeline Performance Leaderboard job completed successfully.',
// //       triggeredAt: new Date().toISOString(),
// //     });
// //   } catch (error: any) {
// //     logger.error(
// //       `❌ Manual trigger failed for Leaderboard job: ${error.message}`
// //     );

// //     res.status(500).json({
// //       success: false,
// //       message: 'Pipeline Performance Leaderboard job failed.',
// //       error: error.message,
// //       triggeredAt: new Date().toISOString(),
// //     });
// //   }
// // }

// /**
//  * POST /admin/jobs/pipeline/all
//  * Manually triggers both pipeline jobs in sequence —
//  * ops report first, then leaderboard (mirrors the scheduled order).
//  */
// export async function triggerAllPipelineJobs(
//   req: Request,
//   res: Response
// ): Promise<void> {
//   logger.info('🔧 Manual trigger: All pipeline jobs');

//   const results: Record<string, { success: boolean; error?: string }> = {};

//   try {
//     await runPlacPipelineOpsReportJob();
//     results.opsReport = { success: true };
//   } catch (error: any) {
//     logger.error(
//       `❌ Ops Report job failed during combined run: ${error.message}`
//     );
//     results.opsReport = { success: false, error: error.message };
//   }

//   try {
//     await runPipelineLeaderboardJob();
//     results.leaderboard = { success: true };
//   } catch (error: any) {
//     logger.error(
//       `❌ Leaderboard job failed during combined run: ${error.message}`
//     );
//     results.leaderboard = { success: false, error: error.message };
//   }

//   const allPassed = Object.values(results).every((r) => r.success);

//   res.status(allPassed ? 200 : 207).json({
//     success: allPassed,
//     message: allPassed
//       ? 'All pipeline jobs completed successfully.'
//       : 'One or more pipeline jobs failed — check individual results.',
//     results,
//     triggeredAt: new Date().toISOString(),
//   });
// }

// /**
//  * POST /admin/jobs/pipeline/unsatisfied-clients
//  * Manually triggers the Unsatisfied Client Report.
//  */
// export async function triggerUnsatisfiedClientsReport(
//   req: Request,
//   res: Response
// ): Promise<void> {
//   logger.info('🔧 Manual trigger: Unsatisfied Client Report');

//   try {
//     await runUnsatisfiedClientsJob();

//     res.status(200).json({
//       success: true,
//       message: 'Unsatisfied Client Report completed successfully.',
//       triggeredAt: new Date().toISOString(),
//     });
//   } catch (error: any) {
//     logger.error(
//       `❌ Manual trigger failed for Unsatisfied Client Report: ${error.message}`
//     );

//     res.status(500).json({
//       success: false,
//       message: 'Unsatisfied Client Report failed.',
//       error: error.message,
//       triggeredAt: new Date().toISOString(),
//     });
//   }
// }
