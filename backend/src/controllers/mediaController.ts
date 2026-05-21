import { Request, Response } from "express";
import fs from "fs/promises";
import path from "path";
import multer from "multer";

const UPLOADS_DIR = path.join(__dirname, "../../public/uploads");

// Ensure base upload directory exists
const ensureBaseDir = async () => {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create uploads directory:", error);
  }
};
ensureBaseDir();

// Helper to resolve and validate paths (prevents directory traversal)
const getSafePath = (subPath: string) => {
  const safeSubPath = subPath ? path.normalize(subPath).replace(/^(\.\.(\/|\\|$))+/, '') : '';
  const fullPath = path.join(UPLOADS_DIR, safeSubPath);
  
  if (!fullPath.startsWith(UPLOADS_DIR)) {
    throw new Error("Invalid path");
  }
  
  return { fullPath, relativePath: safeSubPath };
};

export const listMedia = async (req: Request, res: Response) => {
  try {
    const { folder = "" } = req.query;
    const { fullPath } = getSafePath(folder as string);

    try {
      const stats = await fs.stat(fullPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ success: false, message: "Path is not a directory" });
      }
    } catch (e) {
      return res.status(404).json({ success: false, message: "Folder not found" });
    }

    const items = await fs.readdir(fullPath, { withFileTypes: true });
    
    const filesAndFolders = await Promise.all(items.map(async (item) => {
      const itemPath = path.join(fullPath, item.name);
      const stat = await fs.stat(itemPath);
      
      const isFolder = item.isDirectory();
      const relativeUrl = path.posix.join((folder as string), item.name).replace(/\\/g, '/');
      
      return {
        name: item.name,
        isFolder,
        size: stat.size,
        createdAt: stat.birthtime,
        updatedAt: stat.mtime,
        url: isFolder ? null : `/uploads/${relativeUrl.startsWith('/') ? relativeUrl.substring(1) : relativeUrl}`,
        path: relativeUrl
      };
    }));

    // Sort: Folders first, then alphabetically
    filesAndFolders.sort((a, b) => {
      if (a.isFolder === b.isFolder) {
        return a.name.localeCompare(b.name);
      }
      return a.isFolder ? -1 : 1;
    });

    res.status(200).json({ success: true, data: filesAndFolders });
  } catch (error) {
    console.error("Error listing media:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const createFolder = async (req: Request, res: Response) => {
  try {
    const { path: folderPath, name } = req.body;
    
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, message: "Folder name is required" });
    }

    const targetSubPath = path.join(folderPath || "", name);
    const { fullPath } = getSafePath(targetSubPath);

    await fs.mkdir(fullPath, { recursive: true });
    
    res.status(201).json({ success: true, message: "Folder created successfully" });
  } catch (error: any) {
    console.error("Error creating folder:", error);
    if (error.code === 'EEXIST') {
      return res.status(400).json({ success: false, message: "Folder already exists" });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deleteMedia = async (req: Request, res: Response) => {
  try {
    const { path: targetPath } = req.query;
    
    if (!targetPath) {
      return res.status(400).json({ success: false, message: "Path is required" });
    }

    const { fullPath } = getSafePath(targetPath as string);

    // Prevent deleting the root directory
    if (fullPath === UPLOADS_DIR) {
      return res.status(403).json({ success: false, message: "Cannot delete root directory" });
    }

    const stat = await fs.stat(fullPath);
    
    if (stat.isDirectory()) {
      await fs.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.unlink(fullPath);
    }

    res.status(200).json({ success: true, message: "Deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting media:", error);
    if (error.code === 'ENOENT') {
      return res.status(404).json({ success: false, message: "File/Folder not found" });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const renameMedia = async (req: Request, res: Response) => {
  try {
    const { oldPath, newName } = req.body;
    
    if (!oldPath || !newName) {
      return res.status(400).json({ success: false, message: "oldPath and newName are required" });
    }

    const { fullPath: oldFullPath, relativePath: oldRelativePath } = getSafePath(oldPath);
    
    // Prevent renaming the root directory
    if (oldFullPath === UPLOADS_DIR) {
      return res.status(403).json({ success: false, message: "Cannot rename root directory" });
    }

    // Determine the parent directory of the item being renamed
    const parentDir = path.dirname(oldFullPath);
    
    // Sanitize new name (prevent directory traversal via new name)
    const sanitizedNewName = path.basename(newName);
    if (!sanitizedNewName) {
      return res.status(400).json({ success: false, message: "Invalid new name" });
    }

    const newFullPath = path.join(parentDir, sanitizedNewName);

    // Make sure new path is still inside UPLOADS_DIR
    if (!newFullPath.startsWith(UPLOADS_DIR)) {
      return res.status(403).json({ success: false, message: "Invalid path" });
    }

    await fs.rename(oldFullPath, newFullPath);

    res.status(200).json({ success: true, message: "Renamed successfully" });
  } catch (error: any) {
    console.error("Error renaming media:", error);
    if (error.code === 'ENOENT') {
      return res.status(404).json({ success: false, message: "File/Folder not found" });
    }
    if (error.code === 'EEXIST') {
      return res.status(400).json({ success: false, message: "Destination already exists" });
    }
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// Multer storage setup
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const folderPath = req.query.path as string || "";
      const { fullPath } = getSafePath(folderPath);
      await fs.mkdir(fullPath, { recursive: true });
      cb(null, fullPath);
    } catch (error: any) {
      cb(error, "");
    }
  },
  filename: (req, file, cb) => {
    // Generate unique filename to avoid overwrites, or just keep original name if we want
    // We'll keep original name but append timestamp if it exists, actually let's just use original name
    // and if it exists we might overwrite or we can add timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

export const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
}).single("file");
