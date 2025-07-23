import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./services/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./components/Login";
import MainLayout from "./components/MainLayout"; // Import the new layout
import DashboardPage from "./components/Dashboard"; // Import the actual dashboard page
import UsersManagement from "./components/UsersManagement";
import {
  DataManagementHub,
  DataManagementPage,
  LocationFileManagement,
} from "./components/DataManagementPage";
// Import your other page components here as well
// import Analytics from './components/Analytics';
// etc...

function App() {
  return (
    <AuthProvider>
      <Router>
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
            {/* These are the child routes that will be rendered in the <Outlet /> */}
            <Route index element={<DashboardPage />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="data-management" element={<DataManagementPage />}>
              <Route index element={<DataManagementHub />} />
              <Route path=":location" element={<LocationFileManagement />} />
            </Route>
            {/* Add your other routes here */}
            {/* <Route path="data-management" element={<DataManagement />} /> */}
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
