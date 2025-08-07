import { useState } from "react";
import { useAuth } from "../services/AuthContext";
import { useNavigate, Link } from "react-router-dom";

import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";

function Alert({ message }) {
  if (!message) return null;
  return (
    <div
      className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-4"
      role="alert"
      aria-live="polite"
    >
      <span className="block sm:inline">{message}</span>
    </div>
  );
}

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Your existing submit handler - NO CHANGES HERE
  // Just changed 'email' to 'username' to pass to the login function
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Pass username instead of email
      await login(username, password);
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      // Error handling logic remains the same
      switch (err.code) {
        case "auth/invalid-credential":
        case "auth/user-not-found":
        case "auth/wrong-password":
          setError("Invalid username or password. Please try again.");
          break;
        case "auth/invalid-email": // You might want to adjust this error case
          setError("The username you entered is not a valid email.");
          break;
        case "auth/user-disabled":
          setError("This account has been disabled.");
          break;
        case "auth/too-many-requests":
          setError(
            "Access to this account has been temporarily disabled due to many failed login attempts. Please try again later."
          );
          break;
        default:
          setError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // The entire JSX is replaced with the new design structure.
  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white shadow-lg rounded-xl">
        {/* Header Section with Icon */}
        <div className="text-center">
          <ShieldCheck className="mx-auto h-12 w-12 text-green-600" />
          <h2 className="mt-4 text-2xl font-bold text-gray-900">
            Admin Central
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your super admin credentials to access the dashboard.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Alert message={error} />

          {/* Username Input */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-semibold text-gray-700"
            >
              Email
            </label>
            <div className="mt-1">
              <input
                id="username"
                type="text" // Changed from email to text
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@gmail.com"
                disabled={loading}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-gray-700"
            >
              Password
            </label>
            <div className="mt-1 relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Sign In Button */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed transition"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}

export default Login;
