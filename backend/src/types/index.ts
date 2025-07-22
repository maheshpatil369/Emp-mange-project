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
