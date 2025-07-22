// File: scripts/generate-token.ts
//
// This script generates a Firebase ID token for a specific user UID.
// It's a utility for backend testing when you don't have a frontend login flow.

import dotenv from "dotenv";
import admin from "firebase-admin";
import { initializeAdminApp } from "./config/firebase.config";

// Load environment variables from the .env file
dotenv.config();

/**
 * Generates a Firebase ID token for the Admin user.
 */
export default async function generateAdminToken() {
  console.log("Initializing Firebase Admin SDK...");
  initializeAdminApp();

  const adminUid = process.env.ADMIN_UID;

  if (!adminUid) {
    console.error("Error: ADMIN_UID is not defined in your .env file.");
    process.exit(1);
  }

  console.log(`Generating token for Admin UID: ${adminUid}`);

  try {
    // 1. Create a custom token for the Admin UID.
    // This token proves the user's identity but is not the final ID token.
    const customToken = await admin.auth().createCustomToken(adminUid);

    // 2. Exchange the custom token for a standard Firebase ID token.
    // This requires making an HTTP request to Google's identity toolkit API.
    // We need the Web API Key from your Firebase project for this step.
    // You can find it in Firebase Console -> Project Settings -> General -> Web API Key.
    const apiKey = process.env.FIREBASE_WEB_API_KEY; // You will need to add this to your .env file!

    if (!apiKey) {
      console.error(
        "Error: FIREBASE_WEB_API_KEY is not defined in your .env file."
      );
      console.log(
        "Please find it in your Firebase project settings and add it."
      );
      process.exit(1);
    }

    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token: customToken,
          returnSecureToken: true,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(`Failed to exchange custom token: ${data.error.message}`);
    }

    const idToken = data.idToken;

    console.log("\n✅ Successfully generated ID Token!");
    console.log(
      "\nCopy this token and use it as the Bearer token in your API client (Postman, etc.):\n"
    );
    console.log(idToken); // Print the final, usable token

    return idToken;
    process.exit(0);
  } catch (error) {
    console.error("Error generating token:", error);
    process.exit(1);
  }
}

