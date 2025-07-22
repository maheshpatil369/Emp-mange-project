// defines all endpoints related to core data operations like uploading files and assigning work.

import { Router } from "express";
import multer from "multer";
import { assignBundle, uploadFile } from "../controllers/data.controller";
import { isAuthenticated, isAdmin } from "../middleware/auth.middleware";

// Configure Multer to handle file uploads in memory.
// We don't need to save the file to disk, just process it.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const router = Router();

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
router.post('/bundles/assign', isAuthenticated, assignBundle);


export default router;
