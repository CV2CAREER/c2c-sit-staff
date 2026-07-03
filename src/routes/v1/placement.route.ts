import { Router } from 'express';
import { checkBlacklistedTokens } from '../../middlewares/checkBlacklistedToken';
import { isUserAuthenticated } from '../../middlewares/auth';
import { PlacementController } from '../../controllers/v1/placement.controller';
// import {
// 	triggerOpsReportJob,
// 	triggerLeaderboardJob,
// 	triggerUnsatisfiedClientsReport,
// } from '../../controllers/cronJob.controller';

const placementRouterV1 = Router();

placementRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

/**
 * Placement Controller Routes
 * Dashboard and client management for placement controllers (assistants)
 */

// GET /api/v1/placement/summary - Get dashboard summary for placement controller
placementRouterV1.get('/summary', PlacementController.getDashboardSummary);

// POST /api/v1/placement/ops-report - Manually trigger the PlacPipeline Ops Report job
// placementRouterV1.post('/ops-report', triggerOpsReportJob);

// // // POST /api/v1/placement/leaderboard - Manually trigger the Pipeline Performance Leaderboard job
// placementRouterV1.post('/leaderboard', triggerLeaderboardJob);

// placementRouterV1.post('/unsatisfied-clients', triggerUnsatisfiedClientsReport);

export default placementRouterV1;
