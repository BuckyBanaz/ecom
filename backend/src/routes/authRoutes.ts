import { Router } from "express";
import {
  registerCustomer,
  loginCustomer,
  createAdmin,
  loginAdmin,
  sendOTP,
  verifyOTPLogin,
  getProfile,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser,
  saveFcmToken,
  getAuthConfig,
  getAllUsers,
} from "../controllers/authController";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";
import {
  adminAuthLimiter,
  authLimiter,
  sensitiveAuthLimiter,
} from "../middlewares/rateLimitMiddleware";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User registration, login, and admin account management APIs
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new customer
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "customer123"
 *     responses:
 *       201:
 *         description: Customer registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Customer registered successfully
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "3f8a6142-995b-4395-88fb-976402d1dcd4"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     firstName:
 *                       type: string
 *                       example: "John"
 *                     lastName:
 *                       type: string
 *                       example: "Doe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     phone:
 *                       type: string
 *                       example: "9876543210"
 *                     role:
 *                       type: string
 *                       example: "customer"
 *                     avatar:
 *                       type: string
 *                       example: "https://api.dicebear.com/7.x/initials/svg?seed=John%20Doe"
 *       400:
 *         description: Validation failed (invalid format or missing fields)
 *       409:
 *         description: Conflict (Email or phone already registered)
 */
router.post("/register", authLimiter, registerCustomer);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in as a customer
 *     description: Authenticate by email and password.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "customer123"
 *     responses:
 *       200:
 *         description: Customer logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Customer logged in successfully
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "3f8a6142-995b-4395-88fb-976402d1dcd4"
 *                     name:
 *                       type: string
 *                       example: "John Doe"
 *                     firstName:
 *                       type: string
 *                       example: "John"
 *                     lastName:
 *                       type: string
 *                       example: "Doe"
 *                     email:
 *                       type: string
 *                       example: "john.doe@example.com"
 *                     phone:
 *                       type: string
 *                       example: "9876543210"
 *                     role:
 *                       type: string
 *                       example: "customer"
 *                     avatar:
 *                       type: string
 *                       example: "https://api.dicebear.com/7.x/initials/svg?seed=John%20Doe"
 *       400:
 *         description: Validation failed (missing required identifiers)
 *       401:
 *         description: Unauthorized (Invalid credentials)
 */
router.post("/login", authLimiter, loginCustomer);

/**
 * @swagger
 * /api/v1/auth/create-admin:
 *   post:
 *     summary: Create a new Admin account
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - role
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: subadmin@lamp.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "admin123"
 *               role:
 *                 type: string
 *                 enum: [admin, superadmin, moderator]
 *                 example: "admin"
 *     responses:
 *       201:
 *         description: Admin account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: ADMIN admin account created successfully
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     avatar:
 *                       type: string
 *       400:
 *         description: Validation failed
 *       409:
 *         description: Conflict (Email already registered)
 */
router.post(
  "/create-admin", 
  authenticateJWT, 
  (req: any, res: any, next: any) => {
    if (req.user?.role !== "superadmin") {
      const { AppError } = require("../middlewares/errorMiddleware");
      return next(new AppError("Access denied. Only superadmins can create admin accounts.", 403));
    }
    next();
  }, 
  createAdmin
);

/**
 * @swagger
 * /api/v1/auth/login-admin:
 *   post:
 *     summary: Log in as an Admin
 *     description: Authenticate admin accounts with matching email and password.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: super@lamp.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "admin123"
 *     responses:
 *       200:
 *         description: Admin logged in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: SUPERADMIN logged in successfully
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                     avatar:
 *                       type: string
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Unauthorized (Invalid credentials)
 *       403:
 *         description: Access Denied (Not an admin)
 */
router.post("/login-admin", adminAuthLimiter, loginAdmin);


/**
 * @swagger
 * /api/v1/auth/send-otp:
 *   post:
 *     summary: Send OTP for phone login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid phone number format
 *       404:
 *         description: No account found with this phone number
 */
router.post("/send-otp", sensitiveAuthLimiter, sendOTP);

/**
 * @swagger
 * /api/v1/auth/verify-otp:
 *   post:
 *     summary: Verify OTP and log in
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - otp
 *             properties:
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Phone verified and logged in successfully
 *       400:
 *         description: Invalid or missing OTP
 *       401:
 *         description: Invalid or expired OTP
 *       404:
 *         description: User not found
 */
router.post("/verify-otp", authLimiter, verifyOTPLogin);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   get:
 *     summary: Get logged-in user profile
 *     tags: [Customer APIs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile data
 */
router.get("/profile", authenticateJWT, getProfile);

/**
 * @swagger
 * /api/v1/auth/profile:
 *   put:
 *     summary: Update logged-in user profile
 *     tags: [Customer APIs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put("/profile", authenticateJWT, updateProfile);

/**
 * @swagger
 * /api/v1/auth/fcm-token:
 *   post:
 *     summary: Save Firebase Cloud Messaging token for the user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *             properties:
 *               token:
 *                 type: string
 *     responses:
 *       200:
 *         description: FCM Token saved successfully
 */
router.post("/fcm-token", authenticateJWT, saveFcmToken);

/**
 * @swagger
 * /api/v1/auth/change-password:
 *   put:
 *     summary: Change logged-in user password
 *     tags: [Customer APIs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password updated successfully
 *       400:
 *         description: Incorrect current password
 */
router.put("/change-password", authenticateJWT, changePassword);

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request a password reset OTP
 *     tags: [Customer APIs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset OTP sent
 */
router.post("/forgot-password", sensitiveAuthLimiter, forgotPassword);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Customer APIs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *               otp:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post("/reset-password", sensitiveAuthLimiter, resetPassword);

// ----------------------------------------------------
// Customer Users Management (Admin view all users)
// ----------------------------------------------------

/**
 * @swagger
 * /api/v1/auth/users:
 *   get:
 *     summary: Get all registered users (Customers)
 *     description: Retrieve a list of all registered users. Only accessible by admins.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       role:
 *                         type: string
 *                       status:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin privileges required)
 */
router.get("/users", authenticateJWT, requireAdmin, getAllUsers);

// Admin User Management Routes (CRUD)

/**
 * @swagger
 * /api/v1/auth/admins:
 *   get:
 *     summary: Get all admin users
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of admin users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       firstName:
 *                         type: string
 *                       lastName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       role:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Admin privileges required)
 */
router.get("/admins", authenticateJWT, requireAdmin, getAdminUsers);

/**
 * @swagger
 * /api/v1/auth/admins/{id}:
 *   put:
 *     summary: Update an admin user's role
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The admin user ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [admin, superadmin, moderator]
 *                 example: admin
 *     responses:
 *       200:
 *         description: Admin user role updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: User role updated successfully
 *                 user:
 *                   type: object
 *       400:
 *         description: Validation failed or invalid role
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Only superadmins can modify roles)
 *       404:
 *         description: Admin user not found
 */
router.put(
  "/admins/:id", 
  authenticateJWT, 
  (req: any, res: any, next: any) => {
    if (req.user?.role !== "superadmin") {
      const { AppError } = require("../middlewares/errorMiddleware");
      return next(new AppError("Access denied. Only superadmins can modify admin roles.", 403));
    }
    next();
  }, 
  updateAdminUser
);

/**
 * @swagger
 * /api/v1/auth/admins/{id}:
 *   delete:
 *     summary: Delete an admin user account
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The admin user ID
 *     responses:
 *       200:
 *         description: Admin user deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Admin user deleted successfully
 *       400:
 *         description: Cannot delete yourself or invalid action
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Only superadmins can delete admin accounts)
 *       404:
 *         description: Admin user not found
 */
router.delete(
  "/admins/:id", 
  authenticateJWT, 
  (req: any, res: any, next: any) => {
    if (req.user?.role !== "superadmin") {
      const { AppError } = require("../middlewares/errorMiddleware");
      return next(new AppError("Access denied. Only superadmins can delete admin accounts.", 403));
    }
    next();
  }, 
  deleteAdminUser
);

/**
 * @swagger
 * /api/v1/auth/config:
 *   get:
 *     summary: Get auth configuration
 *     tags: [Authentication]
 *     responses:
 *       200:
 *         description: Auth configuration retrieved
 */
router.get("/config", getAuthConfig);

export default router;
