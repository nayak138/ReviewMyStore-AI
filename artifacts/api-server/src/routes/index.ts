import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import storageRouter from "./storage";
import businessesRouter from "./businesses";
import campaignsRouter from "./campaigns";
import placesRouter from "./places";
import publicReviewRouter from "./publicReview";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use("/v1", authRouter);
router.use("/v1", adminRouter);
router.use("/v1", businessesRouter);
router.use("/v1", campaignsRouter);
router.use("/v1", placesRouter);
router.use("/v1", publicReviewRouter);

export default router;
