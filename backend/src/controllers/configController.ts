import { Request, Response } from "express";
import { env } from "../config/env";
import { getApiBaseUrl } from "../utils/mediaUrl";
import { getInvoiceVendorSettings, isApiDocsEnabled } from "../utils/generalSettings";

export const getAppConfig = async (_req: Request, res: Response) => {
  const invoice = getInvoiceVendorSettings();
  res.status(200).json({
    success: true,
    data: {
      apiUrl: getApiBaseUrl(),
      clientUrl: env.CLIENT_URL,
      invoice,
    },
  });
};
