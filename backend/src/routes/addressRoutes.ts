import express from "express";
import { getAddresses, createAddress, updateAddress, deleteAddress } from "../controllers/addressController";
import { authenticateJWT, validateUserExists } from "../middlewares/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     AddressInput:
 *       type: object
 *       required:
 *         - label
 *         - firstName
 *         - lastName
 *         - phone
 *         - street
 *         - city
 *         - state
 *         - pincode
 *         - country
 *       properties:
 *         label:
 *           type: string
 *         firstName:
 *           type: string
 *         lastName:
 *           type: string
 *         phone:
 *           type: string
 *         street:
 *           type: string
 *         city:
 *           type: string
 *         state:
 *           type: string
 *         pincode:
 *           type: string
 *         country:
 *           type: string
 *         lat:
 *           type: string
 *         lng:
 *           type: string
 *         isDefault:
 *           type: boolean
 */

router.use(authenticateJWT);

/**
 * @swagger
 * /api/v1/addresses:
 *   get:
 *     summary: Get all addresses for logged-in customer
 *     tags: [Customer APIs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of addresses
 */
router.get("/", getAddresses);

/**
 * @swagger
 * /api/v1/addresses:
 *   post:
 *     summary: Create a new address
 *     tags: [Customer APIs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressInput'
 *     responses:
 *       201:
 *         description: Created
 */
router.post("/", validateUserExists, createAddress);

/**
 * @swagger
 * /api/v1/addresses/{id}:
 *   put:
 *     summary: Update an address
 *     tags: [Customer APIs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddressInput'
 *     responses:
 *       200:
 *         description: Updated
 */
router.put("/:id", validateUserExists, updateAddress);

/**
 * @swagger
 * /api/v1/addresses/{id}:
 *   delete:
 *     summary: Delete an address
 *     tags: [Customer APIs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 */
router.delete("/:id", validateUserExists, deleteAddress);

export default router;
