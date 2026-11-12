import { Router } from "express";
import { proxyTranslate, proxyTranslateBatch } from "../controllers/translateController";

const router = Router();

// POST /api/v1/translate
router.post("/", proxyTranslate);

// POST /api/v1/translate/batch
router.post("/batch", proxyTranslateBatch);

export default router;
