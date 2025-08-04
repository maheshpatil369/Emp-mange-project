import { Router } from "express";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getMe,
  updateUserPermissions,
} from "../controllers/user.controller";
import { isAuthenticated, isAdmin } from "../middleware/auth.middleware";

const router = Router();

// GET /api/users
// Gets a list of all users.
router.get("/", isAuthenticated, isAdmin, getAllUsers);
router.get("/me", isAuthenticated, isAdmin, getMe);

// POST /api/users
// Creates a new user.
router.post("/", isAuthenticated, isAdmin, createUser);

// Update a user.
router.put("/:id", isAuthenticated, isAdmin, updateUser);
router.put('/:userId/permissions', isAdmin, updateUserPermissions);

// Delete a user.
router.delete("/:id", isAuthenticated, isAdmin, deleteUser);

export default router;
