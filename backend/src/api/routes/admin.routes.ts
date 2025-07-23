import { Router } from "express";
import {
  exportProcessedData,
  forceCompleteBundle,
  getAnalyticsPageData,
  getBundleCountersStatus,
  getDashboardSummary,
  manualAssignBundle,
  resetAllCounters,
  resetAllProcessedData,
  resetUserProgress,
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
  exportProcessedData
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

export default router;
