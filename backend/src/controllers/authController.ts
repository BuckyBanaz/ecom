import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { AppError } from "../middlewares/errorMiddleware";

// Helper to sign JWT Token
const signToken = (id: string, email: string, role: string): string => {
  return jwt.sign({ id, email, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as any,
  });
};

// ----------------------------------------------------
// 1. REGISTER CUSTOMER CONTROLLER
// ----------------------------------------------------
const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsgs = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return next(new AppError(`Validation failed: ${errorMsgs}`, 400));
    }

    const { firstName, lastName, email, phone, password } = parsed.data;

    // Check if email or phone already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email.toLowerCase() },
          { phone: phone }
        ],
      },
    });

    if (existingUser) {
      if (existingUser.email === email.toLowerCase()) {
        return next(new AppError("Email is already registered", 409));
      }
      if (existingUser.phone === phone) {
        return next(new AppError("Phone number is already registered", 409));
      }
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create full name and avatar
    const name = `${firstName} ${lastName}`.trim();
    const avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

    // Create the customer user
    const newUser = await prisma.user.create({
      data: {
        name,
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        passwordHash,
        role: "customer",
        avatar,
      },
    });

    // Sign token
    const token = signToken(newUser.id, newUser.email, newUser.role);

    res.status(201).json({
      success: true,
      message: "Customer registered successfully",
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        avatar: newUser.avatar,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 2. LOGIN CUSTOMER (BY EMAIL OR PHONE) CONTROLLER
// ----------------------------------------------------
const loginSchema = z.object({
  email: z.string().optional(),
  phone: z.string().optional(),
  emailOrPhone: z.string().optional(),
  password: z.string().min(1, "Password is required"),
});

export const loginCustomer = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsgs = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return next(new AppError(`Validation failed: ${errorMsgs}`, 400));
    }

    const { email, phone, emailOrPhone, password } = parsed.data;

    let searchIdentifier = "";
    let isEmail = true;

    if (email) {
      searchIdentifier = email.toLowerCase();
      isEmail = true;
    } else if (phone) {
      searchIdentifier = phone;
      isEmail = false;
    } else if (emailOrPhone) {
      searchIdentifier = emailOrPhone;
      isEmail = searchIdentifier.includes("@");
    } else {
      return next(new AppError("Please provide an email, phone number, or emailOrPhone identifier", 400));
    }

    // Find user in database
    const user = await prisma.user.findFirst({
      where: isEmail
        ? { email: searchIdentifier }
        : { phone: searchIdentifier },
    });

    if (!user) {
      return next(new AppError("Invalid credentials", 401));
    }

    // Compare passwords
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      return next(new AppError("Invalid credentials", 401));
    }

    // Generate JWT
    const token = signToken(user.id, user.email, user.role);

    res.status(200).json({
      success: true,
      message: "Customer logged in successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 3. CREATE ADMIN CONTROLLER
// ----------------------------------------------------
const createAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["admin", "superadmin", "moderator"]).default("admin"),
});

export const createAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = createAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsgs = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return next(new AppError(`Validation failed: ${errorMsgs}`, 400));
    }

    const { email, password, role } = parsed.data;

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return next(new AppError("Email is already registered", 409));
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate name and avatar for admin
    const username = email.split("@")[0];
    const name = username.charAt(0).toUpperCase() + username.slice(1) + " (Admin)";
    const avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`;

    // Create the admin user
    const newAdmin = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        role,
        avatar,
      },
    });

    // Sign token
    const token = signToken(newAdmin.id, newAdmin.email, newAdmin.role);

    res.status(201).json({
      success: true,
      message: `${role.toUpperCase()} admin account created successfully`,
      token,
      user: {
        id: newAdmin.id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        avatar: newAdmin.avatar,
      },
    });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 4. LOGIN ADMIN CONTROLLER
// ----------------------------------------------------
const loginAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  role: z.enum(["admin", "superadmin", "moderator"]).default("admin"),
});

export const loginAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = loginAdminSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsgs = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return next(new AppError(`Validation failed: ${errorMsgs}`, 400));
    }

    const { email, password, role } = parsed.data;

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return next(new AppError("Invalid credentials", 401));
    }

    // Verify role matches
    if (user.role !== role) {
      return next(new AppError(`Access denied. Account is registered as ${user.role}, not ${role}`, 403));
    }

    // Compare passwords
    const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatch) {
      return next(new AppError("Invalid credentials", 401));
    }

    // Sign token
    const token = signToken(user.id, user.email, user.role);

    res.status(200).json({
      success: true,
      message: `${role.toUpperCase()} logged in successfully`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    next(error);
  }
};
