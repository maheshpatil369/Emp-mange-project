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
    // 1. Get the user data from the request body
    const userData: Omit<User, "id"> = req.body;

    // 2. Basic validation
    if (
      !userData.username ||
      !userData.name ||
      !userData.mobile ||
      !userData.location ||
      !userData.role
    ) {
      return res
        .status(400)
        .json({ message: "Bad Request: Missing required user fields." });
    }

    // 3. Call the service to create the user
    const newUserRecord = await firebaseService.createUserInDB(userData);

    // 4. Send a success response
    return res.status(201).json({
      message: "User created successfully.",
      userId: newUserRecord.uid,
    });
  } catch (error: any) {
    // Handle specific Firebase errors, like a username that already exists
    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({
        message: `Conflict: A user with username '${req.body.username}' already exists.`,
      });
    }
    console.error("Error creating user:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
