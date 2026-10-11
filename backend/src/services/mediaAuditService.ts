import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { prisma } from "../config/db";
import { toPublicMediaUrl } from "../utils/mediaUrl";

const UPLOADS_DIR = path.join(__dirname, "../../public/uploads");

export interface MediaUsageRef {
  model: string;
  label: string;
  field: string;
  id?: string;
}

export interface AuditedMediaFile {
  name: string;
  path: string; // relative to UPLOADS_DIR, posix slash
  url: string;
  size: number;
  hash: string;
  createdAt: Date;
  updatedAt: Date;
  isUnused: boolean;
  isDuplicate: boolean;
  duplicateGroupHash?: string;
  duplicateCount?: number;
  isMaster?: boolean;
  usages: MediaUsageRef[];
}

export interface DuplicateGroup {
  hash: string;
  size: number;
  wastedBytes: number; // size * (files.length - 1)
  masterFile: AuditedMediaFile;
  duplicateFiles: AuditedMediaFile[];
  allFiles: AuditedMediaFile[];
}

export interface MediaAuditReport {
  summary: {
    totalFiles: number;
    totalSizeBytes: number;
    totalSizeMb: number;
    unusedFilesCount: number;
    unusedSizeBytes: number;
    unusedSizeMb: number;
    duplicateGroupsCount: number;
    duplicateFilesCount: number;
    duplicateWastedBytes: number;
    duplicateWastedMb: number;
  };
  unusedFiles: AuditedMediaFile[];
  duplicateGroups: DuplicateGroup[];
  fileStatusMap: Record<
    string,
    {
      isUnused: boolean;
      isDuplicate: boolean;
      duplicateCount: number;
      usagesCount: number;
      usages: MediaUsageRef[];
    }
  >;
}

// Helper: Normalize file path inside uploads
const normalizeMediaKey = (rawPathOrUrl: string): string => {
  if (!rawPathOrUrl || typeof rawPathOrUrl !== "string") return "";
  let clean = rawPathOrUrl.trim().replace(/\\/g, "/");

  // Remove domain/protocol if present
  clean = clean.replace(/^https?:\/\/[^/]+/i, "");

  // Remove leading /uploads/ or uploads/
  clean = clean.replace(/^\/?uploads\//i, "");

  // Strip leading slash
  clean = clean.replace(/^\/+/, "");

  return clean;
};

// Recursive helper to list all file paths in a directory
const getAllUploadFiles = async (dir: string): Promise<string[]> => {
  const results: string[] = [];
  try {
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const item of list) {
      const full = path.join(dir, item.name);
      if (item.isDirectory()) {
        results.push(...(await getAllUploadFiles(full)));
      } else if (item.isFile()) {
        results.push(full);
      }
    }
  } catch (err) {
    console.error("Error reading directory for media audit:", dir, err);
  }
  return results;
};

// Compute MD5 hash of file
const getFileHash = async (filePath: string): Promise<string> => {
  const content = await fs.readFile(filePath);
  return crypto.createHash("md5").update(content).digest("hex");
};

/**
 * Scan database to collect all active media references across all models
 */
export const collectDatabaseMediaReferences = async (): Promise<{
  directMap: Map<string, MediaUsageRef[]>; // key = normalized filename/path -> usages
  contentCorpus: Array<{ text: string; ref: MediaUsageRef }>; // For regex/substring matching in HTML/JSON
}> => {
  const directMap = new Map<string, MediaUsageRef[]>();
  const contentCorpus: Array<{ text: string; ref: MediaUsageRef }> = [];

  const addDirect = (key: string | null | undefined, ref: MediaUsageRef) => {
    if (!key) return;
    const normalized = normalizeMediaKey(key);
    if (!normalized) return;

    // Register normalized path
    const list = directMap.get(normalized) || [];
    list.push(ref);
    directMap.set(normalized, list);

    // Also register basename if different (in case stored without subfolder)
    const base = path.posix.basename(normalized);
    if (base && base !== normalized) {
      const baseList = directMap.get(base) || [];
      baseList.push(ref);
      directMap.set(base, baseList);
    }
  };

  const addContent = (text: string | null | undefined, ref: MediaUsageRef) => {
    if (!text || typeof text !== "string") return;
    if (text.includes("uploads") || text.includes(".webp") || text.includes(".png") || text.includes(".jpg") || text.includes(".jpeg")) {
      contentCorpus.push({ text, ref });
    }
  };

  try {
    // 1. Products
    const products = await prisma.product.findMany({
      select: { id: true, name: true, image: true, images: true, description: true },
    });
    for (const p of products) {
      if (p.image) {
        addDirect(p.image, { model: "Product", field: "Main Image", label: p.name, id: p.id });
      }
      if (Array.isArray(p.images)) {
        for (const img of p.images) {
          addDirect(img, { model: "Product", field: "Gallery Image", label: p.name, id: p.id });
        }
      }
      if (p.description) {
        addContent(p.description, { model: "Product", field: "Description Text", label: p.name, id: p.id });
      }
    }

    // 2. Categories
    const categories = await prisma.category.findMany({
      select: { id: true, name: true, image: true },
    });
    for (const c of categories) {
      if (c.image) {
        addDirect(c.image, { model: "Category", field: "Image", label: c.name, id: c.id });
      }
    }

    // 3. Brands
    const brands = await prisma.brand.findMany({
      select: { id: true, name: true, logo: true },
    });
    for (const b of brands) {
      if (b.logo) {
        addDirect(b.logo, { model: "Brand", field: "Logo", label: b.name, id: b.id });
      }
    }

    // 4. Series
    const series = await prisma.series.findMany({
      select: { id: true, name: true, logo: true },
    });
    for (const s of series) {
      if (s.logo) {
        addDirect(s.logo, { model: "Series", field: "Logo", label: s.name, id: s.id });
      }
    }

    // 5. Reviews
    const reviews = await prisma.review.findMany({
      select: { id: true, title: true, images: true },
    });
    for (const r of reviews) {
      if (Array.isArray(r.images)) {
        for (const img of r.images) {
          addDirect(img, { model: "Review", field: "Review Photos", label: r.title || "Customer Review", id: r.id });
        }
      }
    }

    // 6. Users
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, avatar: true },
    });
    for (const u of users) {
      if (u.avatar) {
        addDirect(u.avatar, { model: "User", field: "Avatar", label: u.name || u.email, id: u.id });
      }
    }

    // 7. Blogs
    const blogs = await prisma.blog.findMany({
      select: { id: true, title: true, cover: true, body: true },
    });
    for (const b of blogs) {
      if (b.cover) {
        addDirect(b.cover, { model: "Blog", field: "Cover Image", label: b.title, id: b.id });
      }
      if (b.body) {
        addContent(b.body, { model: "Blog", field: "Article Content", label: b.title, id: b.id });
      }
    }

    // 8. CMS Pages
    const cmsPages = await prisma.cmsPage.findMany({
      select: { id: true, title: true, seoImage: true, body: true },
    });
    for (const page of cmsPages) {
      if (page.seoImage) {
        addDirect(page.seoImage, { model: "CmsPage", field: "SEO Image", label: page.title, id: page.id });
      }
      if (page.body) {
        addContent(page.body, { model: "CmsPage", field: "Page Body", label: page.title, id: page.id });
      }
    }

    // 9. CMS Config
    const cmsConfigs = await prisma.cmsConfig.findMany({
      select: { key: true, value: true },
    });
    for (const cfg of cmsConfigs) {
      const jsonStr = JSON.stringify(cfg.value || {});
      addContent(jsonStr, { model: "CmsConfig", field: `Config (${cfg.key})`, label: cfg.key });
    }

    // 10. Mega Menu
    const megaMenus = await prisma.megaMenu.findMany({
      select: { id: true, menu: true, sections: true },
    });
    for (const mm of megaMenus) {
      const jsonStr = JSON.stringify(mm.sections || []);
      addContent(jsonStr, { model: "MegaMenu", field: "Menu Sections", label: mm.menu, id: mm.id });
    }

    // 11. Order Items (Archived product images in past orders)
    const orderItems = await prisma.orderItem.findMany({
      select: { id: true, productName: true, productImage: true },
    });
    for (const item of orderItems) {
      if (item.productImage) {
        addDirect(item.productImage, { model: "OrderItem", field: "Order Item Image", label: item.productName, id: item.id });
      }
    }

    // 12. Return Requests
    const returnRequests = await prisma.returnRequest.findMany({
      select: { id: true, photos: true },
    });
    for (const rr of returnRequests) {
      const jsonStr = JSON.stringify(rr.photos || []);
      addContent(jsonStr, { model: "ReturnRequest", field: "Customer Return Photos", label: `Return #${rr.id}`, id: rr.id });
    }
  } catch (err) {
    console.error("Error gathering media database references:", err);
  }

  return { directMap, contentCorpus };
};

/**
 * Audit all media files in storage
 */
export const auditMediaStorage = async (): Promise<MediaAuditReport> => {
  const allFilePaths = await getAllUploadFiles(UPLOADS_DIR);
  const { directMap, contentCorpus } = await collectDatabaseMediaReferences();

  const fileMapByHash: Record<string, AuditedMediaFile[]> = {};
  const allAuditedFiles: AuditedMediaFile[] = [];

  for (const filePath of allFilePaths) {
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;

      const relPath = path.relative(UPLOADS_DIR, filePath).replace(/\\/g, "/");
      const basename = path.posix.basename(relPath);
      const hash = await getFileHash(filePath);

      // Check direct map matches
      const usagesMap = new Map<string, MediaUsageRef>();

      const checkAndAdd = (key: string) => {
        const matches = directMap.get(key);
        if (matches) {
          for (const m of matches) {
            const uniqueKey = `${m.model}:${m.field}:${m.id || m.label}`;
            usagesMap.set(uniqueKey, m);
          }
        }
      };

      checkAndAdd(relPath);
      checkAndAdd(basename);

      // Check text content corpus (for blog HTML, cms config json, description etc.)
      for (const { text, ref } of contentCorpus) {
        if (text.includes(relPath) || text.includes(basename)) {
          const uniqueKey = `${ref.model}:${ref.field}:${ref.id || ref.label}`;
          usagesMap.set(uniqueKey, ref);
        }
      }

      const usages = Array.from(usagesMap.values());
      const isUnused = usages.length === 0;
      const url = toPublicMediaUrl(`/uploads/${relPath}`) || `/uploads/${relPath}`;

      const auditedItem: AuditedMediaFile = {
        name: basename,
        path: relPath,
        url,
        size: stat.size,
        hash,
        createdAt: stat.birthtime,
        updatedAt: stat.mtime,
        isUnused,
        isDuplicate: false,
        usages,
      };

      allAuditedFiles.push(auditedItem);

      if (!fileMapByHash[hash]) {
        fileMapByHash[hash] = [];
      }
      fileMapByHash[hash].push(auditedItem);
    } catch (err) {
      console.error(`Error auditing file ${filePath}:`, err);
    }
  }

  // Identify duplicates and assign master vs duplicate
  const duplicateGroups: DuplicateGroup[] = [];
  let duplicateFilesCount = 0;
  let duplicateWastedBytes = 0;

  for (const [hash, group] of Object.entries(fileMapByHash)) {
    if (group.length > 1) {
      // Sort: items that ARE used in DB come first; if tied, oldest file (earliest mtime) comes first
      group.sort((a, b) => {
        if (!a.isUnused && b.isUnused) return -1;
        if (a.isUnused && !b.isUnused) return 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      const master = group[0];
      master.isMaster = true;
      master.isDuplicate = true;
      master.duplicateGroupHash = hash;
      master.duplicateCount = group.length;

      const duplicates = group.slice(1);
      for (const d of duplicates) {
        d.isMaster = false;
        d.isDuplicate = true;
        d.duplicateGroupHash = hash;
        d.duplicateCount = group.length;
      }

      const wastedBytes = master.size * duplicates.length;
      duplicateFilesCount += duplicates.length;
      duplicateWastedBytes += wastedBytes;

      duplicateGroups.push({
        hash,
        size: master.size,
        wastedBytes,
        masterFile: master,
        duplicateFiles: duplicates,
        allFiles: group,
      });
    }
  }

  // Sort duplicate groups by wasted bytes descending
  duplicateGroups.sort((a, b) => b.wastedBytes - a.wastedBytes);

  // Unused files list
  const unusedFiles = allAuditedFiles.filter((f) => f.isUnused);
  const totalSizeBytes = allAuditedFiles.reduce((acc, f) => acc + f.size, 0);
  const unusedSizeBytes = unusedFiles.reduce((acc, f) => acc + f.size, 0);

  // Status map for fast client lookup by path
  const fileStatusMap: Record<
    string,
    {
      isUnused: boolean;
      isDuplicate: boolean;
      duplicateCount: number;
      usagesCount: number;
      usages: MediaUsageRef[];
    }
  > = {};

  for (const f of allAuditedFiles) {
    fileStatusMap[f.path] = {
      isUnused: f.isUnused,
      isDuplicate: f.isDuplicate,
      duplicateCount: f.duplicateCount || 1,
      usagesCount: f.usages.length,
      usages: f.usages,
    };
  }

  return {
    summary: {
      totalFiles: allAuditedFiles.length,
      totalSizeBytes,
      totalSizeMb: Number((totalSizeBytes / (1024 * 1024)).toFixed(2)),
      unusedFilesCount: unusedFiles.length,
      unusedSizeBytes,
      unusedSizeMb: Number((unusedSizeBytes / (1024 * 1024)).toFixed(2)),
      duplicateGroupsCount: duplicateGroups.length,
      duplicateFilesCount,
      duplicateWastedBytes,
      duplicateWastedMb: Number((duplicateWastedBytes / (1024 * 1024)).toFixed(2)),
    },
    unusedFiles,
    duplicateGroups,
    fileStatusMap,
  };
};

/**
 * Safely delete unused media files after double-checking DB references
 */
export const deleteUnusedMediaFiles = async (
  pathsToDelete?: string[],
  deleteAllUnused?: boolean
): Promise<{
  deletedCount: number;
  skippedCount: number;
  bytesSaved: number;
  mbSaved: number;
  deletedPaths: string[];
  skippedPaths: string[];
}> => {
  // Re-run audit to ensure freshness and prevent deleting any file that recently became referenced
  const report = await auditMediaStorage();
  const unusedSet = new Map<string, AuditedMediaFile>();
  for (const f of report.unusedFiles) {
    unusedSet.set(f.path, f);
  }

  let candidates: string[] = [];
  if (deleteAllUnused) {
    candidates = report.unusedFiles.map((f) => f.path);
  } else if (Array.isArray(pathsToDelete) && pathsToDelete.length > 0) {
    candidates = pathsToDelete.map((p) => p.replace(/\\/g, "/").replace(/^\/+/, ""));
  }

  let deletedCount = 0;
  let skippedCount = 0;
  let bytesSaved = 0;
  const deletedPaths: string[] = [];
  const skippedPaths: string[] = [];

  for (const relPath of candidates) {
    const unusedItem = unusedSet.get(relPath);
    if (!unusedItem) {
      // Not verified as unused! Skip for safety.
      skippedCount++;
      skippedPaths.push(relPath);
      continue;
    }

    const fullPath = path.join(UPLOADS_DIR, relPath);
    if (!fullPath.startsWith(UPLOADS_DIR) || fullPath === UPLOADS_DIR) {
      skippedCount++;
      skippedPaths.push(relPath);
      continue;
    }

    try {
      await fs.unlink(fullPath);
      deletedCount++;
      bytesSaved += unusedItem.size;
      deletedPaths.push(relPath);
    } catch (err) {
      console.error(`Failed to delete unused file ${fullPath}:`, err);
      skippedCount++;
      skippedPaths.push(relPath);
    }
  }

  return {
    deletedCount,
    skippedCount,
    bytesSaved,
    mbSaved: Number((bytesSaved / (1024 * 1024)).toFixed(2)),
    deletedPaths,
    skippedPaths,
  };
};

/**
 * Deduplicate media files: re-point database references to master file and delete duplicates
 */
export const deduplicateMediaFiles = async (
  targetHash?: string
): Promise<{
  duplicatesRemoved: number;
  bytesSaved: number;
  mbSaved: number;
  dbReferencesUpdated: number;
  details: Array<{
    hash: string;
    master: string;
    deletedDuplicates: string[];
  }>;
}> => {
  const report = await auditMediaStorage();
  let groupsToProcess = report.duplicateGroups;

  if (targetHash) {
    groupsToProcess = groupsToProcess.filter((g) => g.hash === targetHash);
  }

  let duplicatesRemoved = 0;
  let bytesSaved = 0;
  let dbReferencesUpdated = 0;
  const details: Array<{ hash: string; master: string; deletedDuplicates: string[] }> = [];

  for (const group of groupsToProcess) {
    const master = group.masterFile;
    const masterRelPath = master.path;
    const deletedInThisGroup: string[] = [];

    for (const dup of group.duplicateFiles) {
      const dupBasename = dup.name;
      const dupRelPath = dup.path;

      // Compile URL variants that might be stored in the database
      const dupVariants = [
        `/uploads/${dupRelPath}`,
        `uploads/${dupRelPath}`,
        `/uploads/${dupBasename}`,
        `uploads/${dupBasename}`,
        dup.url,
      ].filter((v): v is string => typeof v === "string" && v.length > 0);

      // Corresponding master values
      const getMasterVal = (dupVal: string): string => {
        if (dupVal.startsWith("http://") || dupVal.startsWith("https://")) {
          return master.url;
        }
        if (dupVal.startsWith("uploads/")) {
          return `uploads/${masterRelPath}`;
        }
        return `/uploads/${masterRelPath}`;
      };

      // Update database references for each variation
      for (const v of dupVariants) {
        const masterVal = getMasterVal(v);
        if (v === masterVal) continue;

        // 1. Category
        const catUpdates = await prisma.category.updateMany({
          where: { image: v },
          data: { image: masterVal },
        });
        dbReferencesUpdated += catUpdates.count;

        // 2. Brand
        const brandUpdates = await prisma.brand.updateMany({
          where: { logo: v },
          data: { logo: masterVal },
        });
        dbReferencesUpdated += brandUpdates.count;

        // 3. Series
        const seriesUpdates = await prisma.series.updateMany({
          where: { logo: v },
          data: { logo: masterVal },
        });
        dbReferencesUpdated += seriesUpdates.count;

        // 4. Product image
        const prodUpdates = await prisma.product.updateMany({
          where: { image: v },
          data: { image: masterVal },
        });
        dbReferencesUpdated += prodUpdates.count;

        // 5. Product images array
        const prodsWithArray = await prisma.product.findMany({
          where: { images: { has: v } },
          select: { id: true, images: true },
        });
        for (const p of prodsWithArray) {
          const updated = p.images.map((img) => (img === v ? masterVal : img));
          await prisma.product.update({
            where: { id: p.id },
            data: { images: updated },
          });
          dbReferencesUpdated++;
        }

        // 6. Blog cover
        const blogUpdates = await prisma.blog.updateMany({
          where: { cover: v },
          data: { cover: masterVal },
        });
        dbReferencesUpdated += blogUpdates.count;

        // 7. CmsPage seoImage
        const cmsUpdates = await prisma.cmsPage.updateMany({
          where: { seoImage: v },
          data: { seoImage: masterVal },
        });
        dbReferencesUpdated += cmsUpdates.count;

        // 8. User avatar
        const userUpdates = await prisma.user.updateMany({
          where: { avatar: v },
          data: { avatar: masterVal },
        });
        dbReferencesUpdated += userUpdates.count;

        // 9. Review images array
        const revsWithArray = await prisma.review.findMany({
          where: { images: { has: v } },
          select: { id: true, images: true },
        });
        for (const r of revsWithArray) {
          const updated = r.images.map((img) => (img === v ? masterVal : img));
          await prisma.review.update({
            where: { id: r.id },
            data: { images: updated },
          });
          dbReferencesUpdated++;
        }

        // 10. Order items
        const orderItemUpdates = await prisma.orderItem.updateMany({
          where: { productImage: v },
          data: { productImage: masterVal },
        });
        dbReferencesUpdated += orderItemUpdates.count;
      }

      // Delete the duplicate file from disk
      const dupFullPath = path.join(UPLOADS_DIR, dupRelPath);
      try {
        await fs.unlink(dupFullPath);
        duplicatesRemoved++;
        bytesSaved += dup.size;
        deletedInThisGroup.push(dupRelPath);
      } catch (err) {
        console.error(`Failed to delete duplicate file ${dupFullPath}:`, err);
      }
    }

    details.push({
      hash: group.hash,
      master: masterRelPath,
      deletedDuplicates: deletedInThisGroup,
    });
  }

  return {
    duplicatesRemoved,
    bytesSaved,
    mbSaved: Number((bytesSaved / (1024 * 1024)).toFixed(2)),
    dbReferencesUpdated,
    details,
  };
};
