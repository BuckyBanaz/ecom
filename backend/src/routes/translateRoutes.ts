import { Router } from "express";
import { proxyTranslate } from "../controllers/translateController";

const router = Router();

// POST /api/v1/translate
router.post("/", proxyTranslate);

export default router;
