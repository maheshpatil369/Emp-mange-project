
import { Router } from 'express';
import { login, reauthenticate, refreshToken } from '../controllers/auth.controller';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware';

const router = Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/refresh
router.post('/refresh', refreshToken);

// This endpoint is protected to ensure only a logged-in admin can even attempt
// to re-authenticate for a danger zone action.
router.post('/reauthenticate', isAuthenticated, isAdmin, reauthenticate);

export default router;