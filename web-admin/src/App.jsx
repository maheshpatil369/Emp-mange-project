// import React from "react";
// import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
// import { AuthProvider } from "./services/AuthContext";
// import ProtectedRoute from "./components/ProtectedRoute";
// import Login from "./components/Login";
// import MainLayout from "./components/MainLayout"; // Import the new layout
// import DashboardPage from "./components/Dashboard"; // Import the actual dashboard page
// import UsersManagement from "./components/UsersManagement";
// import {
//   DataManagementHub,
//   DataManagementPage,
//   LocationFileManagement,
// } from "./components/DataManagementPage";
// // Import your other page components here as well
// import Analytics from "./components/Analytics";
// // etc...

// function App() {
//   return (
//     <AuthProvider>
//       <Router>
//         <Routes>
//           <Route path="/login" element={<Login />} />

//           {/* Protected Routes */}
//           <Route
//             path="/"
//             element={
//               <ProtectedRoute>
//                 <MainLayout />
//               </ProtectedRoute>
//             }
//           >
//             {/* These are the child routes that will be rendered in the <Outlet /> */}
//             <Route index element={<DashboardPage />} />
//             <Route path="users" element={<UsersManagement />} />
//             <Route path="data-management" element={<DataManagementPage />}>
//               <Route index element={<DataManagementHub />} />
//               <Route path=":location" element={<LocationFileManagement />} />
//             </Route>
//             {/* Add your other routes here */}
//             <Route path="analytics" element={<Analytics />} />
//           </Route>
//         </Routes>
//       </Router>
//     </AuthProvider>
//   );
// }

// export default App;



import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./services/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./components/Login";
import MainLayout from "./components/MainLayout"; 
import DashboardPage from "./components/Dashboard"; 
import UsersManagement from "./components/UsersManagement";
import {
  DataManagementHub,
  DataManagementPage,
  LocationFileManagement,
} from "./components/DataManagementPage";
import Analytics from "./components/Analytics";

// ✅ Import react-hot-toast
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" reverseOrder={false} />
        
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="data-management" element={<DataManagementPage />}>
              <Route index element={<DataManagementHub />} />
              <Route path=":location" element={<LocationFileManagement />} />
            </Route>
            <Route path="analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
