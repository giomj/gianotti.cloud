import { Router, type IRouter } from "express";
import healthRouter from "./health";
import postsRouter from "./posts";
import ogRouter from "./og";
import quantumRouter from "./quantum";

const router: IRouter = Router();

router.use(healthRouter);
router.use(postsRouter);
router.use(ogRouter);
router.use(quantumRouter);

export default router;
