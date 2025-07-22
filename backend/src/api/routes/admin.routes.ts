import { Router } from 'express';
import { exportProcessedData, forceCompleteBundle, getBundleCountersStatus, manualAssignBundle, resetUserProgress } from '../controllers/admin.controller';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware';

const router = Router();


// GET /api/admin/analytics/bundle-counters
// This route is protected and can only be accessed by an admin.
router.get('/analytics/bundle-counters', isAuthenticated, isAdmin, getBundleCountersStatus);

// GET /api/admin/export/processed/:location
router.get('/export/processed/:location', isAuthenticated, isAdmin, exportProcessedData);

// POST /api/admin/reset-progress
router.post('/reset-progress', isAuthenticated, isAdmin, resetUserProgress);

// POST /api/admin/force-complete
router.post('/force-complete', isAuthenticated, isAdmin, forceCompleteBundle);

// POST /api/admin/manual-assign
router.post('/manual-assign', isAuthenticated, isAdmin, manualAssignBundle);




export default router;