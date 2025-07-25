import { Router } from "express";
import {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../controllers/user.controller";
import { isAuthenticated, isAdmin } from "../middleware/auth.middleware";

const router = Router();

// GET /api/users
// Gets a list of all users.
router.get("/", isAuthenticated, isAdmin, getAllUsers);

// POST /api/users
// Creates a new user.
router.post("/", isAuthenticated, isAdmin, createUser);

// Update a user.
router.put("/:id", isAuthenticated, isAdmin, updateUser);

// Delete a user.
router.delete("/:id", isAuthenticated, isAdmin, deleteUser);

export default router;
