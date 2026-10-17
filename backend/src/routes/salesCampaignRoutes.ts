import express from "express";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";
import {
  getCampaignsHandler,
  previewCampaignHandler,
  createCampaignHandler,
  updateCampaignHandler,
  toggleCampaignHandler,
  deleteCampaignHandler,
  generateAiCampaignHandler,
} from "../controllers/salesCampaignController";

const router = express.Router();

// All campaign management requires Admin authentication
router.use(authenticateJWT, requireAdmin);

router.get("/", getCampaignsHandler);
router.post("/preview", previewCampaignHandler);
router.post("/ai-generate", generateAiCampaignHandler);
router.post("/", createCampaignHandler);
router.put("/:id", updateCampaignHandler);
router.patch("/:id/toggle", toggleCampaignHandler);
router.delete("/:id", deleteCampaignHandler);

export default router;
