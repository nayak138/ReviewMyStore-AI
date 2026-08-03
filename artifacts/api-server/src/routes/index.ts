import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import adminRouter from "./admin";
import storageRouter from "./storage";
import businessesRouter from "./businesses";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use("/v1", authRouter);
router.use("/v1", adminRouter);
router.use("/v1", businessesRouter);

export default router;
