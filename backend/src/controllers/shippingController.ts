import { Request, Response, NextFunction } from "express";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { AppError } from "../middlewares/errorMiddleware";

const prisma = new PrismaClient();

// Helper function to read, parse, update and save .env file
const updateEnvFile = (updates: Record<string, string>) => {
  const envPath = path.resolve(process.cwd(), ".env");
  
  let envContent = "";
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf-8");
  }

  const lines = envContent.split("\n");
  const envMap: Record<string, string> = {};

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    
    const splitIndex = trimmed.indexOf("=");
    if (splitIndex !== -1) {
      const key = trimmed.substring(0, splitIndex).trim();
      envMap[key] = line;
    }
  });

  let updatedContent = envContent;
  
  for (const [key, value] of Object.entries(updates)) {
    process.env[key] = value;
    const newLine = `${key}="${value}"`;

    if (envMap[key] !== undefined) {
      updatedContent = updatedContent.replace(envMap[key], newLine);
      envMap[key] = newLine;
    } else {
      updatedContent += `\n${newLine}`;
    }
  }

  if (!updatedContent.endsWith("\n")) {
    updatedContent += "\n";
  }

  fs.writeFileSync(envPath, updatedContent, "utf-8");
};

// ----------------------------------------------------
// 1. GET PUBLIC SHIPPING SETTINGS
// ----------------------------------------------------
export const getPublicShippingConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const config = await prisma.cmsConfig.findUnique({
      where: { key: "shipping_config" },
    });

    const defaultSettings = {
      freeShippingThreshold: 75,
      standardShippingFee: 5.95,
      expressShippingFee: 9.95,
      sameDayDelivery: true,
      deliveryCutoffTime: "22:00",
    };

    res.status(200).json({
      success: true,
      data: config && config.value ? config.value : defaultSettings,
    });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 2. GET SECURED SHIPPING CONFIG (includes Sendcloud)
// ----------------------------------------------------
export const getSecuredShippingConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const config = await prisma.cmsConfig.findUnique({
      where: { key: "shipping_config" },
    });

    const defaultSettings = {
      freeShippingThreshold: 75,
      standardShippingFee: 5.95,
      expressShippingFee: 9.95,
      sameDayDelivery: true,
      deliveryCutoffTime: "22:00",
    };

    const publicData = config && config.value ? (config.value as any) : defaultSettings;

    const securedData = {
      ...publicData,
      sendcloudEnabled: process.env.SENDCLOUD_ENABLED === "true" || process.env.SENDCLOUD_ENABLED === "1",
      sendcloudPublicKey: process.env.SENDCLOUD_PUBLIC_KEY || "",
      sendcloudSecretKey: process.env.SENDCLOUD_SECRET_KEY ? "••••••••" : "",
    };

    res.status(200).json({ success: true, data: securedData });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 3. UPDATE SECURED SHIPPING CONFIG
// ----------------------------------------------------
export const updateShippingConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      freeShippingThreshold,
      standardShippingFee,
      expressShippingFee,
      sameDayDelivery,
      deliveryCutoffTime,
      sendcloudEnabled,
      sendcloudPublicKey,
      sendcloudSecretKey,
    } = req.body;

    // 1. Save public settings in DB
    const publicData = {
      freeShippingThreshold,
      standardShippingFee,
      expressShippingFee,
      sameDayDelivery,
      deliveryCutoffTime,
    };

    await prisma.cmsConfig.upsert({
      where: { key: "shipping_config" },
      update: { value: publicData },
      create: { key: "shipping_config", value: publicData },
    });

    // 2. Save secured settings in .env
    const envUpdates: Record<string, string> = {};
    if (sendcloudEnabled !== undefined) envUpdates.SENDCLOUD_ENABLED = sendcloudEnabled.toString();
    if (sendcloudPublicKey !== undefined) envUpdates.SENDCLOUD_PUBLIC_KEY = sendcloudPublicKey;
    if (sendcloudSecretKey !== undefined && sendcloudSecretKey !== "••••••••") {
      envUpdates.SENDCLOUD_SECRET_KEY = sendcloudSecretKey;
    }

    if (Object.keys(envUpdates).length > 0) {
      updateEnvFile(envUpdates);
    }

    res.status(200).json({ success: true, message: "Shipping settings updated successfully" });
  } catch (error: any) {
    next(error);
  }
};
