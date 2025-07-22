// This interface defines the structure of a user object,
// matching the data stored in your /users path in Firebase.
export interface User {
  id: string;
  name: string;
  username: string;
  mobile: string;
  location: string;
  role: "Admin" | "User";
}

// Defines the structure of an active bundle in /userStates
export interface ActiveBundle {
  taluka: string;
  count: number;
  bundleNo: number;
}

// Defines the structure of a bundle counter in /bundleCounters
export interface BundleCounter {
  nextBundle: number;
  gaps?: number[];
}

// Defines the structure for a single processed record that will be
// saved to the /processedRecords path.
export interface ProcessedRecord {
  // These fields are added by the backend
  uniqueId: string;
  bundleNo: number;
  processedBy: string;
  processedAt: string;
  sourceFile: string;
  taluka: string; 
  // The rest of the fields are dynamic, coming from the user's input
  [key: string]: any;
}

// This block adds a new 'user' property to the global Express Request type.
// This allows us to safely attach the authenticated user's data to the
// request object in our middleware and access it in our controllers.
declare global {
  namespace Express {
    export interface Request {
      user?: {
        uid: string;
      };
    }
  }
}
