// This is a utility script to populate the database with initial
// configuration data, such as locations and their talukas.
// This should be run once during the initial setup of the database.

import dotenv from "dotenv";
import admin from "firebase-admin";
import { initializeAdminApp } from "../src/config/firebase.config";

// Load environment variables from the .env file
dotenv.config();

// --- Configuration Data ---
// This data is based on the original frontend files (locations.ts, talukas.ts)
const configData = {
  locations: [
    { name: "Ahilyanagar", slug: "ahilyanagar" },
    { name: "Chhatrapati Sambhajinagar", slug: "chhatrapati-sambhajinagar" },
    { name: "Palghar", slug: "palghar" },
  ],
  talukas: [
    {
      locationSlug: "ahilyanagar",
      talukas: [
        "Jamkhed",
        "Kopargaon",
        "Rahata",
        "Rahuri",
        "Nagar",
        "Pathardi",
        "Karjat",
      ],
    },
    {
      locationSlug: "chhatrapati-sambhajinagar",
      talukas: [
        "Chhatrapati Sambhajinagar",
        "Kannad",
        "Phulambri",
        "Soegaon",
        "Sillod",
        "Paithan",
      ],
    },
    {
      locationSlug: "palghar",
      talukas: [
        "Palghar",
        "Vada",
        "Dahanu",
        "Talasari",
        "Jawhar",
        "Mokhada",
        "Vikramgad",
        "Vasai",
      ],
    },
  ],
};

/**
 * Main function to run the database seeding process.
 */
async function seedDatabase() {
  console.log("Starting database seeding process...");

  try {
    // 1. Initialize the Firebase Admin App
    initializeAdminApp();
    const db = admin.database();

    // 2. Define the path where the configuration will be stored.
    const configRef = db.ref("config");

    // 3. Write the data to the database.
    // Using `set` will overwrite any existing data at this path.
    await configRef.set(configData);

    console.log(
      "\n✅ Success! Database has been seeded with the following configuration:"
    );
    console.log(JSON.stringify(configData, null, 2));

    // Exit the script successfully
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error during database seeding:", error);
    // Exit the script with an error code
    process.exit(1);
  }
}

// Run the seeding function
seedDatabase();
