/* eslint-disable no-unused-vars */
// File: src/components/UsersManagement.jsx

import React, { useState, useEffect } from "react";
import {
  PlusCircle,
  Loader2,
  AlertTriangle,
  Edit,
  Trash2,
  Download,
  // DownloadOff
} from "lucide-react";
import apiClient from "../lib/axios";
import toast from "react-hot-toast";

const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fetchedsucess, setFetchedSucess] = useState(true);
  // State for modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // Function to fetch users
  const fetchUsers = async () => {
    try {
      // Don't set loading to true here on refetch, to avoid screen flicker
      setError("");
      const response = await apiClient.get("/users");

      const usersWithDefaults = response.data.map((user) => ({
        ...user,
        canDownloadFiles:
          user.canDownloadFiles !== undefined ? user.canDownloadFiles : true,
      }));
      setUsers(usersWithDefaults);
    } catch (err) {
      setError("Failed to fetch users.");
      console.error(err);
    } finally {
      // Only set loading to false on the initial load
      if (loading) setLoading(false);
    }
  };

  // Fetch users on component mount
  useEffect(() => {
    setLoading(true); // Set loading true only on initial mount
    fetchUsers();
  }, [fetchedsucess]);

  // CORRECTED: Function to handle the permission toggle
  const handlePermissionToggle = async (userId, currentPermission) => {
    const newPermission = !currentPermission;

    try {
      // Send the API request to the backend
      await apiClient.put(`/users/${userId}/permissions`, {
        canDownload: newPermission,
      });
      toast.success(
        `Downloads ${newPermission ? "enabled" : "disabled"} for user.`
      );
      // On success, refetch the user list to ensure UI is in sync with the database
      await fetchUsers();
    } catch (err) {
      toast.error("Failed to update permission. Please try again.");
      console.error("Failed to toggle permission:", err);
    }
  };

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
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Create New User
        </button>
      </div>

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
                <tr key={user.uid}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {user.name || user.displayName}
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
                    <button
                      onClick={() =>
                        handlePermissionToggle(user.id, user.canDownloadFiles)
                      } // CORRECTED: from user.id to user.uid
                      className={`p-1 rounded-full ${
                        user.canDownloadFiles
                          ? "text-green-600 hover:bg-green-100"
                          : "text-gray-500 hover:bg-gray-100"
                      }`}
                      title={
                        user.canDownloadFiles
                          ? "Disable Downloads"
                          : "Enable Downloads"
                      }
                    >
                      {user.canDownloadFiles ? (
                        <Download className="w-5 h-5" />
                      ) : (
                        <h1>Download off</h1>
                        // <DownloadOff className="w-5 h-5" /> // CORRECTED: Re-added the correct icon
                      )}
                    </button>

                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Edit User"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDeletingUser(user)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete User"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isCreateModalOpen && (
        <CreateUserModal
          closeModal={() => setIsCreateModalOpen(false)}
          onUserCreated={fetchUsers}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          closeModal={() => setEditingUser(null)}
          onUserUpdated={fetchUsers}
        />
      )}

      {deletingUser && (
        <DeleteUserModal
          user={deletingUser}
          closeModal={() => setDeletingUser(null)}
          onUserDeleted={fetchUsers}
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

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await apiClient.get("/data/config");
        setLocations(response.data.locations || []);
      } catch (err) {
        setError("Could not load locations.");
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (formData.location) {
      const fetchFiles = async () => {
        try {
          setFiles([]);
          setFormData((prev) => ({ ...prev, excelFile: "" }));
          const response = await apiClient.get(
            `/data/files/${formData.location}`
          );
          setFiles(response.data || []);
        } catch (err) {
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
      toast.success(`User "${formData.username}" created successfully!`);
      onUserCreated();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create user.");
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

// --- Edit User Modal Component ---
const EditUserModal = ({ user, closeModal, onUserUpdated }) => {
  const [formData, setFormData] = useState({
    name: user.name || "",
    mobile: user.mobile || "",
    location: user.location || "",
    excelFile: user.excelFile || "",
  });
  const [locations, setLocations] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const configRes = await apiClient.get("/data/config");
        setLocations(configRes.data.locations || []);

        if (formData.location) {
          const filesRes = await apiClient.get(
            `/data/files/${formData.location}`
          );
          setFiles(filesRes.data || []);
        }
      } catch (err) {
        setError("Could not load initial data.");
      }
    };
    fetchInitialData();
  }, [formData.location]);

  useEffect(() => {
    if (formData.location) {
      const fetchFiles = async () => {
        try {
          const response = await apiClient.get(
            `/data/files/${formData.location}`
          );
          setFiles(response.data || []);
        } catch (err) {
          setError(`Could not load files for ${formData.location}.`);
        }
      };
      fetchFiles();
    }
  }, [formData.location]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = { ...formData, [name]: value };
    // If the location is changed, reset the excelFile
    if (name === "location") {
      newFormData.excelFile = "";
    }
    setFormData(newFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiClient.put(`/users/${user.id}`, formData);
      toast.success("User updated successfully!");
      onUserUpdated();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl">
        <h2 className="text-2xl font-bold mb-6">Edit User: {user.username}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              name="name"
              value={formData.name}
              placeholder="Full Name"
              onChange={handleChange}
              required
              className="p-2 border rounded"
            />
            <input
              name="mobile"
              value={formData.mobile}
              placeholder="Mobile Number"
              onChange={handleChange}
              required
              className="p-2 border rounded"
            />
            <select
              name="location"
              value={formData.location}
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
            <select
              name="excelFile"
              value={formData.excelFile}
              onChange={handleChange}
              disabled={!formData.location}
              required
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
              className="px-4 py-2 bg-indigo-600 text-white rounded disabled:bg-indigo-300"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Delete User Modal Component ---
const DeleteUserModal = ({ user, closeModal, onUserDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      await apiClient.delete(`/users/${user.id}`);
      toast.success("User deleted successfully!");
      onUserDeleted();
      closeModal();
    } catch (err) {
      // setError(err.response?.data?.message || "Failed to delete user.");
      toast.error(err.response?.data?.message || "Failed to delete user.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">Delete User</h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to permanently delete the user{" "}
          <span className="font-bold">
            {user.name} ({user.username})
          </span>
          ? This action cannot be undone.
        </p>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <div className="flex justify-end space-x-4">
          <button
            onClick={closeModal}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded disabled:bg-red-300"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Delete User"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsersManagement;
