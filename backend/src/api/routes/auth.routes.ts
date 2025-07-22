
import { Router } from 'express';
import { reauthenticate } from '../controllers/auth.controller';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware';

const router = Router();

// POST /api/auth/login
// This endpoint is protected to ensure only a logged-in admin can even attempt
// to re-authenticate for a danger zone action.
router.post('/login', isAuthenticated, isAdmin, reauthenticate);

export default router;