import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./errorMiddleware";
import { prisma } from "../config/db";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateJWT = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  let token = "";
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  } else if (req.query.token && typeof req.query.token === "string") {
    token = req.query.token;
  }

  if (token) {
    jwt.verify(token, env.JWT_SECRET, (err, decoded: any) => {
      if (err) {
        return next(new AppError("Invalid or expired authentication token", 401));
      }
      req.user = decoded as { id: string; email: string; role: string };
      next();
    });
  } else {
    return next(new AppError("Authorization token required", 401));
  }
};

// Optional: Verify user exists in database (call this in routes that modify data)
export const validateUserExists = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?.id;
    if (!userId) return next(new AppError("Not authorized", 401));

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return next(new AppError("User not found or has been deleted", 404));
    }

    // Check if user is suspended
    if (user.status === "suspended") {
      return next(new AppError("User account is suspended", 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};

const ROLE_PERMISSIONS: Record<string, string[]> = {
  superadmin: [
    "dashboard", "products", "categories", "brands", "attributes", 
    "orders", "offers", "charges", "reviews", "testimonials", 
    "storage", "users", "manage_users", "cms", "email_templates", "settings"
  ],
  admin: [
    "dashboard", "products", "categories", "brands", "attributes", 
    "orders", "offers", "charges", "reviews", "testimonials", 
    "storage", "users", "email_templates"
  ],
  moderator: [
    "dashboard", "products", "orders", "reviews", "testimonials"
  ]
};

const BASE_URL_PERMISSIONS: Record<string, string> = {
  "/api/v1/products": "products",
  "/api/v1/categories": "categories",
  "/api/v1/brands": "brands",
  "/api/v1/series": "brands",
  "/api/v1/attributes": "attributes",
  "/api/v1/orders": "orders",
  "/api/v1/coupons": "offers",
  "/api/v1/charges": "charges",
  "/api/v1/reviews": "reviews",
  "/api/v1/blogs": "cms",
  "/api/v1/cms": "cms",
  "/api/v1/media": "storage",
  "/api/v1/admin/settings": "settings",
  "/api/v1/admin/email-templates": "email_templates",
  "/api/v1/megamenus": "cms",
  "/api/v1/shipping": "settings",
  "/api/v1/webhooks": "settings"
};

const getRequiredPermission = (req: Request): string | null => {
  const url = req.originalUrl || req.url || "";
  
  if (url.includes("/api/v1/auth/admins") || url.includes("/api/v1/auth/create-admin")) {
    return "manage_users";
  }
  
  const baseUrl = req.baseUrl || "";
  if (BASE_URL_PERMISSIONS[baseUrl]) {
    return BASE_URL_PERMISSIONS[baseUrl];
  }
  
  for (const [prefix, permission] of Object.entries(BASE_URL_PERMISSIONS)) {
    if (url.startsWith(prefix)) {
      return permission;
    }
  }
  
  return null;
};

export const requireAdmin = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(new AppError("Authentication required", 401));
  }

  const { role } = req.user;
  if (role !== "admin" && role !== "superadmin" && role !== "moderator") {
    return next(new AppError("Access denied. Admin privileges required.", 403));
  }

  let permissions = ROLE_PERMISSIONS[role] || [];
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: req.user.id }
    });
    if (!dbUser || dbUser.status === "suspended") {
      return next(new AppError("Access denied. Your account is suspended.", 403));
    }
    if (dbUser.permissions && dbUser.permissions.length > 0) {
      permissions = dbUser.permissions;
    }
  } catch (error) {
    return next(error);
  }

  // Check role-based permission
  const requiredPermission = getRequiredPermission(req);
  if (requiredPermission) {
    if (!permissions.includes(requiredPermission)) {
      return next(new AppError(`Access denied. Missing required permission: ${requiredPermission}`, 403));
    }
  }

  next();
};
