import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { AppError } from "../middlewares/errorMiddleware";
import redis from "../config/redis";
import { emailService } from "../services/emailService";
import { twilioService } from "../services/twilioService";
import { parseAndValidateFullPhone } from "../utils/phoneValidation";

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
  email: z.string().optional(),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  otp: z.string().optional(),
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

    const { firstName, lastName, password } = parsed.data;
    let { email, phone, otp } = parsed.data;

    const registerMethod = process.env.AUTH_REGISTER_METHOD || "both";
    
    if (registerMethod === "both" || registerMethod === "email_only") {
      if (!email || !email.includes("@")) {
        return next(new AppError("Valid email address is required", 400));
      }
    }
    
    if (registerMethod === "both" || registerMethod === "phone_only") {
      if (!phone) {
        return next(new AppError("Phone number is required", 400));
      }
      const validation = parseAndValidateFullPhone(phone);
      if (!validation.isValid) {
        return next(new AppError("Phone number must be a valid +31 or +91 format with correct digits", 400));
      }
      phone = validation.cleanedFullPhone;
    } else if (phone && !phone.startsWith("placeholder-")) {
      const validation = parseAndValidateFullPhone(phone);
      if (!validation.isValid) {
        return next(new AppError("Phone number must be a valid +31 or +91 format with correct digits", 400));
      }
      phone = validation.cleanedFullPhone;
    }

    if (!email && !phone) {
      return next(new AppError("Either email or phone is required", 400));
    }

    // Default to placeholders if not provided based on method
    if (!email) email = `${phone}@placeholder.com`;
    if (!phone) phone = `placeholder-${Date.now()}`;

    // Check if email or phone already exists
    const orConditions: any[] = [];
    if (email && email !== `${phone}@placeholder.com`) orConditions.push({ email: email.toLowerCase() });
    if (phone && !phone.startsWith("placeholder-")) orConditions.push({ phone: phone });

    if (orConditions.length > 0) {
      const existingUser = await prisma.user.findFirst({
        where: { OR: orConditions },
      });

      if (existingUser) {
        if (existingUser.email === email?.toLowerCase() && !email.includes("@placeholder.com")) {
          return next(new AppError("Email is already registered", 409));
        }
        if (existingUser.phone === phone && !phone.startsWith("placeholder-")) {
          return next(new AppError("Phone number is already registered", 409));
        }
      }
    }

    // Verify OTP if phone registration is active
    if (phone && !phone.startsWith("placeholder-") && (registerMethod === "both" || registerMethod === "phone_only")) {
      if (!otp) {
        return next(new AppError("OTP is required for phone registration", 400));
      }

      if (!redis) {
        return next(new AppError("Redis is not enabled", 500));
      }

      const redisKey = `otp:register:${phone}`;
      const storedOtp = await redis.get(redisKey);

      if (!storedOtp) {
        return next(new AppError("OTP has expired or was not sent", 400));
      }

      if (storedOtp !== otp) {
        return next(new AppError("Invalid OTP entered", 401));
      }

      // Delete OTP from Redis
      await redis.del(redisKey);
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
  permissions: z.array(z.string()).optional(),
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

    const { email, password, role, permissions } = parsed.data;

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
        permissions: permissions || [],
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
  role: z.enum(["admin", "superadmin", "moderator"]).optional(),
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

    const { email, password } = parsed.data;

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return next(new AppError("Invalid credentials", 401));
    }

    // Verify role is one of the admin roles
    if (user.role !== "admin" && user.role !== "superadmin" && user.role !== "moderator") {
      return next(new AppError("Access denied. Admin privileges required.", 403));
    }

    // Verify status is active
    if (user.status === "suspended") {
      return next(new AppError("Access denied. Your account is suspended.", 403));
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
      message: `${user.role.toUpperCase()} logged in successfully`,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        permissions: user.permissions || [],
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
  type: z.enum(["login", "register"]).optional().default("login"),
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

    let { phone, type } = parsed.data;
    const validation = parseAndValidateFullPhone(phone);
    if (!validation.isValid) {
      return next(new AppError("Phone number must be a valid +31 or +91 format with correct digits", 400));
    }
    phone = validation.cleanedFullPhone;

    // Verify if user exists based on type
    const user = await prisma.user.findFirst({
      where: { phone },
    });

    if (type === "login") {
      if (!user) {
        return next(new AppError("No account found with this phone number", 404));
      }
    } else if (type === "register") {
      if (user) {
        return next(new AppError("Phone number is already registered", 409));
      }
    }

    if (!redis) {
      return next(new AppError("Redis is not enabled. Cannot send OTP.", 500));
    }

    // Rate Limiting: Max 3 OTPs per 30 minutes
    const rateLimitKey = `rate_limit:otp:${phone}`;
    const currentAttempts = await redis.incr(rateLimitKey);
    
    if (currentAttempts === 1) {
      await redis.expire(rateLimitKey, 1800); // Set expiration to 30 minutes
    }

    if (currentAttempts > 3) {
      await redis.decr(rateLimitKey); // Revert increment if blocked
      return next(new AppError("OTP limit exceeded. Try again some time later.", 429));
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Save in Redis with 5 minutes expiration
    const redisKey = type === "login" ? `otp:${phone}` : `otp:register:${phone}`;
    await redis.setex(redisKey, 300, otp);

    const smsBody = `Schip & Ster Your verification code is ${otp}. Valid for 5 minutes.`;
    const twilioRes = await twilioService.sendSMS(phone, smsBody);

    if (!twilioRes.success) {
      return next(new AppError(`Failed to send SMS: ${twilioRes.error}`, 500));
    }

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

    let { phone, otp } = parsed.data;
    const validation = parseAndValidateFullPhone(phone);
    if (!validation.isValid) {
      return next(new AppError("Phone number must be a valid +31 or +91 format with correct digits", 400));
    }
    phone = validation.cleanedFullPhone;

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
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        avatar: true,
        permissions: true,
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

    let { firstName, lastName, phone } = parsed.data;
    if (phone) {
      const validation = parseAndValidateFullPhone(phone);
      if (!validation.isValid) {
        return next(new AppError("Phone number must be a valid +31 or +91 format with correct digits", 400));
      }
      phone = validation.cleanedFullPhone;
    }

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

// ----------------------------------------------------
// 10.5 GET ALL USERS (ADMIN/SUPERADMIN)
// ----------------------------------------------------
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        firstName: true,
        lastName: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.status(200).json({ success: true, data: users });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 11. GET ALL ADMIN USERS (ADMIN/SUPERADMIN ONLY)
// ----------------------------------------------------
export const getAdminUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const admins = await prisma.user.findMany({
      where: {
        role: {
          in: ["superadmin", "admin", "moderator"]
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        permissions: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    res.status(200).json({ success: true, data: admins });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 12. UPDATE ADMIN USER (SUPERADMIN ONLY)
// ----------------------------------------------------
export const updateAdminUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { role, name, email, status, permissions } = req.body;

    const dataToUpdate: any = {};
    
    if (role) {
      if (!["superadmin", "admin", "moderator"].includes(role)) {
        return next(new AppError("Invalid role specified", 400));
      }
      dataToUpdate.role = role;
    }
    
    if (name !== undefined) {
      dataToUpdate.name = name;
    }
    
    if (email) {
      dataToUpdate.email = email.toLowerCase();
    }
    
    if (status) {
      if (!["active", "suspended"].includes(status)) {
        return next(new AppError("Invalid status specified", 400));
      }
      dataToUpdate.status = status;
    }

    if (permissions !== undefined) {
      if (!Array.isArray(permissions)) {
        return next(new AppError("Permissions must be an array of strings", 400));
      }
      dataToUpdate.permissions = permissions;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        permissions: true,
        createdAt: true,
      }
    });

    res.status(200).json({ success: true, data: updatedUser, message: "Admin user updated successfully" });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 13. DELETE ADMIN USER (SUPERADMIN ONLY)
// ----------------------------------------------------
export const deleteAdminUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    const reqUserId = (req as any).user?.id;
    if (reqUserId === id) {
      return next(new AppError("You cannot delete your own admin account", 400));
    }

    await prisma.user.delete({
      where: { id }
    });

    res.status(200).json({ success: true, message: "Admin user deleted successfully" });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 14. SAVE FCM TOKEN
// ----------------------------------------------------
export const saveFcmToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return next(new AppError("Not authorized", 401));
    }

    const { token } = req.body;
    if (!token) {
      return next(new AppError("FCM token is required", 400));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return next(new AppError("User not found", 404));
    }

    // Add token if it doesn't exist
    const currentTokens = user.fcmTokens || [];
    if (!currentTokens.includes(token)) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          fcmTokens: {
            push: token
          }
        }
      });
    }

    res.status(200).json({ success: true, message: "FCM token saved successfully" });
  } catch (error: any) {
    next(error);
  }
};

// ----------------------------------------------------
// 15. GET AUTH CONFIG (Public)
// ----------------------------------------------------
export const getAuthConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const config = {
      emailLogin: process.env.AUTH_ENABLE_EMAIL !== "false",
      phoneLogin: process.env.AUTH_ENABLE_PHONE === "true",
      registerMethod: process.env.AUTH_REGISTER_METHOD || "both",
    };
    res.status(200).json({ success: true, data: config });
  } catch (error: any) {
    next(error);
  }
};
