import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import storageRouter from "./storage";
import businessesRouter from "./businesses";
import campaignsRouter from "./campaigns";
import placesRouter from "./places";
import publicReviewRouter from "./publicReview";
import publicDemoReviewRouter from "./publicDemoReview";
import publicRedirectRouter from "./publicRedirect";
import qrRouter from "./qr";
import demoRequestsRouter from "./demoRequests";
import reviewManagementRouter from "./reviewManagement";
import feedbackRouter from "./feedback";
import socialMediaRouter from "./socialMedia";
import teamsRouter from "./teams";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use("/v1", authRouter);
router.use("/v1", adminRouter);
router.use("/v1", businessesRouter);
router.use("/v1", campaignsRouter);
router.use("/v1", placesRouter);
router.use("/v1", publicReviewRouter);
router.use("/v1", publicDemoReviewRouter);
router.use("/v1", publicRedirectRouter);
router.use("/v1", qrRouter);
router.use("/v1", demoRequestsRouter);
router.use("/v1", reviewManagementRouter);
router.use("/v1", feedbackRouter);
router.use("/v1", socialMediaRouter);
router.use("/v1", teamsRouter);

export default router;
