// This file contains the security middleware for our application.
// It is responsible for verifying user authentication and authorization.

import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";

/**
 * Middleware to verify a Firebase ID token sent in the Authorization header.
 * If the token is valid, it decodes it and attaches the user's UID to the
 * request object as `req.user` for use in subsequent middleware or controllers.
 *
 */

export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {

  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Unauthorized: No token provided or invalid format." });
  }

  const idToken = authHeader.split("Bearer ")[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken as string);

    req.user = {
      uid: decodedToken.uid,
    };

    return next();
  } catch (error) {
    console.error("Error verifying Firebase ID token:", error);
    return res
      .status(403)
      .json({ message: "Forbidden: Invalid or expired token." });
  }
};




/**
 * Middleware to check if the authenticated user is the designated Admin.
 * This middleware MUST be used *after* the `isAuthenticated` middleware.
 *
 * @param req - The Express request object, expected to have `req.user` attached.
 */

export const isAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {

  // Check for the ADMIN_UID in environment variables.
  // If it's not set, this is a server configuration error.
  if (!process.env.ADMIN_UID) {
    console.error("FATAL: ADMIN_UID is not defined in environment variables.");
    return res
      .status(500)
      .json({ message: "Internal Server Error: Server configuration issue." });
  }

  if (!req.user || !req.user.uid) {
    return res
      .status(403)
      .json({ message: "Forbidden: Authentication information is missing." });
  }

  // Compare the authenticated user's UID with the ADMIN_UID.
  if (req.user.uid === process.env.ADMIN_UID) {
    return next();
  } else {
    return res
      .status(403)
      .json({ message: "Forbidden: Admin access required." });
  }
};
