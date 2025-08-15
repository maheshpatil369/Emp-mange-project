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
  const userProfileRef = db.ref(`users/${userRecord.uid}`);

  const profileData = {
    name: userData.name,
    username: userData.username,
    mobile: userData.mobile,
    location: userData.location,
    role: userData.role,
    excelFile: userData.excelFile || null,
    canDownloadFiles: true,
  };

  await userProfileRef.set(profileData);
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

  await newFileRef.set(dataToSave);

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
  const userProfileRef = db.ref(`users/${userId}`);

  // Update profile in Realtime Database
  await userProfileRef.update(updates);

  // Update corresponding data in Firebase Auth
  await admin.auth().updateUser(userId, {
    displayName: updates.name,
  });
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
  const userProfileRef = db.ref(`users/${userId}`);
  await userProfileRef.remove();
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

/**
 * Generates a unique ID prefix based on location and taluka names.
 * Example: "chhatrapati-sambhajinagar", "Paithan" -> "CSPA"
 * @param location - The location name.
 * @param taluka - The taluka name.
 * @returns A 4-letter prefix string.
 */
// function generateIdPrefix(location: string, taluka: string): string {
//   const locationPrefix = location.substring(0, 2).toUpperCase();
//   const talukaPrefix = taluka.substring(0, 2).toUpperCase();
//   return `${locationPrefix}${talukaPrefix}`;
// }

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

// export async function saveProcessedRecordsToDB(
//   userId: string,
//   location: string,
//   taluka: string,
//   bundleNo: number,
//   records: any[],
//   sourceFile: string
// ): Promise<void> {
//   const db = admin.database();

//   // --- VALIDATION CHECKS ---
//   if (records.length > 250) {
//     throw new Error("Cannot sync more than 250 records at a time.");
//   }

//   // const recordsRef = db.ref(
//   //   `processedRecords/${location}/${taluka}/bundle-${bundleNo}`
//   // );

//   // const snapshot = await recordsRef.once("value");
//   // let currentRecordCount = 0;
//   // if (snapshot.exists()) {
//   //   const bundleData = snapshot.val();
//   //   for (const key in bundleData) {
//   //     if (bundleData[key] && typeof bundleData[key] === "object") {
//   //       currentRecordCount++;
//   //     }
//   //   }
//   // }

//   // if (currentRecordCount >= 250) {
//   //   throw new Error(`Bundle #${bundleNo} is already full and cannot accept new records.`);
//   // }

//   // const remainingCapacity = 250 - currentRecordCount;
//   // if (records.length > remainingCapacity) {
//   //   throw new Error(
//   //     `Cannot add ${records.length} records. Bundle #${bundleNo} only has capacity for ${remainingCapacity} more records.`
//   //   );
//   // }

//   const idCounterRef = db.ref(`idCounters/${location}/${taluka}`);
//   const updates: { [key: string]: any } = {};
//   let newRecordsCount = 0;
//   const seenInThisBatch = new Set();
//   const duplicateRecordsToSave: any[] = [];

//   for (const record of records) {
//     const intimationNoKey = Object.keys(record).find(
//       (k) => k.trim().toLowerCase() === "intimation no"
//     );
//     const intimationNo = intimationNoKey ? record[intimationNoKey] : null;

//     if (intimationNo) {
//       // Check for duplicates within the current batch
//       if (seenInThisBatch.has(intimationNo)) {
//         logger.warn(`Duplicate within batch for Intimation No: ${intimationNo}.`);
//         duplicateRecordsToSave.push({ ...record, reason: "Duplicate within same batch" });
//         continue;
//       }

//       // Check for duplicates against the database index
//       const indexRef = db.ref(`/intimationNoIndex/${intimationNo}`);
//       const snapshot = await indexRef.once("value");

//       if (snapshot.exists()) {
//         logger.warn(`Duplicate in DB for Intimation No: ${intimationNo}.`);
//         const originalRecordId = snapshot.val();
//         duplicateRecordsToSave.push({ ...record, reason: `Duplicate of existing record: ${originalRecordId}` });
//         continue;
//       }
//     }

//     // If we reach here, the record is unique
//     if (intimationNo) {
//       seenInThisBatch.add(intimationNo);
//     }

//     // Generate a unique ID for the new record
//     const { snapshot: idSnapshot } = await idCounterRef.transaction(
//       (currentData: { lastId: number } | null) => {
//         if (currentData === null) { return { lastId: 1 }; }
//         currentData.lastId++;
//         return currentData;
//       }
//     );

//     const newId = idSnapshot.val().lastId;
//     const prefix = generateIdPrefix(location, taluka);
//     const uniqueId = `${prefix}${newId}`;

//     // Prepare the new record to be saved
//     const newRecord: ProcessedRecord = {
//       ...record,
//       uniqueId: uniqueId,
//       bundleNo: bundleNo,
//       processedBy: userId,
//       processedAt: new Date().toISOString(),
//       sourceFile: sourceFile,
//       taluka: taluka,
//     };

//     // Add the new record and its index entry to the updates object
//     const recordPath = `/processedRecords/${location}/${taluka}/bundle-${bundleNo}/${uniqueId}`;
//     updates[recordPath] = newRecord;

//     if (intimationNo) {
//       const indexPath = `/intimationNoIndex/${intimationNo}`;
//       updates[indexPath] = uniqueId; // Store the uniqueId in the index
//     }

//     newRecordsCount++;
//   }

//   // Process and prepare any found duplicates for saving
//   if (duplicateRecordsToSave.length > 0) {
//     const duplicatesRef = db.ref(`/duplicateRecords/${location}/${taluka}`);
//     duplicateRecordsToSave.forEach(dup => {
//       const newDuplicateKey = duplicatesRef.push().key;
//       const duplicateData = {
//         ...dup, // The full original data of the duplicate record
//         submittedBy: userId,
//         submittedAt: new Date().toISOString(),
//         sourceBundleNo: bundleNo,
//       };
//       updates[`/duplicateRecords/${location}/${taluka}/${newDuplicateKey}`] = duplicateData;
//     });
//   }

//   // Atomically save all unique records, index entries, and duplicate records
//   if (Object.keys(updates).length > 0) {
//     await db.ref().update(updates);
//   }

//   // If new unique records were saved, increment the user's active bundle count
//   if (newRecordsCount > 0) {
//     const userStateCountRef = db.ref(
//       `userStates/${userId}/activeBundles/${taluka}/count`
//     );
//     await userStateCountRef.set(
//       admin.database.ServerValue.increment(newRecordsCount)
//     );
//   } else {
//     logger.info("No new unique records to save in this batch.");
//   }
// }

// export async function saveProcessedRecordsToDB(
//   userId: string,
//   location: string,
//   taluka: string,
//   bundleNo: number,
//   records: any[],
//   sourceFile: string
// ): Promise<void> {
//   const db = admin.database();

//   // --- VALIDATION CHECKS ---
//   if (records.length > 250) {
//     throw new Error("Cannot sync more than 250 records at a time.");
//   }

//   const idCounterRef = db.ref(`idCounters/${location}/${taluka}`);
//   const updates: { [key: string]: any } = {};
//   let newRecordsCount = 0;
//   const seenInThisBatch = new Set();
//   const duplicateRecordsToSave: any[] = [];

//   for (const record of records) {
//     const intimationNoKey = Object.keys(record).find(
//       (k) => k.trim().toLowerCase() === "intimation no"
//     );
//     const intimationNo = intimationNoKey ? record[intimationNoKey] : null;

//     if (intimationNo) {
//       // Check for duplicates within the current batch
//       if (seenInThisBatch.has(intimationNo)) {
//         logger.warn(`Duplicate within batch for Intimation No: ${intimationNo}.`);
//         duplicateRecordsToSave.push({ ...record, reason: "Duplicate within same batch" });
//         // continue; // <-- REMOVED: By removing 'continue', the record will still be processed normally.
//       }

//       // Check for duplicates against the database index
//       const indexRef = db.ref(`/intimationNoIndex/${intimationNo}`);
//       const snapshot = await indexRef.once("value");

//       if (snapshot.exists()) {
//         logger.warn(`Duplicate in DB for Intimation No: ${intimationNo}.`);
//         const originalRecordId = snapshot.val();
//         duplicateRecordsToSave.push({ ...record, reason: `Duplicate of existing record: ${originalRecordId}` });
//         // continue; // <-- REMOVED: By removing 'continue', the record will still be processed normally.
//       }
//     }

//     // If we reach here, the record is unique (or we are intentionally allowing duplicates)
//     if (intimationNo) {
//       seenInThisBatch.add(intimationNo);
//     }

//     // Generate a unique ID for the new record
//     const { snapshot: idSnapshot } = await idCounterRef.transaction(
//       (currentData: { lastId: number } | null) => {
//         if (currentData === null) { return { lastId: 1 }; }
//         currentData.lastId++;
//         return currentData;
//       }
//     );

//     const newId = idSnapshot.val().lastId;
//     const prefix = generateIdPrefix(location, taluka);
//     const uniqueId = `${prefix}${newId}`;

//     // Prepare the new record to be saved
//     const newRecord: ProcessedRecord = {
//       ...record,
//       uniqueId: uniqueId,
//       bundleNo: bundleNo,
//       processedBy: userId,
//       processedAt: new Date().toISOString(),
//       sourceFile: sourceFile,
//       taluka: taluka,
//     };

//     // Add the new record and its index entry to the updates object
//     const recordPath = `/processedRecords/${location}/${taluka}/bundle-${bundleNo}/${uniqueId}`;
//     updates[recordPath] = newRecord;

//     if (intimationNo) {
//       const indexPath = `/intimationNoIndex/${intimationNo}`;
//       updates[indexPath] = uniqueId; // Store the uniqueId in the index
//     }

//     newRecordsCount++;
//   }

//   // Process and prepare any found duplicates for saving
//   // This block now runs alongside saving all records to the main path.
//   if (duplicateRecordsToSave.length > 0) {
//     const duplicatesRef = db.ref(`/duplicateRecords/${location}/${taluka}`);
//     duplicateRecordsToSave.forEach(dup => {
//       const newDuplicateKey = duplicatesRef.push().key;
//       const duplicateData = {
//         ...dup, // The full original data of the duplicate record
//         submittedBy: userId,
//         submittedAt: new Date().toISOString(),
//         sourceBundleNo: bundleNo,
//       };
//       updates[`/duplicateRecords/${location}/${taluka}/${newDuplicateKey}`] = duplicateData;
//     });
//   }

//   // Atomically save all records (including duplicates) to processedRecords,
//   // their index entries, AND the separate duplicate records path.
//   if (Object.keys(updates).length > 0) {
//     await db.ref().update(updates);
//   }

//   // If new records were saved, increment the user's active bundle count
//   if (newRecordsCount > 0) {
//     const userStateCountRef = db.ref(
//       `userStates/${userId}/activeBundles/${taluka}/count`
//     );
//     await userStateCountRef.set(
//       admin.database.ServerValue.increment(newRecordsCount)
//     );
//   } else {
//     logger.info("No new records to save in this batch.");
//   }
// }

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

export async function saveProcessedRecordsToDB(
  userId: string,
  location: string,
  taluka: string,
  bundleNo: number,
  records: any[],
  sourceFile: string
): Promise<void> {
  const db = admin.database();

  // --- VALIDATE ACTIVE BUNDLE ---
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

  for (const record of records) {
    // --- FIND UNIQUE ID ---
    const uniqueIdKey = Object.keys(record).find(
      (k) =>
        k
          .trim()
          .toLowerCase()
          .replace(/[\s_-]/g, "") === "uniqueid"
    );

    if (!uniqueIdKey || !record[uniqueIdKey]) {
      logger.error("A record in the batch is missing its unique ID.", {
        record,
      });
      throw new Error(`A record in the batch is missing its unique ID.`);
    }
    const uniqueId = record[uniqueIdKey];

    // --- DUPLICATE CHECKING ---
    let isDuplicate = false;
    const intimationNoKey = Object.keys(record).find(
      (k) => k.trim().toLowerCase() === "intimation no"
    );
    const intimationNo = intimationNoKey ? record[intimationNoKey] : null;

    if (intimationNo) {
      if (seenIntimationNos.has(intimationNo)) {
        isDuplicate = true;
        logger.warn(
          `Duplicate within batch for Intimation No: ${intimationNo}.`
        );
      } else {
        seenIntimationNos.add(intimationNo);
      }

      if (!isDuplicate) {
        const snapshot = await db
          .ref(`/intimationNoIndex/${intimationNo}`)
          .once("value");
        if (snapshot.exists()) {
          isDuplicate = true;
          const originalRecordId = snapshot.val();
          logger.warn(
            `Duplicate in DB for Intimation No: ${intimationNo}. Original ID: ${originalRecordId}`
          );
        }
      }
    }

    // --- PREPARE RECORD ---
    const newRecord: ProcessedRecord = {
      ...record,
      bundleNo,
      processedBy: userId,
      processedAt: new Date().toISOString(),
      sourceFile,
      taluka,
    };

    // Always save to processedRecords
    const recordPath = `/processedRecords/${location}/${taluka}/bundle-${bundleNo}/${uniqueId}`;
    updates[recordPath] = newRecord;

    // Maintain intimationNo index
    if (intimationNo) {
      updates[`/intimationNoIndex/${intimationNo}`] = uniqueId;
    }

    // Save duplicates separately
    if (isDuplicate) {
      const duplicatesRef = db.ref(`/duplicateRecords/${location}/${taluka}`);
      const newDuplicateKey = duplicatesRef.push().key;
      updates[`/duplicateRecords/${location}/${taluka}/${newDuplicateKey}`] = {
        ...newRecord,
        reason: "Duplicate record",
      };
    }

    // --- COUNT PROTECTION: Only count if not already in processedRecords ---
    const existingRecordSnap = await db.ref(recordPath).once("value");
    if (!existingRecordSnap.exists()) {
      countToIncrement++;
    }
  }

  // --- APPLY ALL UPDATES ---
  if (Object.keys(updates).length > 0) {
    await db.ref().update(updates);
  }

  // --- INCREMENT USER'S BUNDLE COUNT ---
  if (countToIncrement > 0) {
    const userStateCountRef = db.ref(
      `userStates/${userId}/activeBundles/${taluka}/count`
    );
    await userStateCountRef.set(
      admin.database.ServerValue.increment(countToIncrement)
    );
  } else {
    logger.info("No new unique records to increase count for.");
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

  const recordPath = `/processedRecords/${location}/${taluka}/bundle-${bundleNo}`;
  updates[`${recordPath}/isForceCompleted`] = true;
  updates[`${recordPath}/forceCompletedBy`] = "admin";
  updates[`${recordPath}/assignedTo`] = userId;

  const userStateRef = db.ref(`userStates/${userId}/activeBundles/${taluka}`);
  const activeBundleSnapshot = await userStateRef.once("value");

  if (activeBundleSnapshot.exists()) {
    const activeBundle: ActiveBundle = activeBundleSnapshot.val();

    // --- THIS IS THE FIX ---
    // Convert both values to numbers to prevent type mismatch errors (e.g., 1 === "1").
    if (Number(activeBundle.bundleNo) === Number(bundleNo)) {
      updates[`/userStates/${userId}/activeBundles/${taluka}`] = null;
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

  // Step 1: Assign the bundle to the user.
  const newBundle: ActiveBundle = {
    bundleNo: bundleNo,
    count: 0,
    taluka: taluka,
  };
  await userStateRef.set(newBundle);

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
  recordsByLocation: { name: string; value: number }[]; // Added this line
}

export async function getDashboardSummaryFromDB(): Promise<DashboardSummary> {
  const db = admin.database();

  const [
    usersSnapshot,
    filesSnapshot,
    processedRecordsSnapshot,
    activeBundlesSnapshot,
  ] = await Promise.all([
    db.ref("users").once("value"),
    db.ref("files").once("value"),
    db.ref("processedRecords").once("value"),
    db.ref("userStates").once("value"),
  ]);

  const registeredUsers = usersSnapshot.exists()
    ? usersSnapshot.numChildren()
    : 0;

  let totalExcelRecords = 0;
  if (filesSnapshot.exists()) {
    const filesData = filesSnapshot.val();
    for (const location in filesData) {
      for (const fileId in filesData[location]) {
        totalExcelRecords += filesData[location][fileId].content?.length || 0;
      }
    }
  }

  let completedRecords = 0;
  let pdfsRequired = 0;
  const dailyCounts: Record<string, number> = {};

  // --- NEW: Object to hold counts for each location ---
  const locationCounts: Record<string, number> = {};

  if (processedRecordsSnapshot.exists()) {
    const recordsData = processedRecordsSnapshot.val();
    for (const location in recordsData) {
      for (const taluka in recordsData[location]) {
        for (const bundle in recordsData[location][taluka]) {
          const recordsInBundle = recordsData[location][taluka][bundle];
          for (const recordId in recordsInBundle) {
            const record = recordsInBundle[recordId];
            if (record && typeof record === "object") {
              completedRecords++;

              // --- NEW: Increment the count for the current location ---
              locationCounts[location] = (locationCounts[location] || 0) + 1;

              if (
                record.processedAt &&
                typeof record.processedAt === "string"
              ) {
                const date = record.processedAt.split("T")[0];
                dailyCounts[date] = (dailyCounts[date] || 0) + 1;
              }

              const pdfKey = Object.keys(record).find(
                (k) => k.trim().toLowerCase() === "pdf required"
              );
              if (
                pdfKey &&
                typeof record[pdfKey] === "string" &&
                record[pdfKey].toLowerCase() === "yes"
              ) {
                pdfsRequired++;
              }
            }
          }
        }
      }
    }
  }

  const recordsProcessedByDate = Object.keys(dailyCounts)
    .map((date) => ({
      date: date,
      count: dailyCounts[date]!,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // --- NEW: Format the locationCounts object for the frontend chart ---
  const recordsByLocation = Object.keys(locationCounts).map((locationSlug) => ({
    // Capitalize the first letter for a nice display name, e.g., "ahilyanagar" -> "Ahilyanagar"
    name: locationSlug.charAt(0).toUpperCase() + locationSlug.slice(1),
    value: locationCounts[locationSlug]!,
  }));

  let activeBundles = 0;
  if (activeBundlesSnapshot.exists()) {
    const userStates = activeBundlesSnapshot.val();
    for (const userId in userStates) {
      activeBundles += Object.keys(
        userStates[userId].activeBundles || {}
      ).length;
    }
  }

  return {
    totalExcelRecords,
    completedRecords,
    pendingRecords: totalExcelRecords - completedRecords,
    registeredUsers,
    activeBundles,
    pdfsRequired,
    recordsProcessedByDate,
    recordsByLocation, // <-- Added the final data here
  };
}

/**
 * Gathers and computes all data needed for the entire Analytics page.
 * This is an expensive operation as it processes all data in the database.
 * @param filters - Optional filters for the bundle summary.
 * @returns An object containing all aggregated analytics data.
 */
export async function getAnalyticsDataFromDB(filters: {
  location?: string;
  taluka?: string;
}) {
  const db = admin.database();

  // 1. FETCH ALL DATA SOURCES IN PARALLEL
  const [
    usersSnapshot,
    filesSnapshot,
    processedRecordsSnapshot,
    userStatesSnapshot,
    duplicateRecordsSnapshot,
  ] = await Promise.all([
    db.ref("users").once("value"),
    db.ref("files").once("value"),
    db.ref("processedRecords").once("value"),
    db.ref("userStates").once("value"),
    db.ref("duplicateRecords").once("value"),
  ]);

  const usersData = usersSnapshot.val() || {};
  const filesData = filesSnapshot.val() || {};
  const processedRecordsData = processedRecordsSnapshot.val() || {};
  const userStatesData = userStatesSnapshot.val() || {};
  const duplicateRecordsData = duplicateRecordsSnapshot.val() || {};

  // Add these before the big `for (const location in processedRecordsData)` loop
  let todayProcessedRecords = 0;
  let todayPdfRequired = 0;
  const todayDate = new Date().toISOString().split("T")[0]; // YYYY-MM-DD 

  // console.log("--- FULL USER STATES DATA ---", JSON.stringify(userStatesData, null, 2));

  // 2. PREPARE HELPER MAPS
  const usersList: User[] = Object.keys(usersData).map((key) => ({
    id: key,
    ...usersData[key],
  }));
  const userMap = new Map(usersList.map((u) => [u.id, u]));

  const bundleToUserMap = new Map();
  for (const userId in userStatesData) {
    const user = userMap.get(userId);
    if (user && userStatesData[userId].activeBundles) {
      for (const taluka in userStatesData[userId].activeBundles) {
        const activeBundle = userStatesData[userId].activeBundles[taluka];
        const uniqueBundleId = `${user.location}-${taluka}-${activeBundle.bundleNo}`;
        bundleToUserMap.set(uniqueBundleId, userId);
      }
    }
  }

  const bundleLocationMap = new Map();
  for (const location in processedRecordsData) {
    for (const taluka in processedRecordsData[location]) {
      for (const bundleKey in processedRecordsData[location][taluka]) {
        const bundleNo = parseInt(bundleKey.replace("bundle-", ""));
        const lookupKey = `${taluka}-${bundleNo}`;
        bundleLocationMap.set(lookupKey, location);
      }
    }
  }

  let totalExcelRecords = 0;
  const fileStatsMap = new Map();
  for (const location in filesData) {
    for (const fileId in filesData[location]) {
      const file = filesData[location][fileId];
      totalExcelRecords += file.content?.length || 0;
      fileStatsMap.set(file.name, {
        fileName: file.name,
        total: file.content?.length || 0,
        completed: 0,
      });
    }
  }

  // 3. PROCESS ALL RECORDS IN A SINGLE PASS
  let completedRecords = 0;
  let pdfRequired = 0;
  const recordsByLocation: { [location: string]: number } = {};
  const userRecordCounts: { [userId: string]: number } = {};
  const bundleDetailsMap = new Map();

  for (const location in processedRecordsData) {
    recordsByLocation[location] = recordsByLocation[location] || 0;
    for (const taluka in processedRecordsData[location]) {
      for (const bundleKey in processedRecordsData[location][taluka]) {
        const bundleData = processedRecordsData[location][taluka][bundleKey];
        const bundleNo = parseInt(bundleKey.replace("bundle-", ""));
        const uniqueBundleId = `${location}-${taluka}-${bundleNo}`;

        let recordsInThisBundle = 0;
        let pdfsInThisBundle = 0;
        let bundleUserName = "Unknown User";

        // --- FINAL, ROBUST USERNAME LOGIC ---
        // Strategy 1: Check active bundles.
        const activeUserId = bundleToUserMap.get(uniqueBundleId);
        if (activeUserId) {
          bundleUserName = userMap.get(activeUserId)?.name || "Unknown User";
        }

        // Strategy 2: Check for the permanently stored 'assignedTo' field.
        else if (bundleData.assignedTo) {
          bundleUserName =
            userMap.get(bundleData.assignedTo)?.name || "Unknown User";
        }

        for (const recordId in bundleData) {
          const record = bundleData[recordId];
          if (record && typeof record === "object") {
            completedRecords++;
            recordsByLocation[location]++;

             if (record.processedAt) { // change to your actual date field name
              const recordDate = new Date(record.processedAt).toISOString().split("T")[0];
              if (recordDate === todayDate) {
                todayProcessedRecords++;
              }
            }

            if (record.processedBy) {
              userRecordCounts[record.processedBy] =
                (userRecordCounts[record.processedBy] || 0) + 1;
            }
            if (record.sourceFile && fileStatsMap.has(record.sourceFile)) {
              fileStatsMap.get(record.sourceFile).completed++;
            }
            const pdfKey = Object.keys(record).find(
              (k) => k.trim().toLowerCase() === "pdf required"
            );
            if (
              pdfKey &&
              typeof record[pdfKey] === "string" &&
              record[pdfKey].toLowerCase() === "yes"
            ) {
              pdfRequired++;

               if (record.processedAt) {
                const recordDate = new Date(record.processedAt).toISOString().split("T")[0];
                if (recordDate === todayDate) {
                  todayPdfRequired++;
                }
              }

              pdfsInThisBundle++;
            }
            recordsInThisBundle++;

            // Strategy 3: Fallback for older data.
            if (bundleUserName === "Unknown User" && record.processedBy) {
              bundleUserName =
                userMap.get(record.processedBy)?.name || "Unknown User";
            }
          }
        }

        let status = null;
        if (bundleData.isForceCompleted) status = "Force Completed by Admin";
        else if (bundleData.isUserCompleted) status = "Completed by User";
        else if (recordsInThisBundle === 250) status = "Completed by User";

        bundleDetailsMap.set(uniqueBundleId, {
          userName: bundleUserName,
          location,
          taluka,
          bundleNo,
          recordsProcessed: recordsInThisBundle,
          pdfsRequired: pdfsInThisBundle,
          status: status,
        });
      }
    }
  }

  let totalDuplicates = 0;
  const duplicatesByUser: { [userId: string]: number } = {};

  if (duplicateRecordsSnapshot.exists()) {
    for (const location in duplicateRecordsData) {
      for (const taluka in duplicateRecordsData[location]) {
        for (const recordId in duplicateRecordsData[location][taluka]) {
          const duplicateRecord =
            duplicateRecordsData[location][taluka][recordId];
          if (duplicateRecord) {
            totalDuplicates++;
            if (duplicateRecord.processedBy) {
              duplicatesByUser[duplicateRecord.processedBy] =
                (duplicatesByUser[duplicateRecord.processedBy] || 0) + 1;
            }
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

  const duplicateStats = {
    duplicateLeaderboard,
  };

  // 4. ASSEMBLE FINAL DATA STRUCTURES
  const topLevelStats = {
    totalExcelRecords,
    completedRecords,
    pendingRecords: totalExcelRecords - completedRecords,
    registeredUsers: usersList.length,
    activeBundles: Object.values(userStatesData).reduce(
      (acc: number, state: any) =>
        acc + Object.keys(state.activeBundles || {}).length,
      0
    ),
    pdfRequired,
    totalDuplicates,
    todayProcessedRecords,
    todayPdfRequired
  };

  let bundleCompletionSummary = Array.from(bundleDetailsMap.values()).filter(
    (b) => b.status !== null
  );
  const handledBundles = new Set(
    bundleCompletionSummary.map(
      (b) => `${b.location}-${b.taluka}-${b.bundleNo}`
    )
  );
  // MODIFIED 'userStates' loop
  for (const userId in userStatesData) {
    const user = userMap.get(userId);
    if (user && userStatesData[userId].activeBundles) {
      for (const taluka in userStatesData[userId].activeBundles) {
        const activeBundle = userStatesData[userId].activeBundles[taluka];

        // --- Start of new logic ---
        // 1. Find the bundle's true location from our new map
        const lookupKey = `${taluka}-${activeBundle.bundleNo}`;
        const trueLocation = bundleLocationMap.get(lookupKey);

        // 2. If we found a true location, use it. If not, fall back to the user's location.
        const finalLocation = trueLocation || user.location;

        // 3. Build the correct ID to look up details
        const uniqueBundleId = `${finalLocation}-${taluka}-${activeBundle.bundleNo}`;
        // --- End of new logic ---

        if (!handledBundles.has(uniqueBundleId)) {
          const details = bundleDetailsMap.get(uniqueBundleId);
          bundleCompletionSummary.push({
            userName: user.name,
            location: finalLocation, // Use the final, corrected location
            taluka,
            bundleNo: activeBundle.bundleNo,
            recordsProcessed: details
              ? details.recordsProcessed
              : activeBundle.count || 0,
            pdfsRequired: details ? details.pdfsRequired : 0,
            status: "In Progress",
          });
        }
      }
    }
  }
  const processingStatusByFile = Array.from(fileStatsMap.values()).map(
    (file) => ({
      ...file,
      pending: file.total - file.completed,
      progress:
        file.total > 0 ? Math.round((file.completed / file.total) * 100) : 0,
    })
  );

  const userLeaderboard = Object.entries(userRecordCounts)
    .map(([userId, count]) => ({
      rank: 0,
      userName: userMap.get(userId)?.name || "Unknown User",
      recordsProcessed: count,
    }))
    .sort((a, b) => b.recordsProcessed - a.recordsProcessed)
    .map((user, index) => ({ ...user, rank: index + 1 }));

  // 5. APPLY FILTERS AND RETURN
  if (filters.location) {
    bundleCompletionSummary = bundleCompletionSummary.filter(
      (b) => b.location === filters.location
    );
  }
  if (filters.taluka) {
    bundleCompletionSummary = bundleCompletionSummary.filter(
      (b) => b.taluka === filters.taluka
    );
  }

  return {
    topLevelStats,
    recordsByLocation: Object.entries(recordsByLocation).map(
      ([name, value]) => ({ name, value })
    ),
    processingStatusByFile,
    userLeaderboard,
    bundleCompletionSummary,
    duplicateStats,
  };
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

  await userStateRef.remove();
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

  await fileRef.remove();
}
