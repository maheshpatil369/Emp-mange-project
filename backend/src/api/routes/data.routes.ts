// defines all endpoints related to core data operations like uploading files and assigning work.

import { Router } from "express";
import multer from "multer";
import {
  addTaluka,
  assignBundle,
  completeBundle,
  deleteFile,
  getActiveBundles,
  getAssignedFile,
  getConfig,
  getFileById,
  getFilesByLocation,
  getNextUniqueId,
  searchRecord,
  syncRecords,
  uploadFile,
} from "../controllers/data.controller";
import { isAuthenticated, isAdmin } from "../middleware/auth.middleware";
import { rateLimitOnePerMinute } from "../middleware/rateLimitMiddleware";

// Configure Multer to handle file uploads in memory.
// We don't need to save the file to disk, just process it.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = Router();

// This endpoint is public so the app can fetch it before login if needed.
router.get("/config", getConfig);
// Adds a new taluka to a specific location in the config.
router.post("/config/talukas", isAuthenticated, isAdmin, addTaluka);

// GET /api/data/bundles/active (Any authenticated user)
router.get("/bundles/active", isAuthenticated, getActiveBundles);

// POST /api/data/upload/:location
// This route handles the Excel file upload.
// - It's protected by our auth middleware.
// - It uses `upload.single('file')` which tells Multer to expect a single
//   file in the request body under the field name "file".

router.post(
  "/upload/:location",
  isAuthenticated,
  isAdmin,
  upload.single("file"),
  uploadFile
);

// POST /api/data/bundles/assign (Any authenticated user)
router.post("/bundles/assign", isAuthenticated, assignBundle);

// POST /api/data/records/sync (Any authenticated user)
router.post(
  "/records/sync",
  isAuthenticated,
  rateLimitOnePerMinute,
  syncRecords
);

// POST /api/data/bundles/complete (Any authenticated user)
router.post(
  "/bundles/complete",
  isAuthenticated,
  rateLimitOnePerMinute,
  completeBundle
);

// GET /api/data/files/:location (Admin only)
router.get("/files/:location", isAuthenticated, isAdmin, getFilesByLocation);

// GET /api/data/files/:location/:fileId (Admin only) - Gets a single file
router.get("/files/:location/:fileId", isAuthenticated, isAdmin, getFileById);

// GET /api/data/assigned-file (Authenticated User)
router.get("/assigned-file", isAuthenticated, getAssignedFile);

// GET /api/data/records/search (Authenticated User)
router.get("/records/search", isAuthenticated, searchRecord);

// GET /api/data/records/next-unique-id (Authenticated User)
router.get("/records/next-unique-id", isAuthenticated, getNextUniqueId);

// DELETE /api/data/files/:location/:fileId (Admin only)
router.delete("/files/:location/:fileId", isAuthenticated, isAdmin, deleteFile);

export default router;
