import { Router } from 'express';
import {
  getDashboard,
  triggerRun,
  triggerRunAll,
  getRuns,
  getSources,
  toggleSource,
  getSchedule,
  updateSchedule,
  killRun,
  streamRunLogs,
  backfillAiVetting,
} from '../../controllers/v1/admin-discovery.controller';
import { authorizeRoles } from '../../middlewares/authorizeRoles';

const adminDiscoveryRouterV1 = Router();
const readAccess = authorizeRoles('admin', 'cec', 'assistant');
const writeAccess = authorizeRoles('admin', 'cec');

adminDiscoveryRouterV1.get('/', readAccess, getDashboard);
adminDiscoveryRouterV1.post('/run', writeAccess, triggerRun);
adminDiscoveryRouterV1.post('/run-all', writeAccess, triggerRunAll);
adminDiscoveryRouterV1.get('/runs', readAccess, getRuns);
adminDiscoveryRouterV1.post('/runs/:id/kill', writeAccess, killRun);
adminDiscoveryRouterV1.get('/runs/:id/logs/stream', readAccess, streamRunLogs);
adminDiscoveryRouterV1.post('/backfill-ai-vetting', writeAccess, backfillAiVetting);
adminDiscoveryRouterV1.get('/sources', readAccess, getSources);
adminDiscoveryRouterV1.patch('/sources/:id/toggle', writeAccess, toggleSource);
adminDiscoveryRouterV1.get('/schedule', readAccess, getSchedule);
adminDiscoveryRouterV1.patch('/schedule', writeAccess, updateSchedule);

export default adminDiscoveryRouterV1;
