import { Router } from "express";
import {
  listQueueEntries,
  raiseStaffTask,
  assignQueueEntry,
  resolveQueueEntry,
} from "../../controllers/v1/queue-entry.controller";
import { authorizeRoles } from "@/middlewares/authorizeRoles";
import { isUserAuthenticated } from "@/middlewares/auth";
import { checkBlacklistedTokens } from "@/middlewares/checkBlacklistedToken";
import { dbMiddleware } from "@/middlewares/dbReady";

const queueEntryRouter = Router();

queueEntryRouter.use(
  checkBlacklistedTokens,
  isUserAuthenticated,
  authorizeRoles("admin", "assistant"),
  dbMiddleware,
);

queueEntryRouter.get("/", listQueueEntries);
queueEntryRouter.post("/staff-tasks", raiseStaffTask);
queueEntryRouter.patch("/:id/assign", assignQueueEntry);
queueEntryRouter.post("/:id/resolve", resolveQueueEntry);

export default queueEntryRouter;
