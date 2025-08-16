import admin from "firebase-admin";
import { User, ActiveBundle, BundleCounter } from "../types";
import logger from "../config/logger"; // Import the new logger

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
  const auth = admin.auth();
  const userRecord = await auth.createUser({
    email: `${userData.username}@yourapp.com`,
    password: userData.password,
    displayName: userData.name,
    disabled: false,
  });

  const db = admin.database();
  const updates: { [key: string]: any } = {};

  const profileData = {
    name: userData.name,
    username: userData.username,
    mobile: userData.mobile,
    location: userData.location,
    role: userData.role,
    excelFile: userData.excelFile || null,
    canDownloadFiles: true,
  };

  // Set user profile and increment user count atomically
  updates[`/users/${userRecord.uid}`] = profileData;
  updates[`/analytics/topLevelStats/registeredUsers`] =
    admin.database.ServerValue.increment(1);

  await db.ref().update(updates);
  return userRecord;
}

/**
 * Creates a metadata-only record for a new file in the Realtime Database.
 * This is the first step in the batch upload process.
 * @param location - The location slug (e.g., "akola").
 * @param fileMetadata - An object containing file metadata (name, size, etc.).
 * @returns The unique key (ID) of the new file record in Firebase.
 */
export async function createFileMetadataInDB(
  location: string,
  fileMetadata: Omit<any, "content">
): Promise<string> {
  const db = admin.database();
  const filesRef = db.ref(`files/${location}`);

  // Push to get a new unique key for the file
  const newFileRef = filesRef.push();

  const dataToSave = {
    id: newFileRef.key, // Save the generated key as part of the data
    ...fileMetadata,
    // Note: The 'content' is intentionally omitted here
  };

  const updates: { [key: string]: any } = {};

  // 1. Set the new file's metadata
  updates[`/files/${location}/${newFileRef.key}`] = dataToSave;

  const recordCount = fileMetadata.contentLength || 0;
  updates[`/analytics/topLevelStats/totalExcelRecords`] =
    admin.database.ServerValue.increment(recordCount);
  updates[`/analytics/topLevelStats/pendingRecords`] =
    admin.database.ServerValue.increment(recordCount);

  await db.ref().update(updates);

  return newFileRef.key!;
}

/**
 * Saves a batch of records to a specific file's content node in the database.
 * This uses a multi-path update for efficiency.
 * @param location - The location slug.
 * @param fileId - The unique ID of the file to which the content belongs.
 * @param batch - An array of records to save.
 */
export async function saveContentBatchToDB(
  location: string,
  fileId: string,
  batch: any[]
): Promise<void> {
  const db = admin.database();
  const contentRef = db.ref(`files/${location}/${fileId}/content`);

  // Get current content length to continue numbering
  const snapshot = await contentRef.once("value");
  const existingData = snapshot.val();
  let startIndex = 0;

  if (Array.isArray(existingData)) {
    startIndex = existingData.length;
  } else if (existingData && typeof existingData === "object") {
    startIndex = Object.keys(existingData).length;
  }

  const updates: { [key: string]: any } = {};

  batch.forEach((record, index) => {
    updates[startIndex + index] = record;
  });

  if (Object.keys(updates).length > 0) {
    await contentRef.update(updates);
  }
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

export async function updateUserInDB(userId: string, updates: Partial<User>) {
  const db = admin.database();

  const atomicUpdates: { [key: string]: any } = {};

  // Prepare to update the user's profile
  atomicUpdates[`/users/${userId}`] = updates;

  // Also prepare to update the user's name in the analytics leaderboard
  if (updates.name) {
    atomicUpdates[`/analytics/userLeaderboard/${userId}/userName`] =
      updates.name;
  }

  // Atomically update the database
  await db.ref().update(atomicUpdates);

  // Update corresponding data in Firebase Auth
  if (updates.name) {
    await admin.auth().updateUser(userId, {
      displayName: updates.name,
    });
  }
}

export const updateUserPermission = async (
  userId: string,
  canDownload: boolean
): Promise<void> => {
  const db = admin.database();
  const userProfileRef = db.ref(`users/${userId}`);
  await userProfileRef.update({ canDownloadFiles: canDownload });
};

export async function deleteUserInDB(userId: string) {
  // 1. Delete from Firebase Authentication
  await admin.auth().deleteUser(userId);

  // 2. Delete from Realtime Database
  const db = admin.database();
  const updates: { [key: string]: any } = {};

  updates[`/users/${userId}`] = null;
  updates[`/analytics/topLevelStats/registeredUsers`] =
    admin.database.ServerValue.increment(-1);

  await db.ref().update(updates);
}

export async function getFilesByLocationFromDB(
  location: string
): Promise<{ id: string; name: string; uploadDate: string; size: number }[]> {
  const db = admin.database();
  const filesRef = db.ref(`files/${location}`);
  const snapshot = await filesRef.once("value");

  if (!snapshot.exists()) {
    return [];
  }

  const filesData = snapshot.val();
  return Object.keys(filesData).map((key) => ({
    id: key,
    name: filesData[key].name,
    uploadDate: filesData[key].uploadDate,
    size: filesData[key].size,
  }));
}

/**
 * Gets a new, unassigned bundle number and assigns it to a user.
 * UPDATED: Now double-checks against a central registry to avoid manual-assignment collisions.
 * @param userId - The UID of the user.
 * @param location - The location slug.
 * @param taluka - The taluka slug.
 */
export async function assignNewBundleToUser(
  userId: string,
  location: string,
  taluka: string
): Promise<ActiveBundle> {
  const db = admin.database();
  const userStateRef = db.ref(`userStates/${userId}/activeBundles/${taluka}`);
  const bundleCounterRef = db.ref(`bundleCounters/${location}/${taluka}`);
  const assignedBundlesRef = db.ref(`assignedBundles/${location}/${taluka}`); // Central registry
  const MAX_ATTEMPTS = 10; // Safety break

  const existingStateSnapshot = await userStateRef.once("value");
  if (existingStateSnapshot.exists()) {
    throw new Error(`User already has an active bundle for ${taluka}.`);
  }

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    let assignedBundleNo: number | null = null;

    // Run transaction to get a potential number
    const { committed, snapshot } = await bundleCounterRef.transaction(
      (currentData: BundleCounter | null) => {
        if (currentData === null) {
          return { nextBundle: 2, gaps: [] }; // Start with bundle 1
        }
        if (currentData.gaps && currentData.gaps.length > 0) {
          currentData.gaps.sort((a, b) => a - b);
          assignedBundleNo = currentData.gaps.shift()!;
        } else {
          assignedBundleNo = currentData.nextBundle || 1;
          currentData.nextBundle = (currentData.nextBundle || 1) + 1;
        }
        return currentData;
      }
    );

    if (!committed || assignedBundleNo === null) {
      throw new Error("Failed to commit transaction to get bundle number.");
    }

    // CRITICAL CHECK: See if the number we just got from the counter
    // was already given out manually and is in our central registry.
    const registrySnapshot = await assignedBundlesRef
      .child(String(assignedBundleNo))
      .once("value");
    if (registrySnapshot.exists()) {
      logger.warn(
        `Counter provided bundle #${assignedBundleNo}, but it was already manually assigned. Retrying...`
      );
      continue; // Loop again to get the next number
    }

    // If we are here, the number is available. Let's assign it.
    const newBundle: ActiveBundle = {
      bundleNo: assignedBundleNo,
      count: 0,
      taluka: taluka,
    };

    // Prepare atomic update
    const updates: { [key: string]: any } = {};
    // 1. Set the user's active bundle
    updates[`userStates/${userId}/activeBundles/${taluka}`] = newBundle;
    // 2. Mark this bundle as taken in the central registry
    updates[`assignedBundles/${location}/${taluka}/${assignedBundleNo}`] = true;

    updates[`/analytics/topLevelStats/activeBundles`] =
      admin.database.ServerValue.increment(1);

    await db.ref().update(updates);

    logger.info(
      `Successfully assigned bundle #${newBundle.bundleNo} to user ${userId}`
    );
    return newBundle; // Success, exit the loop and function
  }

  throw new Error(
    `Failed to find an available bundle after ${MAX_ATTEMPTS} attempts.`
  );
}

interface ProcessedRecord {
  [key: string]: any; // Allows for dynamic keys from the source file
  bundleNo: number;
  processedBy: string;
  processedAt: string;
  sourceFile: string;
  taluka: string;
}

/**
 * Validates the user's active bundle and saves processed records to the database.
 * It extracts a 'uniqueId' from each record to use as its database key.
 * It also checks for duplicate 'Intimation No' values.
 *
 * @param userId - The ID of the user submitting the records.
 * @param location - The location (district) of the data.
 * @param taluka - The taluka of the data.
 * @param bundleNo - The bundle number being submitted.
 * @param records - An array of records to save, each containing a uniqueId.
 * @param sourceFile - The name of the file from which records were processed.
 */

/**
 * [FINAL EFFICIENT VERSION]
 * Saves processed records and performs lightweight, incremental updates to the analytics node.
 * This function is designed to be fast and cheap for everyday operations.
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

  // --- Active Bundle Validation ---
  const activeBundleRef = db.ref(
    `userStates/${userId}/activeBundles/${taluka}`
  );
  const activeBundleSnapshot = await activeBundleRef.once("value");
  if (!activeBundleSnapshot.exists()) {
    throw new Error(
      `User does not have an active bundle for taluka: ${taluka}.`
    );
  }
  const activeBundleData = activeBundleSnapshot.val();
  if (Number(activeBundleData.bundleNo) !== Number(bundleNo)) {
    throw new Error(
      `Submission for bundle #${bundleNo} is not allowed. The active bundle for ${taluka} is #${activeBundleData.bundleNo}.`
    );
  }
  if (records.length > 250) {
    throw new Error("Cannot sync more than 250 records at a time.");
  }

  const updates: { [key: string]: any } = {};
  const seenIntimationNos = new Set<string>();
  let countToIncrement = 0;
  const user = await getUserFromDB(userId);

  // Get date key once for the entire batch
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(now.getTime() + istOffset);
  const dateKey = `${istDate.getUTCFullYear()}-${String(
    istDate.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(istDate.getUTCDate()).padStart(2, "0")}`;

  for (const record of records) {
    const uniqueIdKey = Object.keys(record).find(
      (k) =>
        k
          .trim()
          .toLowerCase()
          .replace(/[\s_-]/g, "") === "uniqueid"
    );
    if (!uniqueIdKey || !record[uniqueIdKey]) {
      throw new Error(`A record in the batch is missing its unique ID.`);
    }
    const uniqueId = record[uniqueIdKey];

    // --- Duplicate checking ---
    let isDuplicate = false;
    const intimationNoKey = Object.keys(record).find(
      (k) => k.trim().toLowerCase() === "intimation no"
    );
    const intimationNo = intimationNoKey ? record[intimationNoKey] : null;
    if (intimationNo) {
      if (seenIntimationNos.has(intimationNo)) {
        isDuplicate = true;
      } else {
        seenIntimationNos.add(intimationNo);
        const snapshot = await db
          .ref(`/intimationNoIndex/${intimationNo}`)
          .once("value");
        if (snapshot.exists()) {
          isDuplicate = true;
        }
      }
    }

    const newRecord: ProcessedRecord = {
      ...record,
      bundleNo,
      processedBy: userId,
      processedAt: new Date().toISOString(),
      sourceFile,
      taluka,
    };
    const recordPath = `/processedRecords/${location}/${taluka}/bundle-${bundleNo}/${uniqueId}`;

    // Only perform analytics updates for brand new records
    const existingRecordSnap = await db.ref(recordPath).once("value");
    if (!existingRecordSnap.exists()) {
      countToIncrement++;

      // --- All analytics increment logic is now here ---
      updates[`/analytics/totalRecords`] =
        admin.database.ServerValue.increment(1);
      updates[`/analytics/recordsByLocation/${location}`] =
        admin.database.ServerValue.increment(1);
      updates[`/analytics/dailyCounts/${dateKey}`] =
        admin.database.ServerValue.increment(1);

      const pdfKey = Object.keys(record).find(
        (k) => k.trim().toLowerCase() === "pdf required"
      );
      if (pdfKey && record[pdfKey] === "yes") {
        updates[`/analytics/totalPdfsRequired`] =
          admin.database.ServerValue.increment(1);
        updates[`/analytics/todayStats/pdfRequired`] =
          admin.database.ServerValue.increment(1);
      }

      if (user) {
        updates[`/analytics/userLeaderboard/${userId}/recordsProcessed`] =
          admin.database.ServerValue.increment(1);
        updates[`/analytics/userLeaderboard/${userId}/userName`] = user.name;
      }

      if (sourceFile) {
        const fileKey = sourceFile.replace(/[.#$[\]]/g, "_");
        updates[`/analytics/fileStats/${fileKey}/completed`] =
          admin.database.ServerValue.increment(1);
        updates[`/analytics/fileStats/${fileKey}/fileName`] = sourceFile;
      }

      const bundleKey = `${location}-${taluka}-${bundleNo}`;
      updates[`/analytics/bundleSummaries/${bundleKey}/recordsProcessed`] =
        admin.database.ServerValue.increment(1);
      updates[`/analytics/bundleSummaries/${bundleKey}/location`] = location;
      updates[`/analytics/bundleSummaries/${bundleKey}/taluka`] = taluka;
      updates[`/analytics/bundleSummaries/${bundleKey}/bundleNo`] = bundleNo;
    }

    // --- The rest of the saving logic ---
    updates[recordPath] = newRecord;

    if (intimationNo) {
      updates[`/intimationNoIndex/${intimationNo}`] = uniqueId;
    }

    if (isDuplicate) {
      const newDuplicateKey = db
        .ref(`/duplicateRecords/${location}/${taluka}`)
        .push().key;
      updates[`/duplicateRecords/${location}/${taluka}/${newDuplicateKey}`] = {
        ...newRecord,
        reason: "Duplicate record",
      };
      updates[`/analytics/totalDuplicates`] =
        admin.database.ServerValue.increment(1);
      if (user) {
        updates[`/analytics/userLeaderboard/${userId}/duplicateCount`] =
          admin.database.ServerValue.increment(1);
      }
    }
  }

  // Atomically write all updates (records, indexes, and analytics) in one go
  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
  }

  // Update the user's personal count for the active bundle
  if (countToIncrement > 0) {
    const userStateCountRef = db.ref(
      `userStates/${userId}/activeBundles/${taluka}/count`
    );
    await userStateCountRef.set(
      admin.database.ServerValue.increment(countToIncrement)
    );
  }
}

/**
 * Fetches all saved duplicate records for a given location.
 * @param location - The location slug (e.g., "akola").
 * @returns A promise that resolves to an array of all duplicate records for that location.
 */
export async function getDuplicateRecordsFromDB(
  location: string
): Promise<any[]> {
  const db = admin.database();
  const locationRef = db.ref(`duplicateRecords/${location}`);
  const snapshot = await locationRef.once("value");

  if (!snapshot.exists()) {
    return [];
  }

  const allRecords: any[] = [];
  const talukaData = snapshot.val();

  // The data is nested: taluka -> recordId -> record. We need to flatten it.
  for (const taluka in talukaData) {
    const recordsInTaluka = talukaData[taluka];
    for (const recordId in recordsInTaluka) {
      allRecords.push(recordsInTaluka[recordId]);
    }
  }

  return allRecords;
}

/**
 * Marks a user's active bundle for a specific taluka as complete.
 * This now adds a completion flag to the processed records and then deletes the active state.
 * @param userId - The UID of the user completing the bundle.
 * @param taluka - The taluka of the bundle to be marked as complete.
 */
export async function markBundleAsCompleteInDB(
  userId: string,
  taluka: string
): Promise<void> {
  const db = admin.database();
  const userStateRef = db.ref(`userStates/${userId}/activeBundles/${taluka}`);

  // --- Step 1: Get active bundle ---
  const activeBundleSnapshot = await userStateRef.once("value");
  if (!activeBundleSnapshot.exists()) {
    throw new Error(`No active bundle found for user in taluka ${taluka}.`);
  }

  const activeBundle: ActiveBundle = activeBundleSnapshot.val();
  const bundleNo = activeBundle.bundleNo;

  const user = await getUserFromDB(userId);
  if (!user) {
    throw new Error(`User with ID ${userId} not found.`);
  }
  const location = user.location;

  // --- Step 2: Mark completion in processedRecords ---
  const updates: { [key: string]: any } = {};
  const recordPath = `/processedRecords/${location}/${taluka}/bundle-${bundleNo}`;
  updates[`${recordPath}/isUserCompleted`] = true;
  updates[`${recordPath}/userCompletedAt`] = new Date().toISOString();

  const bundleKey = `${location}-${taluka}-${bundleNo}`;
  updates[`/analytics/bundleSummaries/${bundleKey}/status`] =
    "Completed by User";
  updates[`/analytics/bundleSummaries/${bundleKey}/userName`] = user.name;

  // Decrement active bundles count
  updates[`/analytics/topLevelStats/activeBundles`] =
    admin.database.ServerValue.increment(-1);

  await db.ref().update(updates);

  // --- Step 3: Delete active bundle atomically ---
  await userStateRef.transaction((currentData) => {
    if (currentData && currentData.bundleNo === bundleNo) {
      return null; // delete
    }
    return currentData; // don't touch if bundle changed
  });

  // --- Step 4: Verify deletion ---
  const verifySnap = await userStateRef.once("value");
  if (verifySnap.exists()) {
    throw new Error(
      `Failed to delete active bundle for user ${userId} in taluka ${taluka}.`
    );
  }

  logger.info(
    `Bundle #${bundleNo} for taluka ${taluka} marked complete and removed for user ${userId}.`
  );
}

/**
 * Fetches the configuration data (locations and talukas).
 */
export async function getConfigFromDB(): Promise<any> {
  const db = admin.database();
  const configRef = db.ref("config");
  const snapshot = await configRef.once("value");
  return snapshot.val();
}

/**
 * Adds a new taluka to a location's list in the /config path.
 * Uses a targeted transaction for maximum reliability.
 * @param locationSlug - The slug of the location to add the taluka to.
 * @param talukaName - The name of the new taluka.
 * @returns A success or informational message.
 */
export async function addTalukaToLocation(
  locationSlug: string,
  talukaName: string
): Promise<{ message: string }> {
  const db = admin.database();
  const configRef = db.ref("config");

  // 1. Read config first to find the numeric index of the location object.
  const snapshot = await configRef.once("value");
  const config = snapshot.val();

  if (!config || !config.talukas || !Array.isArray(config.talukas)) {
    throw new Error("Configuration data is missing or has an invalid format.");
  }

  const locationIndex = config.talukas.findIndex(
    (loc: any) => loc.locationSlug === locationSlug
  );

  if (locationIndex === -1) {
    throw new Error(
      `Location with slug "${locationSlug}" not found in config.`
    );
  }

  // 2. Create a direct reference to the specific array we want to modify.
  // For example: /config/talukas/0/talukas
  const talukasArrayRef = db.ref(`/config/talukas/${locationIndex}/talukas`);

  // 3. Run a transaction on only the array of talukas.
  const { committed } = await talukasArrayRef.transaction(
    (currentTalukaList) => {
      // currentTalukaList is the array itself (e.g., ['Jamkhed', 'Karjat']) or null.
      const talukaArray = currentTalukaList || [];

      // If the taluka already exists, abort the transaction by returning undefined.
      if (talukaArray.includes(talukaName)) {
        return; // Abort
      }

      // Add the new taluka and return the modified array.
      talukaArray.push(talukaName);
      return talukaArray;
    }
  );

  if (committed) {
    return {
      message: `Successfully added taluka "${talukaName}" to "${locationSlug}".`,
    };
  } else {
    // If the transaction was aborted, it's almost certainly because the taluka
    // already existed. We provide a helpful message for this case.
    // For any other conflict, we'll provide the generic error.
    const checkSnapshot = await talukasArrayRef.once("value");
    if (checkSnapshot.val()?.includes(talukaName)) {
      return {
        message: `Taluka "${talukaName}" already exists in "${locationSlug}". No changes made.`,
      };
    }

    throw new Error(
      "Failed to add taluka. The request may have conflicted with another operation. Please try again."
    );
  }
}

/**
 * Fetches active bundles and enriches them with the total record count for that bundle.
 * @param userId - The UID of the user.
 * @returns A promise that resolves to an object containing the user's active bundles,
 * keyed by taluka, or null if none exist.
 */
export async function getActiveBundlesFromDB(
  userId: string
): Promise<any | null> {
  const db = admin.database();
  const userStateRef = db.ref(`userStates/${userId}/activeBundles`);
  const userSnapshot = await db.ref(`users/${userId}`).once("value");
  const stateSnapshot = await userStateRef.once("value");

  if (!stateSnapshot.exists() || !userSnapshot.exists()) {
    return null;
  }

  const user: User = { id: userId, ...userSnapshot.val() };
  const activeBundles = stateSnapshot.val();

  // If there's no assigned Excel file, we can't calculate totals.
  if (!user.excelFile) return activeBundles;

  // Find the source file in the database
  const fileSnapshot = await db
    .ref("files")
    .orderByChild("name")
    .equalTo(user.excelFile)
    .limitToFirst(1)
    .once("value");
  if (!fileSnapshot.exists()) return activeBundles;

  const fileData = Object.values(fileSnapshot.val())[0] as any;
  const totalRecordsInFile = fileData.content?.length || 0;
  const BUNDLE_SIZE = 250; // Assuming a fixed bundle size

  // Enrich each active bundle with the total count
  for (const taluka in activeBundles) {
    const bundle = activeBundles[taluka];
    const startIndex = (bundle.bundleNo - 1) * BUNDLE_SIZE;
    const endIndex = startIndex + BUNDLE_SIZE;
    // Calculate the actual number of records in this specific bundle slice
    const recordsInThisBundle = Math.min(
      BUNDLE_SIZE,
      totalRecordsInFile - startIndex
    );
    bundle.totalRecords = recordsInThisBundle > 0 ? recordsInThisBundle : 0;
  }

  return activeBundles;
}

/**
 * Fetches all bundle counters from the database.
 * This provides a snapshot of the entire system's bundle assignment state.
 * @returns A promise that resolves to the bundle counters object or null if none exist.
 */
export async function getBundleCountersFromDB(): Promise<{
  [location: string]: { [taluka: string]: BundleCounter };
} | null> {
  const db = admin.database();
  const countersRef = db.ref("bundleCounters");
  const snapshot = await countersRef.once("value");

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.val();
}

/**
 * Resets a user's progress for a specific taluka.
 * This involves deleting their processed records for the active bundle,
 * clearing their active bundle state, and recycling the bundle number.
 * @param userId - The UID of the user to reset.
 * @param taluka - The taluka for which to reset progress.
 * @returns The bundle number that was recycled.
 */
export async function resetUserProgressInDB(
  userId: string,
  taluka: string
): Promise<number> {
  const db = admin.database();

  // Find the user's profile to get their location.
  const user = await getUserFromDB(userId);
  if (!user) {
    throw new Error(`User with ID ${userId} not found.`);
  }
  const location = user.location;

  // Find the user's active bundle for the specified taluka.
  const userStateRef = db.ref(`userStates/${userId}/activeBundles/${taluka}`);
  const activeBundleSnapshot = await userStateRef.once("value");
  if (!activeBundleSnapshot.exists()) {
    throw new Error(`No active bundle found for user in taluka ${taluka}.`);
  }
  const activeBundle: ActiveBundle = activeBundleSnapshot.val();
  const bundleNoToRecycle = activeBundle.bundleNo;

  // Prepare a multi-path update to delete the user's state and the bundle's data.
  // By deleting the entire bundle, we ensure data integrity.
  const updates: { [key: string]: null } = {};
  updates[`/userStates/${userId}/activeBundles/${taluka}`] = null;
  updates[
    `/processedRecords/${location}/${taluka}/bundle-${bundleNoToRecycle}`
  ] = null;

  await db.ref().update(updates);

  // Atomically add the recycled bundle number to the 'gaps' array.
  const bundleCounterRef = db.ref(`bundleCounters/${location}/${taluka}`);
  await bundleCounterRef.transaction((currentData: BundleCounter | null) => {
    if (currentData) {
      if (!currentData.gaps) {
        currentData.gaps = [];
      }
      // Ensure the bundle number isn't already in the gaps list
      if (!currentData.gaps.includes(bundleNoToRecycle)) {
        currentData.gaps.push(bundleNoToRecycle);
      }
    }
    return currentData;
  });

  // --- NEW: Trigger a full recalculation to ensure stats are accurate ---
  logger.info(
    `Triggering analytics recalculation after resetting user ${userId}.`
  );
  await recalculateAllAnalyticsInBackend();

  return bundleNoToRecycle;
}

/**
 * Force-completes a specific bundle.
 * This marks the bundle as complete, saves the assigned user's ID for tracking,
 * and clears the user's active state if it matches.
 * @param userId - The UID of the user associated with the bundle.
 * @param location - The location slug of the bundle.
 * @param taluka - The taluka of the bundle.
 * @param bundleNo - The number of the bundle to complete.
 */
export async function forceCompleteBundleInDB(
  userId: string,
  location: string,
  taluka: string,
  bundleNo: number
): Promise<void> {
  const db = admin.database();
  const updates: { [key: string]: any } = {};
  const user = await getUserFromDB(userId);

  const recordPath = `/processedRecords/${location}/${taluka}/bundle-${bundleNo}`;
  updates[`${recordPath}/isForceCompleted`] = true;
  updates[`${recordPath}/forceCompletedBy`] = "admin";
  updates[`${recordPath}/assignedTo`] = userId;

  const bundleKey = `${location}-${taluka}-${bundleNo}`;
  updates[`/analytics/bundleSummaries/${bundleKey}/status`] =
    "Force Completed by Admin";
  if (user) {
    updates[`/analytics/bundleSummaries/${bundleKey}/userName`] = user.name;
  }

  const userStateRef = db.ref(`userStates/${userId}/activeBundles/${taluka}`);
  const activeBundleSnapshot = await userStateRef.once("value");

  if (activeBundleSnapshot.exists()) {
    const activeBundle: ActiveBundle = activeBundleSnapshot.val();

    // --- THIS IS THE FIX ---
    // Convert both values to numbers to prevent type mismatch errors (e.g., 1 === "1").
    if (Number(activeBundle.bundleNo) === Number(bundleNo)) {
      updates[`/userStates/${userId}/activeBundles/${taluka}`] = null;
      // Decrement active bundles count
      updates[`/analytics/topLevelStats/activeBundles`] =
        admin.database.ServerValue.increment(-1);
    }
  }

  await db.ref().update(updates);
}

/**
 * Manually assigns a specific bundle number to a user for a given taluka.
 * UPDATED: Now updates the central bundle counter to prevent collisions.
 * @param userId - The UID of the user to assign the bundle to.
 * @param location - The location slug (needed to find the correct counter).
 * @param taluka - The taluka for the assignment.
 * @param bundleNo - The specific bundle number to assign.
 */
export async function manualAssignBundleToUserInDB(
  userId: string,
  location: string,
  taluka: string,
  bundleNo: number
): Promise<ActiveBundle> {
  const db = admin.database();
  const userStateRef = db.ref(`userStates/${userId}/activeBundles/${taluka}`);
  const bundleCounterRef = db.ref(`bundleCounters/${location}/${taluka}`);

  // Step 1: Prepare the atomic update for user state and analytics.
  const updates: { [key: string]: any } = {};
  const newBundle: ActiveBundle = {
    bundleNo: bundleNo,
    count: 0,
    taluka: taluka,
  };
  updates[`/userStates/${userId}/activeBundles/${taluka}`] = newBundle;
  // --- Increment the active bundles counter ---
  updates[`/analytics/topLevelStats/activeBundles`] =
    admin.database.ServerValue.increment(1);

  // Atomically set the user's bundle and update the analytics.
  await db.ref().update(updates);

  // Step 2: Update the central counter to reflect the manual assignment.
  await bundleCounterRef.transaction((currentData: BundleCounter | null) => {
    // If the counter doesn't exist, initialize it based on the manual assignment.
    if (currentData === null) {
      return { nextBundle: bundleNo + 1, gaps: [] };
    }

    // If the assigned number was waiting in the 'gaps' array, remove it.
    if (currentData.gaps && currentData.gaps.includes(bundleNo)) {
      currentData.gaps = currentData.gaps.filter((g) => g !== bundleNo);
    }

    // If the assigned number is the 'nextBundle', advance the counter.
    if (currentData.nextBundle === bundleNo) {
      currentData.nextBundle = bundleNo + 1;
    }

    // This prevents a scenario where a high manual number is assigned
    // but the counter stays low.
    if (bundleNo >= currentData.nextBundle) {
      currentData.nextBundle = bundleNo + 1;
    }

    return currentData;
  });

  logger.info(
    `Manually assigned bundle #${bundleNo} to user ${userId} and updated counter.`
  );
  return newBundle;
}

/**
 * Fetches all processed records for a given location, flattening the nested structure.
 * @param location - The location slug (e.g., "akola").
 * @returns A promise that resolves to an array of all processed records for that location.
 */
export async function getProcessedRecordsByLocationFromDB(
  location: string
): Promise<ProcessedRecord[]> {
  const db = admin.database();
  const locationRef = db.ref(`processedRecords/${location}`);
  const snapshot = await locationRef.once("value");

  if (!snapshot.exists()) {
    return [];
  }

  const allRecords: ProcessedRecord[] = [];
  const talukaData = snapshot.val();

  // The data is nested: taluka -> bundle -> record. We need to flatten it.
  for (const taluka in talukaData) {
    for (const bundle in talukaData[taluka]) {
      const recordsInBundle = talukaData[taluka][bundle];
      for (const recordId in recordsInBundle) {
        // Ignore metadata fields like isForceCompleted at the bundle level
        if (typeof recordsInBundle[recordId] === "object") {
          allRecords.push(recordsInBundle[recordId]);
        }
      }
    }
  }

  return allRecords;
}

/**
 * [DANGER ZONE] Deletes all processed records from the entire database.
 * This is an irreversible operation.
 */
export async function resetAllProcessedDataInDB(): Promise<void> {
  const db = admin.database();
  const processedRecordsRef = db.ref("processedRecords");
  await processedRecordsRef.remove();
}

/**
 * [DANGER ZONE] Deletes all bundle counters and user states from the database.
 * This resets the entire bundle assignment system.
 */
export async function resetAllCountersInDB(): Promise<void> {
  const db = admin.database();
  const updates: { [key: string]: null } = {};
  updates["/bundleCounters"] = null;
  updates["/userStates"] = null;
  await db.ref().update(updates);
}

// Define an interface for the function's return type for type safety
interface DashboardSummary {
  totalExcelRecords: number;
  completedRecords: number;
  pendingRecords: number;
  registeredUsers: number;
  activeBundles: number;
  pdfsRequired: number;
  recordsProcessedByDate: { date: string; count: number }[];
  recordsByLocation: { name: string; value: number }[];
}

/**
 * [FINAL VERSION]
 * Fetches the complete, pre-calculated dashboard summary from the /analytics node.
 * This is the most efficient version, performing only a single database read.
 */
export async function getDashboardSummaryFromDB(): Promise<DashboardSummary> {
  const db = admin.database();
  const snapshot = await db.ref("analytics").once("value");

  if (!snapshot.exists()) {
    // Return a default, empty structure if analytics haven't been calculated yet
    return {
      totalExcelRecords: 0,
      completedRecords: 0,
      pendingRecords: 0,
      registeredUsers: 0,
      activeBundles: 0,
      pdfsRequired: 0,
      recordsProcessedByDate: [],
      recordsByLocation: [],
    };
  }

  const analyticsData = snapshot.val();
  const topStats = analyticsData.topLevelStats || {};

  // --- Format Records by Location ---
  const recordsByLocation = Object.values(
    analyticsData.recordsByLocation || []
  ).map((locationObject: any) => ({
    name:
      locationObject.name.charAt(0).toUpperCase() +
      locationObject.name.slice(1),
    value: Number(locationObject.value),
  }));

  // --- Format Last 7 Days of Data ---
  const recordsProcessedByDate = [];
  const dailyCounts = analyticsData.dailyCounts || {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
    const displayDate = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    recordsProcessedByDate.push({
      date: displayDate,
      count: dailyCounts[dateKey] || 0,
    });
  }

  // Assemble the final object using the pre-calculated data from topLevelStats
  return {
    totalExcelRecords: topStats.totalExcelRecords || 0,
    completedRecords: topStats.completedRecords || 0,
    pendingRecords: topStats.pendingRecords || 0,
    registeredUsers: topStats.registeredUsers || 0,
    activeBundles: topStats.activeBundles || 0,
    pdfsRequired: topStats.pdfRequired || 0,
    recordsProcessedByDate,
    recordsByLocation,
  };
}

/**
 * Gathers and computes all data needed for the entire Analytics page.
 * This is an expensive operation as it processes all data in the database.
 * Gathers and computes all data needed for the entire Analytics page.
 * Reads from pre-aggregated data in /analytics and now includes today/yesterday stats.
 * @param filters - Optional filters for the bundle summary.
 * @returns An object containing all aggregated analytics data.
 */
export async function getAnalyticsDataFromDB(filters: {
  location?: string;
  taluka?: string;
}): Promise<any> {
  const db = admin.database();
  const snapshot = await db.ref("analytics").once("value");

  if (!snapshot.exists()) {
    // This provides a default empty state if the recalculation has never been run
    return {
      topLevelStats: {},
      recordsByLocation: [],
      processingStatusByFile: [],
      userLeaderboard: [],
      bundleCompletionSummary: [],
      duplicateStats: { duplicateLeaderboard: [] },
    };
  }

  const analyticsData = snapshot.val();

  // Apply any filters to the results before returning them
  if (filters.location && analyticsData.bundleCompletionSummary) {
    analyticsData.bundleCompletionSummary =
      analyticsData.bundleCompletionSummary.filter(
        (b: any) => b.location === filters.location
      );
  }

  if (filters.taluka && analyticsData.bundleCompletionSummary) {
    analyticsData.bundleCompletionSummary =
      analyticsData.bundleCompletionSummary.filter(
        (b: any) => b.taluka === filters.taluka
      );
  }

  return analyticsData;
}

/**
 * Fetches a single uploaded file by its ID for a specific location.
 * @param location - The location slug where the file is stored.
 * @param fileId - The unique ID of the file to fetch.
 * @returns The file object or null if not found.
 */
export async function getFileByIdFromDB(
  location: string,
  fileId: string
): Promise<any | null> {
  const db = admin.database();
  const fileRef = db.ref(`files/${location}/${fileId}`);
  const snapshot = await fileRef.once("value");

  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.val();
}

/**
 * Fetches the content of the Excel file assigned to a specific user.
 * @param userId - The UID of the user.
 * @returns The content of the assigned file or null if not found.
 */
export async function getAssignedFileContentFromDB(
  userId: string
): Promise<any[] | null> {
  const db = admin.database();
  const user = await getUserFromDB(userId);

  if (!user || !user.location || !user.excelFile) {
    throw new Error("User profile is incomplete or has no file assigned.");
  }

  // Find the file by name. Note: This assumes file names are unique.
  const filesRef = db.ref(`files/${user.location}`);
  const snapshot = await filesRef
    .orderByChild("name")
    .equalTo(user.excelFile)
    .limitToFirst(1)
    .once("value");

  if (!snapshot.exists()) {
    return null;
  }

  const fileData = Object.values(snapshot.val())[0] as any;
  return fileData.content || [];
}

/**
 * Searches for a raw, unprocessed record within a user's assigned file.
 * @param userId - The UID of the user performing the search.
 * @param searchId - The ID from the 'Search from' column to find.
 * @returns The found record object or null.
 */
export async function searchRawRecordFromDB(
  userId: string,
  searchId: string
): Promise<any | null> {
  const fileContent = await getAssignedFileContentFromDB(userId);
  if (!fileContent) {
    return null;
  }

  // The 'Search from' column might have different names. We'll check for common variations.
  const searchKeys = ["Search from", "Search From", "search from"];
  const foundRecord = fileContent.find((record) => {
    for (const key of searchKeys) {
      if (
        record[key] &&
        String(record[key]).trim() === String(searchId).trim()
      ) {
        return true;
      }
    }
    return false;
  });

  return foundRecord || null;
}

/**
 * Gets the next available unique ID for a given taluka.
 * @param location - The location slug.
 * @param taluka - The taluka name.
 * @returns The next unique ID string (e.g., "AHJA251").
 */
export async function getNextUniqueIdFromDB(
  location: string,
  taluka: string
): Promise<string> {
  const db = admin.database();
  const idCounterRef = db.ref(`idCounters/${location}/${taluka}`);

  // Run a transaction to safely get and increment the next ID.
  const { snapshot } = await idCounterRef.transaction(
    (currentData: { lastId: number } | null) => {
      if (currentData === null) {
        return { lastId: 1 };
      }
      currentData.lastId++;
      return currentData;
    }
  );

  const newId = snapshot.val().lastId;
  const locationPrefix = location.substring(0, 2).toUpperCase();
  const talukaPrefix = taluka.substring(0, 2).toUpperCase();

  return `${locationPrefix}${talukaPrefix}${newId}`;
}

/**
 * Searches for a single PROCESSED record by the value in its "Search from" field.
 * This is for the admin's search tool.
 * @param searchFromId - The value from the "Search from" column to find.
 * @returns The found record object or null.
 */
export async function searchProcessedRecordBySearchFromId(
  searchFromId: string
): Promise<any | null> {
  const db = admin.database();
  const recordsRef = db.ref("processedRecords");
  const snapshot = await recordsRef.once("value");

  if (!snapshot.exists()) {
    return null;
  }

  const allLocations = snapshot.val();

  // Define possible variations of the "Search from" column header.
  const searchKeys = ["Search from", "Search From", "search from"];

  // This is an expensive search that iterates through all processed data.
  for (const location in allLocations) {
    for (const taluka in allLocations[location]) {
      for (const bundle in allLocations[location][taluka]) {
        const recordsInBundle = allLocations[location][taluka][bundle];
        for (const recordId in recordsInBundle) {
          const record = recordsInBundle[recordId];
          if (typeof record === "object" && record !== null) {
            // Check against all possible key variations.
            for (const key of searchKeys) {
              if (
                record[key] &&
                String(record[key]).trim() === String(searchFromId).trim()
              ) {
                return record; // Return the first match found.
              }
            }
          }
        }
      }
    }
  }

  return null; // Return null if no match is found after checking everything.
}

/**
 * Clears a user's active bundle state for a specific taluka.
 * This is used for "Mark Incomplete Bundle as Complete".
 * @param userId - The UID of the user.
 * @param taluka - The taluka of the bundle to clear.
 */
export async function clearUserActiveBundleInDB(
  userId: string,
  taluka: string
): Promise<void> {
  const db = admin.database();
  const userStateRef = db.ref(`userStates/${userId}/activeBundles/${taluka}`);

  const snapshot = await userStateRef.once("value");
  if (!snapshot.exists()) {
    throw new Error(
      `User ${userId} has no active bundle for taluka ${taluka}.`
    );
  }

  const updates: { [key: string]: any } = {};
  updates[`/userStates/${userId}/activeBundles/${taluka}`] = null;
  updates[`/analytics/topLevelStats/activeBundles`] =
    admin.database.ServerValue.increment(-1);

  await db.ref().update(updates);
}

/**
 * Deletes an uploaded file record from the database.
 * Note: This does not delete from Firebase Storage if you were storing the raw files there.
 * @param location - The location slug.
 * @param fileId - The ID of the file to delete.
 */
export async function deleteFileFromDB(
  location: string,
  fileId: string
): Promise<void> {
  const db = admin.database();
  const fileRef = db.ref(`files/${location}/${fileId}`);

  const snapshot = await fileRef.once("value");
  if (!snapshot.exists()) {
    throw new Error(
      `File with ID ${fileId} not found in location ${location}.`
    );
  }

  const fileData = snapshot.val();
  const recordCount = fileData.content?.length || 0;

  const updates: { [key: string]: any } = {};

  // 1. Mark the file for deletion
  updates[`/files/${location}/${fileId}`] = null;

  // 2. Decrement the analytics counters
  updates[`/analytics/topLevelStats/totalExcelRecords`] =
    admin.database.ServerValue.increment(-recordCount);
  updates[`/analytics/topLevelStats/pendingRecords`] =
    admin.database.ServerValue.increment(-recordCount);

  await db.ref().update(updates);
}

/**
 * [CORRECTED]
 * This function lives in your backend and performs the full, expensive recalculation.
 * It now correctly skips metadata keys to prevent NaN errors.
 */

// ---------- Types ----------
interface FileEntry {
  name: string;
  content?: unknown[];
}

interface FilesByLocation {
  [location: string]: {
    [fileId: string]: FileEntry;
  };
}

interface UsersData {
  [id: string]: Omit<User, "id">;
}

interface UserState {
  activeBundles?: Record<string, ActiveBundle>;
}

interface UserStatesData {
  [id: string]: UserState;
}

interface RecordEntry {
  processedAt?: string | number;
  processedBy?: string;
  sourceFile?: string;
  [key: string]: unknown;
}

interface BundleData {
  assignedTo?: string;
  isForceCompleted?: boolean;
  isUserCompleted?: boolean;
  [recordId: string]: RecordEntry | unknown;
}

interface ProcessedRecordsData {
  [location: string]: {
    [taluka: string]: {
      [bundleKey: string]: BundleData;
    };
  };
}

interface DuplicateRecordsData {
  [location: string]: {
    [taluka: string]: {
      [recordId: string]: RecordEntry;
    };
  };
}

interface FileStats {
  fileName: string;
  total: number;
  completed: number;
}

interface BundleDetails {
  userName: string;
  location: string;
  taluka: string;
  bundleNo: number;
  recordsProcessed: number;
  pdfsRequired: number;
  status: string | null;
}

// ---------- Function ----------
export async function recalculateAllAnalyticsInBackend(): Promise<void> {
  logger.info("Starting full analytics recalculation from backend service...");
  const db = admin.database();

  const [
    processedRecordsSnapshot,
    duplicateRecordsSnapshot,
    usersSnapshot,
    filesSnapshot,
    userStatesSnapshot,
  ] = await Promise.all([
    db.ref("processedRecords").once("value"),
    db.ref("duplicateRecords").once("value"),
    db.ref("users").once("value"),
    db.ref("files").once("value"),
    db.ref("userStates").once("value"),
  ]);

  const processedRecordsData: ProcessedRecordsData =
    (processedRecordsSnapshot.val() as ProcessedRecordsData) || {};
  const duplicateRecordsData: DuplicateRecordsData =
    (duplicateRecordsSnapshot.val() as DuplicateRecordsData) || {};
  const usersData: UsersData = (usersSnapshot.val() as UsersData) || {};
  const filesData: FilesByLocation =
    (filesSnapshot.val() as FilesByLocation) || {};
  const userStatesData: UserStatesData =
    (userStatesSnapshot.val() as UserStatesData) || {};

  // Helpers
  const istOffset = 5.5 * 60 * 60 * 1000;
  const formatISTDate = (date: Date): string => {
    const istDate = new Date(date.getTime() + istOffset);
    return `${istDate.getUTCFullYear()}-${String(
      istDate.getUTCMonth() + 1
    ).padStart(2, "0")}-${String(istDate.getUTCDate()).padStart(2, "0")}`;
  };

  const todayStr = formatISTDate(new Date());
  const yesterdayStr = formatISTDate(new Date(Date.now() - 86400000));

  // Data holders
  let todayProcessedRecords = 0;
  let todayPdfRequired = 0;
  let yesterdayProcessedRecords = 0;
  let yesterdayPdfRequired = 0;
  let completedRecords = 0;
  let pdfRequired = 0;
  let totalDuplicates = 0;
  let totalExcelRecords = 0;

  const dailyCounts: Record<string, number> = {};
  const recordsByLocation: Record<string, number> = {};
  const userRecordCounts: Record<string, number> = {};
  const duplicatesByUser: Record<string, number> = {};
  const fileStatsMap = new Map<string, FileStats>();
  const bundleDetailsMap = new Map<string, BundleDetails>();

  // --- FILE STATS ---
  for (const location in filesData) {
    for (const fileId in filesData[location]) {
      const file = filesData[location][fileId];
      totalExcelRecords += file!.content?.length || 0;
      fileStatsMap.set(file!.name, {
        fileName: file!.name,
        total: file!.content?.length || 0,
        completed: 0,
      });
    }
  }

  // --- USER MAP ---
  const userMap = new Map<string, User>(
    Object.entries(usersData).map(([id, data]) => [
      id,
      { id, ...(data as object) } as User,
    ])
  );

  // --- ACTIVE BUNDLE MAP ---
  const bundleToUserMap = new Map<string, string>();
  for (const userId in userStatesData) {
    const user = userMap.get(userId);
    const state = userStatesData[userId];
    if (user && state!.activeBundles) {
      for (const taluka in state!.activeBundles) {
        const activeBundle = state!.activeBundles[taluka];
        const uniqueBundleId = `${user.location}-${taluka}-${
          activeBundle!.bundleNo
        }`;
        bundleToUserMap.set(uniqueBundleId, userId);
      }
    }
  }

  // --- PROCESS RECORDS ---
  for (const location in processedRecordsData) {
    recordsByLocation[location] = recordsByLocation[location] || 0;
    for (const taluka in processedRecordsData[location]) {
      for (const bundleKey in processedRecordsData[location][taluka]) {
        if (!bundleKey.startsWith("bundle-")) continue;

        const bundleData = processedRecordsData[location][taluka][bundleKey];
        const bundleNo = parseInt(bundleKey.replace("bundle-", ""));
        if (isNaN(bundleNo)) continue;

        const uniqueBundleId = `${location}-${taluka}-${bundleNo}`;

        let recordsInThisBundle = 0;
        let pdfsInThisBundle = 0;
        let bundleUserName = "Unknown User";

        // Find bundle user
        const activeUserId = bundleToUserMap.get(uniqueBundleId);
        if (activeUserId) {
          bundleUserName = userMap.get(activeUserId)?.name || "Unknown User";
        } else if ((bundleData as BundleData).assignedTo) {
          bundleUserName =
            userMap.get((bundleData as BundleData).assignedTo!)?.name ||
            "Unknown User";
        }

        for (const recordId in bundleData) {
          const record = bundleData[recordId];
          if (record && typeof record === "object" && !Array.isArray(record)) {
            const r = record as RecordEntry;
            completedRecords++;
            recordsByLocation[location]++;

            if (r.processedAt) {
              const recordDate = formatISTDate(new Date(r.processedAt));
              if (!dailyCounts[recordDate]) dailyCounts[recordDate] = 0;
              dailyCounts[recordDate]++; // Increment the count for the specific date

              if (recordDate === todayStr) todayProcessedRecords++;
              if (recordDate === yesterdayStr) yesterdayProcessedRecords++;
            }

            if (r.processedBy) {
              userRecordCounts[r.processedBy] =
                (userRecordCounts[r.processedBy] || 0) + 1;
            }

            if (r.sourceFile && fileStatsMap.has(r.sourceFile)) {
              const fileStat = fileStatsMap.get(r.sourceFile);
              if (fileStat) fileStat.completed++;
            }

            const pdfKey = Object.keys(r).find(
              (k) => k.trim().toLowerCase() === "pdf required"
            );
            if (pdfKey && String(r[pdfKey]).toLowerCase() === "yes") {
              pdfRequired++;
              if (r.processedAt) {
                const recordDate = formatISTDate(new Date(r.processedAt));
                if (recordDate === todayStr) todayPdfRequired++;
                if (recordDate === yesterdayStr) yesterdayPdfRequired++;
              }
              pdfsInThisBundle++;
            }

            recordsInThisBundle++;

            if (bundleUserName === "Unknown User" && r.processedBy) {
              bundleUserName =
                userMap.get(r.processedBy)?.name || "Unknown User";
            }
          }
        }

        let status: string | null = null;
        if ((bundleData as BundleData).isForceCompleted)
          status = "Force Completed by Admin";
        else if ((bundleData as BundleData).isUserCompleted)
          status = "Completed by User";
        else if (recordsInThisBundle === 250) status = "Completed by User";

        bundleDetailsMap.set(uniqueBundleId, {
          userName: bundleUserName,
          location,
          taluka,
          bundleNo,
          recordsProcessed: recordsInThisBundle,
          pdfsRequired: pdfsInThisBundle,
          status,
        });
      }
    }
  }

  // --- DUPLICATES ---
  for (const location in duplicateRecordsData) {
    for (const taluka in duplicateRecordsData[location]) {
      for (const recordId in duplicateRecordsData[location][taluka]) {
        const record = duplicateRecordsData[location][taluka][recordId];
        if (record) {
          totalDuplicates++;
          if (record.processedBy) {
            duplicatesByUser[record.processedBy] =
              (duplicatesByUser[record.processedBy] || 0) + 1;
          }
        }
      }
    }
  }

  const duplicateLeaderboard = Object.entries(duplicatesByUser)
    .map(([userId, count]) => ({
      userName: userMap.get(userId)?.name || "Unknown User",
      duplicateCount: count,
    }))
    .sort((a, b) => b.duplicateCount - a.duplicateCount);

  const duplicateStats = { duplicateLeaderboard };

  // --- FILE STATUS ---
  const processingStatusByFile = Array.from(fileStatsMap.values()).map(
    (file) => ({
      ...file,
      pending: file.total - file.completed,
      progress:
        file.total > 0 ? Math.round((file.completed / file.total) * 100) : 0,
    })
  );

  // --- USER LEADERBOARD ---
  const userLeaderboard = Object.entries(userRecordCounts)
    .map(([userId, count]) => ({
      rank: 0,
      userName: userMap.get(userId)?.name || "Unknown User",
      recordsProcessed: count,
    }))
    .sort((a, b) => b.recordsProcessed - a.recordsProcessed)
    .map((user, idx) => ({ ...user, rank: idx + 1 }));

  // --- BUNDLE COMPLETION SUMMARY ---
  let bundleCompletionSummary = Array.from(bundleDetailsMap.values()).filter(
    (b) => b.status !== null
  );

  const handledBundles = new Set(
    bundleCompletionSummary.map(
      (b) => `${b.location}-${b.taluka}-${b.bundleNo}`
    )
  );

  for (const userId in userStatesData) {
    const user = userMap.get(userId);
    const state = userStatesData[userId];
    if (user && state!.activeBundles) {
      for (const taluka in state!.activeBundles) {
        const activeBundle = state!.activeBundles[taluka];
        const uniqueBundleId = `${user.location}-${taluka}-${
          activeBundle!.bundleNo
        }`;
        if (!handledBundles.has(uniqueBundleId)) {
          const details = bundleDetailsMap.get(uniqueBundleId);
          bundleCompletionSummary.push({
            userName: user.name || "Unknown User",
            location: user.location || "Unknown",
            taluka,
            bundleNo: activeBundle!.bundleNo,
            recordsProcessed: details
              ? details.recordsProcessed
              : activeBundle!.count || 0,
            pdfsRequired: details ? details.pdfsRequired : 0,
            status: "In Progress",
          });
        }
      }
    }
  }

  // --- TOP LEVEL STATS ---
  const topLevelStats = {
    totalExcelRecords,
    completedRecords,
    pendingRecords: totalExcelRecords - completedRecords,
    registeredUsers: Object.keys(usersData).length,
    activeBundles: Object.values(userStatesData).reduce(
      (acc: number, state: UserState) =>
        acc + Object.keys(state.activeBundles || {}).length,
      0
    ),
    pdfRequired,
    totalDuplicates,
    todayProcessedRecords,
    todayPdfRequired,
    yesterdayProcessedRecords,
    yesterdayPdfRequired,
  };

  const finalAnalytics = {
    topLevelStats,
    recordsByLocation: Object.entries(recordsByLocation).map(
      ([name, value]) => ({ name, value })
    ),
    processingStatusByFile,
    userLeaderboard,
    bundleCompletionSummary,
    duplicateStats,
    dailyCounts,
  };

  // console.log(finalAnalytics);

  await db.ref("analytics").set(finalAnalytics);
  logger.info("Full analytics recalculation complete.");
}
