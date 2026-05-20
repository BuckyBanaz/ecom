import { Router } from "express";
import {
  registerCustomer,
  loginCustomer,
  createAdmin,
  loginAdmin,
} from "../controllers/authController";

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
router.post("/register", registerCustomer);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in as a customer
 *     description: Authenticate by email, phone, or a combined emailOrPhone identifier.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *               emailOrPhone:
 *                 type: string
 *                 description: Can be email or phone combined field
 *                 example: "john.doe@example.com"
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
router.post("/login", loginCustomer);

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
router.post("/create-admin", createAdmin);

/**
 * @swagger
 * /api/v1/auth/login-admin:
 *   post:
 *     summary: Log in as an Admin
 *     description: Authenticate admin accounts with matching email, password, and specific role.
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
 *                 example: super@lamp.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "admin123"
 *               role:
 *                 type: string
 *                 enum: [admin, superadmin, moderator]
 *                 example: "superadmin"
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
 *         description: Access Denied (Role mismatch)
 */
router.post("/login-admin", loginAdmin);

export default router;
