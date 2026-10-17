import { Request, Response, NextFunction } from "express";
import {
  getAllSalesCampaigns,
  createSalesCampaign,
  updateSalesCampaign,
  toggleSalesCampaign,
  deleteSalesCampaign,
  previewCampaignProducts,
} from "../services/salesCampaignService";
import { aiService } from "../services/aiService";

export const getCampaignsHandler = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaigns = await getAllSalesCampaigns();
    res.json({ success: true, data: campaigns });
  } catch (error) {
    next(error);
  }
};

export const previewCampaignHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const preview = await previewCampaignProducts(req.body || {});
    res.json({ success: true, ...preview });
  } catch (error) {
    next(error);
  }
};

export const createCampaignHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campaign = await createSalesCampaign(req.body);
    res.status(201).json({
      success: true,
      message: campaign.isActive
        ? `Campaign created and applied to ${campaign.affectedProductCount || 0} product(s)!`
        : "Campaign created in draft mode.",
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCampaignHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const campaign = await updateSalesCampaign(id, req.body);
    res.json({
      success: true,
      message: "Campaign updated successfully.",
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

export const toggleCampaignHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const campaign = await toggleSalesCampaign(id, !!isActive);
    res.json({
      success: true,
      message: campaign.isActive
        ? `Campaign activated! Prices updated for ${campaign.affectedProductCount || 0} products.`
        : "Campaign paused. Original prices restored safely.",
      data: campaign,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCampaignHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    await deleteSalesCampaign(id);
    res.json({
      success: true,
      message: "Campaign deleted and original prices restored.",
    });
  } catch (error) {
    next(error);
  }
};

export const generateAiCampaignHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      res.status(400).json({ success: false, error: "Please provide a campaign description or instruction." });
      return;
    }

    const generated = await aiService.generateSalesCampaign(prompt.trim());

    // Preview affected products based on AI matched criteria
    let preview: any = { totalCount: 0, products: [] };
    try {
      preview = await previewCampaignProducts(generated);
    } catch (e) {
      console.warn("Could not preview AI matched products:", e);
    }

    res.json({
      success: true,
      campaign: generated,
      preview,
    });
  } catch (error: any) {
    console.error("AI Sales Campaign Generation Error:", error);
    res.status(500).json({ success: false, error: error?.message || "Failed to generate campaign with AI." });
  }
};
