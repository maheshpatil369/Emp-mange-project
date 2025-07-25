import admin from "firebase-admin";
import { getAuth } from "firebase/auth";
import { initializeApp } from "firebase/app";
import dotenv from "dotenv"

dotenv.config();


/**
 * Initializes the Firebase Admin application.
 * Checks if the app is already initialized to prevent errors.
 */
export function initializeAdminApp() {
  // Prevent re-initialization
  if (admin.apps.length > 0) {
    console.log("Firebase Admin SDK already initialized.");
    return;
  }

  try {
    // Ensure the service account JSON is present
    if (!process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set in .env file.");
    }

    // Parse the service account credentials from the environment variable
    const serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON
    );

    // Initialize the Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });

    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("Failed to initialize Firebase Admin SDK:", error.message);
    // Exit the process if Firebase initialization fails, as the app cannot run without it.
    process.exit(1);
  }
}

const firebaseConfig = {
  apiKey: process.env.FIREBASE_WEB_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

