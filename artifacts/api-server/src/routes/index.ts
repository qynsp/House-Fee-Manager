import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import gamesRouter from "./games";
import ticketsRouter from "./tickets";
import depositsRouter from "./deposits";
import withdrawalsRouter from "./withdrawals";
import transfersRouter from "./transfers";
import leaderboardRouter from "./leaderboard";
import settingsRouter from "./settings";
import announcementsRouter from "./announcements";
import dashboardRouter from "./dashboard";

const router = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(gamesRouter);
router.use(ticketsRouter);
router.use(depositsRouter);
router.use(withdrawalsRouter);
router.use(transfersRouter);
router.use(leaderboardRouter);
router.use(settingsRouter);
router.use(announcementsRouter);
router.use(dashboardRouter);

export default router;
