// defines all endpoints related to core data operations like uploading files and assigning work.

import { Router } from "express";
import multer from "multer";
import {
  assignBundle,
  completeBundle,
  getActiveBundles,
  getFileById,
  getFilesByLocation,
  syncRecords,
  uploadFile,
} from "../controllers/data.controller";
import { isAuthenticated, isAdmin } from "../middleware/auth.middleware";

// Configure Multer to handle file uploads in memory.
// We don't need to save the file to disk, just process it.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = Router();

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
router.post("/records/sync", isAuthenticated, syncRecords);

// POST /api/data/bundles/complete (Any authenticated user)
router.post("/bundles/complete", isAuthenticated, completeBundle);

// GET /api/data/files/:location (Admin only)
router.get("/files/:location", isAuthenticated, isAdmin, getFilesByLocation);

// GET /api/data/files/:location/:fileId (Admin only) - Gets a single file
router.get('/files/:location/:fileId', isAuthenticated, isAdmin, getFileById);


export default router;
