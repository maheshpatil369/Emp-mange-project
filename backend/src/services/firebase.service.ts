import admin from "firebase-admin";
import { User } from "@/types/index";

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
