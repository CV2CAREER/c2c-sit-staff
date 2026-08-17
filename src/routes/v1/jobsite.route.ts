import { Router } from "express";
import { checkBlacklistedTokens } from "../../middlewares/checkBlacklistedToken";
import { isUserAuthenticated } from "../../middlewares/auth";
import {
  getJobsite,
  upsertJobsite,
  updateJobsite,
  deleteJobsite,
} from "../../controllers/v1/jobsite.controller";
import { authorizeRoles } from "@/middlewares/authorizeRoles";

const jobsiteRouterV1 = Router();

jobsiteRouterV1.use(checkBlacklistedTokens, isUserAuthenticated);

// GET  /jobsite?action=retrieve&userId=...   → list user's jobsites with aggregator details
// GET  /jobsite?action=trigger&userId=...&aggId=...  → trigger title sync + sample queue
jobsiteRouterV1.get("/", getJobsite);

// POST /jobsite  → create or upsert a jobsite link on user's profile
jobsiteRouterV1.post("/", authorizeRoles("admin"), upsertJobsite);

// PUT  /jobsite  → update fields on an existing jobsite link
jobsiteRouterV1.put("/", authorizeRoles("admin"), updateJobsite);

// DELETE /jobsite?userId=...&aggId=...     → remove one jobsite
// DELETE /jobsite?userId=...&aggIds=a,b,c  → remove multiple jobsites
jobsiteRouterV1.delete("/", authorizeRoles("admin"), deleteJobsite);

export default jobsiteRouterV1;
