import { Router } from "express";
import { toPublicMediaUrl } from "../utils/mediaUrl";
import { authenticateJWT, requireAdmin } from "../middlewares/authMiddleware";
import { listMedia, createFolder, deleteMedia, upload, renameMedia, moveMedia, copyMedia } from "../controllers/mediaController";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Media
 *   description: Media storage and file management operations
 */

// All media routes are protected and for admins only
router.use(authenticateJWT, requireAdmin);

/**
 * @swagger
 * /api/v1/media:
 *   get:
 *     summary: List files and folders
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: folder
 *         schema:
 *           type: string
 *         description: Path to the folder to list contents from
 *     responses:
 *       200:
 *         description: List of media items
 *       500:
 *         description: Server error
 */
router.get("/", listMedia);

/**
 * @swagger
 * /api/v1/media/folder:
 *   post:
 *     summary: Create a new folder
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               path:
 *                 type: string
 *                 description: Parent folder path
 *               name:
 *                 type: string
 *                 description: Name of the new folder
 *     responses:
 *       201:
 *         description: Folder created successfully
 *       400:
 *         description: Bad request
 */
router.post("/folder", createFolder);

/**
 * @swagger
 * /api/v1/media:
 *   delete:
 *     summary: Delete a file or folder
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         description: Path to the file or folder to delete
 *     responses:
 *       200:
 *         description: Deleted successfully
 *       404:
 *         description: Not found
 */
router.delete("/", deleteMedia);

/**
 * @swagger
 * /api/v1/media/rename:
 *   put:
 *     summary: Rename a file or folder
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPath
 *               - newName
 *             properties:
 *               oldPath:
 *                 type: string
 *                 description: Current path to the file or folder
 *               newName:
 *                 type: string
 *                 description: New name (not full path, just name)
 *     responses:
 *       200:
 *         description: Renamed successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Not found
 */
router.put("/rename", renameMedia);

router.put("/move", moveMedia);

router.post("/copy", copyMedia);

/**
 * @swagger
 * /api/v1/media/upload:
 *   post:
 *     summary: Upload a file
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: path
 *         schema:
 *           type: string
 *         description: Target folder path
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *       400:
 *         description: Bad request
 */
router.post("/upload", upload, (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: "No file uploaded" });
  }
  
  // Return the path relative to uploads dir
  const filename = req.file.filename;
  const folderPath = req.query.path as string || "";
  const relativePath = folderPath ? `${folderPath}/${filename}`.replace(/^\//, '') : filename;
  
  res.status(201).json({ 
    success: true, 
    message: "File uploaded successfully",
    file: {
      name: filename,
      url: toPublicMediaUrl(`/uploads/${relativePath}`),
      path: relativePath
    }
  });
});

export default router;
