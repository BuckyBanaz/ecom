import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./errorMiddleware";

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
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

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

export const requireAdmin = (
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

  next();
};
