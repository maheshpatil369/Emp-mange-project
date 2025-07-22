import { Router } from 'express';
import { getBundleCountersStatus } from '../controllers/admin.controller';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware';

const router = Router();


// GET /api/admin/analytics/bundle-counters
// This route is protected and can only be accessed by an admin.
router.get('/analytics/bundle-counters', isAuthenticated, isAdmin, getBundleCountersStatus);


export default router;