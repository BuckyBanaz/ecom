import { Request, Response } from "express";
import { env } from "../config/env";
import { getApiBaseUrl } from "../utils/mediaUrl";

export const getAppConfig = async (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: {
      apiUrl: getApiBaseUrl(),
      clientUrl: env.CLIENT_URL,
    },
  });
};
