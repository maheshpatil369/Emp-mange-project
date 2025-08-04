import { Request, Response } from "express";
import * as firebaseService from "../../services/firebase.service";
import { User } from "../../types";

/**
 * Controller to get all users.
 * This is an admin-only operation.
 */
export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const users = await firebaseService.getAllUsersFromDB();
    return res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching all users:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

/**
 * Controller to create a new user.
 * This is an admin-only operation.
 */
export const createUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const userData: Omit<User, "id"> = req.body;
    // Add password to the validation check
    if (
      !userData.username ||
      !userData.name ||
      !userData.mobile ||
      !userData.location ||
      !userData.role ||
      !userData.password
    ) {
      return res.status(400).json({
        message:
          "Bad Request: Missing required user fields, including password.",
      });
    }
    const newUserRecord = await firebaseService.createUserInDB(userData);
    return res.status(201).json({
      message: "User created successfully.",
      userId: newUserRecord.uid,
    });
  } catch (error: any) {
    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({
        message: `Conflict: A user with username '${req.body.username}' already exists.`,
      });
    }
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Controller to update a user.
export const updateUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    const updates: Partial<User> = req.body;
    await firebaseService.updateUserInDB(id as string, updates);
    return res
      .status(200)
      .json({ message: `User ${id} updated successfully.` });
  } catch (error: any) {
    console.error("Error updating user:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// NEW: Controller to delete a user.
export const deleteUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { id } = req.params;
    await firebaseService.deleteUserInDB(id as string);
    return res
      .status(200)
      .json({ message: `User ${id} deleted successfully.` });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


export const getMe = async (req: Request, res: Response): Promise<Response> => {
  try {
    // The user's ID is attached to the request by the isAuthenticated middleware
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ message: "User not authenticated" });
    }

    const user = await firebaseService.getUserFromDB(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};