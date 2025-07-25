// // src/pages/Login.jsx

// import React, { useState } from "react";
// import { useAuth } from "../services/AuthContext";
// import { useNavigate } from "react-router-dom";

// // A reusable and enhanced input field component
// function InputField({
//   id,
//   label,
//   type = "text",
//   value,
//   onChange,
//   placeholder,
//   disabled,
//   children,
// }) {
//   return (
//     <div className="mb-4">
//       <label
//         htmlFor={id}
//         className="block text-gray-700 text-sm font-bold mb-2"
//       >
//         {label}
//       </label>
//       <div className="relative">
//         <input
//           id={id}
//           type={type}
//           value={value}
//           onChange={onChange}
//           placeholder={placeholder}
//           disabled={disabled}
//           required
//           className="shadow-sm appearance-none border rounded w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-indigo-500 transition duration-150 ease-in-out"
//         />
//         {/* For placing icons like the password visibility toggle */}
//         <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
//           {children}
//         </div>
//       </div>
//     </div>
//   );
// }

// // A simple, reusable alert component
// function Alert({ message }) {
//   if (!message) return null;
//   return (
//     <div
//       className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
//       role="alert"
//       aria-live="polite"
//     >
//       <span className="block sm:inline">{message}</span>
//     </div>
//   );
// }

// // A simple loading spinner
// export function Spinner() {
//   return (
//     <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
//   );
// }

// // --- ICONS ---
// // 1. Import desired icons directly from lucide-react
// import { Eye, EyeOff, Loader2 } from "lucide-react";

// function Login() {
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const { login } = useAuth();
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       await login(email, password);
//       navigate("/");
//     } catch (err) {
//       console.error("Login error:", err);
//       switch (err.code) {
//         case "auth/invalid-credential":
//         case "auth/user-not-found":
//         case "auth/wrong-password":
//           setError("Invalid email or password. Please try again.");
//           break;
//         case "auth/invalid-email":
//           setError("The email address you entered is not valid.");
//           break;
//         case "auth/user-disabled":
//           setError("This account has been disabled.");
//           break;
//         case "auth/too-many-requests":
//           setError(
//             "Access to this account has been temporarily disabled due to many failed login attempts. Please try again later."
//           );
//           break;
//         default:
//           setError("An unexpected error occurred. Please try again.");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <main className="flex items-center justify-center min-h-screen bg-gray-100">
//       <div className="w-full max-w-md p-8 space-y-6 bg-white shadow-lg rounded-xl">
//         <h2 className="text-3xl font-bold text-center text-gray-900">
//           Admin Sign In
//         </h2>

//         <form onSubmit={handleSubmit} className="mt-4 space-y-4">
//           <Alert message={error} />

//           <InputField
//             id="email"
//             label="Email Address"
//             type="email"
//             value={email}
//             onChange={(e) => setEmail(e.target.value)}
//             placeholder="admin@example.com"
//             disabled={loading}
//           />

//           <InputField
//             id="password"
//             label="Password"
//             type={showPassword ? "text" : "password"}
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             placeholder="••••••••"
//             disabled={loading}
//           >
//             {/* 2. Use the imported Lucide icons */}
//             <button
//               type="button"
//               onClick={() => setShowPassword(!showPassword)}
//               className="focus:outline-none"
//               aria-label={showPassword ? "Hide password" : "Show password"}
//             >
//               {showPassword ? (
//                 <EyeOff size={20} className="text-gray-500" />
//               ) : (
//                 <Eye size={20} className="text-gray-500" />
//               )}
//             </button>
//           </InputField>

//           <button
//             type="submit"
//             className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
//             disabled={loading}
//           >
//             {/* 3. Use the Lucide loader and animate it with Tailwind */}
//             {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
//           </button>
//         </form>
//       </div>
//     </main>
//   );
// }

// export default Login;




// src/pages/Login.jsx

import React, { useState } from "react";
// Assuming useAuth and useNavigate are still needed for functionality
import { useAuth } from "../services/AuthContext";
import { useNavigate, Link } from "react-router-dom";

// --- ICONS ---
// Replaced unused icons with the new shield icon
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";

// A simple, reusable alert component for displaying errors.
// The styling is kept from your original file.
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
  // Your existing state and logic - NO CHANGES HERE
  // Changed 'email' state to 'username' to match the new UI label
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
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700">
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
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700">
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

        {/* Secondary Action Button */}
        <div className="text-center">
            <button
                type="button"
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition"
            >
                Switch to User Login
            </button>
        </div>
      </div>
    </main>
  );
}

export default Login;