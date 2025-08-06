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
