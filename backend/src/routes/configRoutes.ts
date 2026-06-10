import { Router } from "express";
import { getAppConfig } from "../controllers/configController";

const router = Router();

router.get("/app", getAppConfig);

export default router;
