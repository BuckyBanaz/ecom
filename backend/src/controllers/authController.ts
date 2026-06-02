import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { AppError } from "../middlewares/errorMiddleware";
import redis from "../config/redis";
import { emailService } from "../services/emailService";

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

    // Send Welcome Email
    await emailService.sendTemplateEmail(newUser.email, "welcome_mail", {
      name: newUser.firstName,
      login_url: `${env.CLIENT_URL}/account`
    });

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
  email: z.string().email("Invalid email address"),
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

    const { email, password } = parsed.data;

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
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

// ----------------------------------------------------
// 5. SEND OTP CONTROLLER
// ----------------------------------------------------
const sendOtpSchema = z.object({
  phone: z.string().min(10, "Valid phone number is required"),
});

export const sendOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = sendOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError("Invalid phone number format", 400));
    }

    const { phone } = parsed.data;

    // Verify if user exists
    const user = await prisma.user.findFirst({
      where: { phone },
    });

    if (!user) {
      return next(new AppError("No account found with this phone number", 404));
    }

    if (!redis) {
      return next(new AppError("Redis is not enabled. Cannot send OTP.", 500));
    }

    // Generate 6-digit OTP (HARDCODED TO 123456 FOR DEMO)
    const otp = "123456";

    // Save in Redis with 5 minutes expiration
    const redisKey = `otp:${phone}`;
    await redis.setex(redisKey, 300, otp);

    // TODO: Integrate actual SMS gateway here.
    // For now, print to console for demo
    console.log(`\n========================================`);
    console.log(`📲 [DEMO SMS] OTP for ${phone} is: ${otp}`);
    console.log(`========================================\n`);

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 6. VERIFY OTP LOGIN CONTROLLER
// ----------------------------------------------------
const verifyOtpSchema = z.object({
  phone: z.string().min(10, "Valid phone number is required"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
});

export const verifyOTPLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = verifyOtpSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError("Invalid input format", 400));
    }

    const { phone, otp } = parsed.data;

    if (!redis) {
      return next(new AppError("Redis is not enabled.", 500));
    }

    // Verify OTP in Redis
    const redisKey = `otp:${phone}`;
    const storedOtp = await redis.get(redisKey);

    if (!storedOtp) {
      return next(new AppError("OTP has expired or was not sent", 400));
    }

    if (storedOtp !== otp) {
      return next(new AppError("Invalid OTP entered", 401));
    }

    // OTP matched, fetch the user
    const user = await prisma.user.findFirst({
      where: { phone },
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Delete OTP from Redis so it cannot be reused
    await redis.del(redisKey);

    // Sign JWT Token
    const token = signToken(user.id, user.email, user.role);

    res.status(200).json({
      success: true,
      message: "Phone verified and logged in successfully",
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
// 6. GET LOGGED IN USER PROFILE
// ----------------------------------------------------
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return next(new AppError("Not authorized", 401));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      }
    });

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({ success: true, data: user });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 7. UPDATE LOGGED IN USER PROFILE
// ----------------------------------------------------
const updateProfileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
});

export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return next(new AppError("Not authorized", 401));
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsgs = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return next(new AppError(`Validation failed: ${errorMsgs}`, 400));
    }

    const { firstName, lastName, phone } = parsed.data;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        name: `${firstName || ''} ${lastName || ''}`.trim() || undefined,
        phone,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phone: true,
      }
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser
    });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 8. CHANGE PASSWORD (AUTHENTICATED)
// ----------------------------------------------------
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return next(new AppError("Not authorized", 401));
    }

    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const errorMsgs = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", ");
      return next(new AppError(`Validation failed: ${errorMsgs}`, 400));
    }

    const { currentPassword, newPassword } = parsed.data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return next(new AppError("Incorrect current password", 400));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    // Send Password Change Email
    await emailService.sendTemplateEmail(user.email, "change_password", {
      name: user.firstName
    });

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 9. FORGOT PASSWORD
// ----------------------------------------------------
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      return next(new AppError("Email is required", 400));
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const redisKey = `reset_otp:${email.toLowerCase()}`;
    await redis.set(redisKey, otp, "EX", 10 * 60); // 10 mins

    // Send Forgot Password OTP
    await emailService.sendTemplateEmail(user.email, "forgot_password", {
      name: user.firstName,
      otp: otp
    });

    res.status(200).json({ success: true, message: `Password reset OTP sent to ${email}` });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 10. RESET PASSWORD
// ----------------------------------------------------
const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string(),
  newPassword: z.string().min(6),
});

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError("Invalid input data", 400));
    }

    const { email, otp, newPassword } = parsed.data;
    const redisKey = `reset_otp:${email.toLowerCase()}`;
    const storedOtp = await redis.get(redisKey);

    if (!storedOtp || storedOtp !== otp) {
      return next(new AppError("Invalid or expired OTP", 400));
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    await redis.del(redisKey);

    // Send Reset Password Confirmation
    await emailService.sendTemplateEmail(user.email, "reset_password", {
      name: user.firstName
    });

    res.status(200).json({ success: true, message: "Password reset successfully" });
  } catch (error: any) {
    next(error);
  }
};
