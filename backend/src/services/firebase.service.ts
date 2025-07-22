import admin from "firebase-admin";
import { User, ActiveBundle, BundleCounter, ProcessedRecord } from '../types';

/**
 * Fetches all user profiles from the '/users' path in the Realtime Database.
 * @returns A promise that resolves to an array of User objects.
 */

export async function getAllUsersFromDB(): Promise<User[]> {
  const db = admin.database();
  const usersRef = db.ref("users");

  const snapshot = await usersRef.once("value");

  if (!snapshot.exists()) {
    return [];
  }

  const usersData = snapshot.val();

  // The data is an object with user IDs as keys. We convert it to an array.
  const usersArray = Object.keys(usersData).map((key) => ({
    id: key,
    ...usersData[key],
  }));

  return usersArray;
}

export async function createUserInDB(userData: Omit<User, "id">) {
  // Create the user in Firebase Authentication
  const auth = admin.auth();
  const userRecord = await auth.createUser({
    email: `${userData.username}@yourapp.com`, // Firebase Auth requires an email
    password: userData.mobile,
    displayName: userData.name,
    disabled: false,
  });

  // 2. Create the user profile in the Realtime Database
  const db = admin.database();
  const userProfileRef = db.ref(`users/${userRecord.uid}`);

  // We only store the profile data, not the auth data like password
  const profileData = {
    name: userData.name,
    username: userData.username,
    mobile: userData.mobile,
    location: userData.location,
    role: userData.role,
  };

  await userProfileRef.set(profileData);

  return userRecord;
}


/**
 * Saves the parsed content of an uploaded file to the Realtime Database.
 * @param location - The location slug (e.g., "akola").
 * @param fileData - The file metadata and its parsed JSON content.
 * @returns The unique key (ID) of the new file record in Firebase.
 */
export async function saveUploadedFileToDB(
  location: string,
  fileData: any
): Promise<string> {
  const db = admin.database();
  const filesRef = db.ref(`files/${location}`);

  // Push the new file data to the database, which generates a unique key.
  const newFileRef = filesRef.push();

  const dataToSave = {
    id: newFileRef.key, // Save the generated key as part of the data
    ...fileData,
  };

  await newFileRef.set(dataToSave);

  // Return the unique key of the newly created record.
  return newFileRef.key!;
}



/**
 * Fetches a single user's profile from the database.
 * @param userId - The UID of the user to fetch.
 * @returns A promise that resolves to the User object or null if not found.
 */
export async function getUserFromDB(userId: string): Promise<User | null> {
  const db = admin.database();
  const userRef = db.ref(`users/${userId}`);
  const snapshot = await userRef.once("value");

  if (!snapshot.exists()) {
    return null;
  }
  return { id: userId, ...snapshot.val() };
}



/**
 * Assigns a new work bundle to a user in a specific taluka.
 * This function uses a transaction to ensure atomicity and is now simplified.
 * @param userId - The UID of the user requesting a bundle.
 * @param location - The location slug for the assignment.
 * @param taluka - The taluka for which to assign a bundle.
 */

export async function assignNewBundleToUser(
  userId: string,
  location: string,
  taluka: string
): Promise<ActiveBundle> {
  const db = admin.database();
  const userStateRef = db.ref(`userStates/${userId}/activeBundles/${taluka}`);
  const bundleCounterRef = db.ref(`bundleCounters/${location}/${taluka}`);

  // First, check if the user already has an active bundle for this taluka.
  const existingStateSnapshot = await userStateRef.once("value");
  if (existingStateSnapshot.exists()) {
    throw new Error(`User already has an active bundle for ${taluka}.`);
  }

  let assignedBundleNo: number;

  // Run a single, atomic transaction to safely get the next bundle number.
  const { committed } = await bundleCounterRef.transaction(
    (currentData: BundleCounter | null) => {
      // If the counter doesn't exist for this taluka, initialize it.
      if (currentData === null) {
        assignedBundleNo = 1; // Assign the very first bundle
        return { nextBundle: 2 }; // The next one to be assigned will be 2
      }

      // Check if there are recycled bundle numbers in the 'gaps' array.
      if (currentData.gaps && currentData.gaps.length > 0) {
        currentData.gaps.sort((a, b) => a - b); // Ensure we take the smallest
        assignedBundleNo = currentData.gaps.shift()!; // Take the first number from gaps
      } else {
        // Otherwise, use the nextBundle number.
        assignedBundleNo = currentData.nextBundle || 1;
        currentData.nextBundle = assignedBundleNo + 1;
      }

      return currentData; // Return the modified data to be saved by the transaction.
    }
  );

  if (!committed) {
    throw new Error(
      "Failed to commit transaction to assign bundle number. Please try again."
    );
  }

  // Now that the transaction is complete and we have the assigned number,
  // create the new bundle state for the user.
  const newBundle: ActiveBundle = {
    bundleNo: assignedBundleNo!,
    count: 0,
    taluka: taluka,
  };

  await userStateRef.set(newBundle);

  return newBundle;
}




/**
 * Generates a unique ID prefix based on location and taluka names.
 * Example: "chhatrapati-sambhajinagar", "Paithan" -> "CSPA"
 * @param location - The location name.
 * @param taluka - The taluka name.
 * @returns A 4-letter prefix string.
 */
function generateIdPrefix(location: string, taluka: string): string {
    const locationPrefix = location.substring(0, 2).toUpperCase();
    const talukaPrefix = taluka.substring(0, 2).toUpperCase();
    return `${locationPrefix}${talukaPrefix}`;
}



/**
 * Saves a batch of processed records to the database.
 * This function handles unique ID generation and batch writing.
 * @param userId - The UID of the user submitting the records.
 * @param location - The user's location slug.
 * @param taluka - The taluka the records belong to.
 * @param bundleNo - The bundle number for these records.
 * @param records - An array of records to save.
 * @param sourceFile - The name of the original file the data came from.
 */
export async function saveProcessedRecordsToDB(
  userId: string,
  location: string,
  taluka: string,
  bundleNo: number,
  records: any[],
  sourceFile: string 
): Promise<void> {
    const db = admin.database();
    const idCounterRef = db.ref(`idCounters/${location}/${taluka}`);
    const recordsRef = db.ref(`processedRecords/${location}/${taluka}/bundle-${bundleNo}`);
    const updates: { [key: string]: ProcessedRecord } = {};

    // Generate a unique ID for each record in the batch.
    for (const record of records) {
        // Run a transaction to get the next sequential ID safely.
        const { snapshot } = await idCounterRef.transaction((currentData: { lastId: number } | null) => {
            if (currentData === null) {
                return { lastId: 1 };
            }
            currentData.lastId++;
            return currentData;
        });

        const newId = snapshot.val().lastId;
        const prefix = generateIdPrefix(location, taluka);
        const uniqueId = `${prefix}${newId}`;
        
        // Construct the full record object with all required metadata
        const newRecord: ProcessedRecord = {
            ...record, // The user-submitted data
            uniqueId: uniqueId,
            bundleNo: bundleNo,
            processedBy: userId,
            processedAt: new Date().toISOString(),
            sourceFile: sourceFile, 
            taluka: taluka,
        };
        
        updates[uniqueId] = newRecord;
    }

    // Perform a multi-path update to save all records in one go.
    await recordsRef.update(updates);
}




/**
 * Marks a user's active bundle for a specific taluka as complete by deleting it.
 * @param userId - The UID of the user completing the bundle.
 * @param taluka - The taluka of the bundle to be marked as complete.
 */
export async function markBundleAsCompleteInDB(userId: string, taluka: string): Promise<void> {
    const db = admin.database();
    const userStateRef = db.ref(`userStates/${userId}/activeBundles/${taluka}`);

    // Check if the bundle state actually exists before trying to remove it.
    const snapshot = await userStateRef.once('value');
    if (!snapshot.exists()) {
        throw new Error(`No active bundle found for user in taluka ${taluka} to mark as complete.`);
    }

    // Remove the entry from the database.
    await userStateRef.remove();
}


/**
 * Fetches the active bundle states for a given user.
 * @param userId - The UID of the user.
 * @returns A promise that resolves to an object containing the user's active bundles,
 * keyed by taluka, or null if none exist.
 */
export async function getActiveBundlesFromDB(userId: string): Promise<{ [taluka: string]: ActiveBundle } | null> {
    const db = admin.database();
    const userStateRef = db.ref(`userStates/${userId}/activeBundles`);

    const snapshot = await userStateRef.once('value');

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.val();
}



/**
 * Fetches all bundle counters from the database.
 * This provides a snapshot of the entire system's bundle assignment state.
 * @returns A promise that resolves to the bundle counters object or null if none exist.
 */
export async function getBundleCountersFromDB(): Promise<{ [location: string]: { [taluka: string]: BundleCounter } } | null> {
    const db = admin.database();
    const countersRef = db.ref('bundleCounters');
    const snapshot = await countersRef.once('value');

    if (!snapshot.exists()) {
        return null;
    }

    return snapshot.val();
}
