import { Router } from 'express';
import { checkBlacklistedTokens } from '../../middlewares/checkBlacklistedToken';
import { isUserAuthenticated } from '../../middlewares/auth';
import { PlacementController } from '../../controllers/v1/placement.controller';
import { triggerLeaderboardJob } from '../../controllers/cronJob.controller';
// import {
// 	triggerOpsReportJob,
// 	triggerUnsatisfiedClientsReport,
// } from '../../controllers/cronJob.controller';
import { authorizeRoles } from '@/middlewares/authorizeRoles';

const placementRouterV1 = Router();

placementRouterV1.use(checkBlacklistedTokens, isUserAuthenticated, authorizeRoles("admin", "assistant"));

/**
 * Placement Controller Routes
 * Dashboard and client management for placement controllers (assistants)
 */

// GET /api/v1/placement/summary - Get dashboard summary for placement controller
placementRouterV1.get('/summary', PlacementController.getDashboardSummary);

// POST /api/v1/placement/ops-report - Manually trigger the PlacPipeline Ops Report job
// placementRouterV1.post('/ops-report', triggerOpsReportJob);

// POST /api/v1/placement/leaderboard - Manually trigger the Pipeline
// Performance Leaderboard job (SPR-21-13-005 — on-demand refresh alongside
// the automatic minute watcher).
placementRouterV1.post('/leaderboard', triggerLeaderboardJob);

// placementRouterV1.post('/unsatisfied-clients', triggerUnsatisfiedClientsReport);

export default placementRouterV1;
