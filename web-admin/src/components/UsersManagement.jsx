// File: src/components/UsersManagement.jsx

import React, { useState, useEffect } from "react";
import { PlusCircle, Loader2, AlertTriangle, Edit, Trash2 } from "lucide-react";
import apiClient from "../lib/axios";

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Function to fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/users");
      setUsers(response.data);
    } catch (err) {
      setError("Failed to fetch users.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        <p className="ml-2 text-gray-600">Loading Users...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-600 bg-red-50 p-4 rounded-lg">
        <AlertTriangle className="w-6 h-6 mr-2" /> {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Create New User
        </button>
      </div>

      {/* User Table */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned Excel
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.mobile}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.excelFile || "N/A"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button className="text-indigo-600 hover:text-indigo-900">
                      <Edit className="w-5 h-5" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <CreateUserModal
          closeModal={() => setIsModalOpen(false)}
          onUserCreated={fetchUsers}
        />
      )}
    </div>
  );
};

// --- Create User Modal Component ---
const CreateUserModal = ({ closeModal, onUserCreated }) => {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    mobile: "",
    location: "",
    password: "",
    excelFile: "",
    role: "User",
  });
  const [locations, setLocations] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch locations on modal mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await apiClient.get("/data/config");
        setLocations(response.data.locations || []);
      } catch (err) {
        console.error("Failed to fetch config", err);
        setError("Could not load locations.");
      }
    };
    fetchConfig();
  }, []);

  // Fetch files when location changes
  useEffect(() => {
    if (formData.location) {
      const fetchFiles = async () => {
        try {
          setFiles([]); // Reset files list
          setFormData((prev) => ({ ...prev, excelFile: "" })); // Reset selected file
          const response = await apiClient.get(
            `/data/files/${formData.location}`
          );
          setFiles(response.data || []);
        } catch (err) {
          console.error("Failed to fetch files", err);
          setError(`Could not load files for ${formData.location}.`);
        }
      };
      fetchFiles();
    }
  }, [formData.location]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiClient.post("/users", formData);
      alert("User created successfully!"); // Simple feedback for now
      onUserCreated(); // Refresh the user list in the parent component
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">Create New User</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="name"
              placeholder="Full Name"
              onChange={handleChange}
              required
              className="p-2 border rounded"
            />
            <input
              name="username"
              placeholder="Username"
              onChange={handleChange}
              required
              className="p-2 border rounded"
            />
            <input
              name="mobile"
              placeholder="Mobile Number"
              onChange={handleChange}
              required
              className="p-2 border rounded"
            />
            <select
              name="location"
              onChange={handleChange}
              required
              className="p-2 border rounded"
            >
              <option value="">Select Location</option>
              {locations.map((loc) => (
                <option key={loc.slug} value={loc.slug}>
                  {loc.name}
                </option>
              ))}
            </select>
            <input
              name="password"
              type="password"
              placeholder="Default Password"
              onChange={handleChange}
              required
              className="p-2 border rounded"
            />
            <select
              name="excelFile"
              onChange={handleChange}
              disabled={!formData.location || files.length === 0}
              className="p-2 border rounded"
            >
              <option value="">
                {!formData.location
                  ? "Select a location first"
                  : "Assign Excel File"}
              </option>
              {files.map((file) => (
                <option key={file.id} value={file.name}>
                  {file.name}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-500">{error}</p>}
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 bg-gray-200 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-300"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsersManagement;
