import { Router } from 'express';
import { getAllUsers, createUser } from '../controllers/user.controller';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware';

const router = Router();


// GET /api/users
// Gets a list of all users.
router.get('/', isAuthenticated, isAdmin, getAllUsers);

// POST /api/users
// Creates a new user.
router.post('/', isAuthenticated, isAdmin, createUser);

export default router;