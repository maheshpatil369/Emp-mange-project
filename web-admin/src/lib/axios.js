import axios from "axios";
import { auth } from "../firebase";

// Create a new Axios instance with the base URL of our backend API.
// We get this URL from our environment variables.
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Use an "interceptor" to run code before each request is sent.
// This is the perfect place to add the authentication token.
apiClient.interceptors.request.use(
  async (config) => {
    // Get the currently logged-in user from Firebase auth.
    const user = auth.currentUser;

    // If a user is logged in, get their ID token.
    if (user) {
      const token = await user.getIdToken();
      // Set the Authorization header for the request.
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Return the modified config to be sent.
    return config;
  },
  (error) => {
    // Handle any errors that occur during the request setup.
    return Promise.reject(error);
  }
);

export default apiClient;
