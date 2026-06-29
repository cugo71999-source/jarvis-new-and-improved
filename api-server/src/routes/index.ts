import { Router, type IRouter } from "express";
import healthRouter from "./health";
import voiceRouter from "./voice";
import llmRouter from "./llm";

const router: IRouter = Router();

router.use(healthRouter);
router.use(voiceRouter);
router.use("/llm", llmRouter);

export default router;
