import { Router } from "express";
import {
  exportCombinedData,
  exportDuplicateLog,
  forceCompleteBundle,
  getAnalyticsPageData,
  getBundleCountersStatus,
  getDashboardSummary,
  manualAssignBundle,
  markIncompleteAsComplete,
  resetAllCounters,
  resetAllProcessedData,
  resetUserProgress,
  searchRecordById,
} from "../controllers/admin.controller";
import { isAuthenticated, isAdmin } from "../middleware/auth.middleware";

const router = Router();

// This single endpoint provides all data for the analytics page
router.get("/analytics", isAuthenticated, isAdmin, getAnalyticsPageData);

// GET /api/admin/analytics/bundle-counters
// This route is protected and can only be accessed by an admin.
router.get(
  "/analytics/bundle-counters",
  isAuthenticated,
  isAdmin,
  getBundleCountersStatus
);

// GET /api/admin/export/processed/:location
router.get(
  "/export/processed/:location",
  isAuthenticated,
  isAdmin,
  exportCombinedData
);

// Route to export the log of all saved duplicate records for a location
router.get(
  "/export/duplicate-log/:location",
  isAuthenticated,
  isAdmin,
  exportDuplicateLog
);

// POST /api/admin/reset-progress
router.post("/reset-progress", isAuthenticated, isAdmin, resetUserProgress);

// POST /api/admin/force-complete
router.post("/force-complete", isAuthenticated, isAdmin, forceCompleteBundle);

// POST /api/admin/manual-assign
router.post("/manual-assign", isAuthenticated, isAdmin, manualAssignBundle);

// POST /api/admin/danger-zone/reset-all-data
router.post(
  "/danger-zone/reset-all-data",
  isAuthenticated,
  isAdmin,
  resetAllProcessedData
);

// POST /api/admin/danger-zone/reset-all-counters
router.post(
  "/danger-zone/reset-all-counters",
  isAuthenticated,
  isAdmin,
  resetAllCounters
);

// GET /api/admin/analytics/dashboard-summary
router.get(
  "/analytics/dashboard-summary",
  isAuthenticated,
  isAdmin,
  getDashboardSummary
);

// The query will now be like: /api/admin/records/search?searchFromId=12345
router.get("/records/search", isAuthenticated, isAdmin, searchRecordById);

// Mark Incomplete as Complete Route
router.post(
  "/mark-incomplete-complete",
  isAuthenticated,
  isAdmin,
  markIncompleteAsComplete
);

export default router;
