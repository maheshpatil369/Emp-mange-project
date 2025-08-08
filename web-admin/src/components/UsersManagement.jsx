/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import {
  PlusCircle,
  Loader2,
  AlertTriangle,
  Edit,
  Trash2,
  Download,
  DownloadCloud, // A more descriptive icon for disabled downloads
  UsersRound, // Icon for empty state
  X, // Icon for closing modals
  Search, // NEW: Icon for the search bar
} from "lucide-react";
import apiClient from "../lib/axios";
import toast from "react-hot-toast";

// --- NEW: Skeleton Component for a single table row ---
const UserTableRowSkeleton = () => (
  <tr className="animate-pulse">
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    </td>
    <td className="px-6 py-4">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
    </td>
    <td className="px-6 py-4">
      <div className="flex justify-end space-x-2">
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
      </div>
    </td>
  </tr>
);

// --- Main User Management Component ---
const UsersManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- NEW: State for search term ---
  const [searchTerm, setSearchTerm] = useState("");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  const fetchUsers = async () => {
    try {
      setError("");
      const response = await apiClient.get("/users");
      const usersWithDefaults = response.data.map((user) => ({
        ...user,
        canDownloadFiles:
          user.canDownloadFiles !== undefined ? user.canDownloadFiles : true,
      }));
      setUsers(usersWithDefaults);
    } catch (err) {
      setError(
        "Failed to fetch users. Please check your connection and try again."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePermissionToggle = async (userId, currentPermission) => {
    try {
      await apiClient.put(`/users/${userId}/permissions`, {
        canDownload: !currentPermission,
      });
      toast.success(
        `Downloads ${!currentPermission ? "enabled" : "disabled"} for user.`
      );
      fetchUsers();
    } catch (err) {
      toast.error("Failed to update permission.");
      console.error("Failed to toggle permission:", err);
    }
  };

  const renderTableContent = () => {
    if (loading) {
      return Array.from({ length: 5 }).map((_, i) => (
        <UserTableRowSkeleton key={i} />
      ));
    }

    // --- NEW: Filter users based on search term ---
    const filteredUsers = users.filter((user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Case 1: No users exist in the database
    if (users.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="text-center py-16">
            <div className="flex flex-col items-center justify-center text-gray-500">
              <UsersRound className="w-16 h-16 mb-4" />
              <h3 className="text-xl font-semibold">No Users Found</h3>
              <p className="mb-4">Get started by creating a new user.</p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Create New User
              </button>
            </div>
          </td>
        </tr>
      );
    }

    // --- NEW: Case 2: No users match the search query ---
    if (filteredUsers.length === 0) {
      return (
        <tr>
          <td colSpan="6" className="text-center py-16 text-gray-500">
            <h3 className="text-xl font-semibold">No Results Found</h3>
            <p>No users match your search for "{searchTerm}".</p>
          </td>
        </tr>
      );
    }

    // Case 3: Render the filtered list of users
    return filteredUsers.map((user) => (
      <tr key={user.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {user.name}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {user.username}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {user.mobile}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {user.location}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
          {user.excelFile || "N/A"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <div className="flex items-center justify-end space-x-2">
            <button
              onClick={() =>
                handlePermissionToggle(user.id, user.canDownloadFiles)
              }
              className="p-2 rounded-full transition-colors hover:bg-gray-100"
              title={
                user.canDownloadFiles ? "Disable Downloads" : "Enable Downloads"
              }
            >
              {user.canDownloadFiles ? (
                <Download className="w-5 h-5 text-green-600" />
              ) : (
                <DownloadCloud className="w-5 h-5 text-gray-400" />
              )}
            </button>
            <button
              onClick={() => setEditingUser(user)}
              className="p-2 rounded-full transition-colors text-blue-600 hover:bg-blue-50"
              title="Edit User"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={() => setDeletingUser(user)}
              className="p-2 rounded-full transition-colors text-red-600 hover:bg-red-50"
              title="Delete User"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </td>
      </tr>
    ));
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Create New User
        </button>
      </div>

      {/* --- NEW: Search Bar --- */}
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={20}
        />
        <input
          type="text"
          placeholder="Search users by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-1/2 lg:w-1/3 pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        />
      </div>

      {error && (
        <div className="flex items-center justify-center text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertTriangle className="w-6 h-6 mr-3" /> {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Full Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Mobile
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Assigned Excel
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {renderTableContent()}
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

// --- Helper Component for Form Fields (NO CHANGES) ---
const FormField = ({ label, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    {children}
  </div>
);

// --- Create User Modal Component (NO CHANGES) ---
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

  const inputStyles =
    "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition";

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

  const handleMobileChange = (e) => {
    const numericValue = e.target.value.replace(/\D/g, "").slice(0, 10);
    handleChange({ target: { name: "mobile", value: numericValue } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Create New User
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Full Name">
              <input
                name="name"
                onChange={handleChange}
                required
                className={inputStyles}
              />
            </FormField>
            <FormField label="Username">
              <input
                name="username"
                onChange={handleChange}
                required
                className={inputStyles}
              />
            </FormField>
            <FormField label="Mobile Number">
              <div className="flex items-center border border-gray-300 rounded-md shadow-sm overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                <span className="px-3 bg-gray-50 text-gray-600 border-r border-gray-300 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleMobileChange}
                  required
                  className="flex-1 p-2 border-0 outline-none w-full"
                />
              </div>
            </FormField>
            <FormField label="Default Password">
              <input
                name="password"
                type="password"
                onChange={handleChange}
                required
                className={inputStyles}
              />
            </FormField>
            <FormField label="Location">
              <select
                name="location"
                onChange={handleChange}
                required
                className={inputStyles}
              >
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc.slug} value={loc.slug}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Assign Excel File">
              <select
                name="excelFile"
                onChange={handleChange}
                disabled={!formData.location || files.length === 0}
                className={`${inputStyles} disabled:bg-gray-100`}
              >
                <option value="">
                  {!formData.location ? "Select location first" : "Select file"}
                </option>
                {files.map((file) => (
                  <option key={file.id} value={file.name}>
                    {file.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center justify-center disabled:bg-blue-300 w-32"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Edit User Modal Component (NO CHANGES) ---
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

  const inputStyles =
    "w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 transition";

  // Fetch master list of locations
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

  // Fetch files based on the currently selected location
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
    // If the location is changed, reset the excelFile selection
    if (name === "location") {
      newFormData.excelFile = "";
    }
    setFormData(newFormData);
  };

  const handleMobileChange = (e) => {
    const numericValue = e.target.value.replace(/\D/g, "").slice(0, 10);
    handleChange({ target: { name: "mobile", value: numericValue } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl relative">
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X />
        </button>
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          Edit User: <span className="text-blue-600">{user.username}</span>
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Full Name">
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className={inputStyles}
              />
            </FormField>
            <FormField label="Mobile Number">
              <div className="flex items-center border border-gray-300 rounded-md shadow-sm overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                <span className="px-3 bg-gray-50 text-gray-600 border-r border-gray-300 select-none">
                  +91
                </span>
                <input
                  type="tel"
                  name="mobile"
                  value={formData.mobile}
                  onChange={handleMobileChange}
                  required
                  className="flex-1 p-2 border-0 outline-none w-full"
                />
              </div>
            </FormField>
            <FormField label="Location">
              <select
                name="location"
                value={formData.location}
                onChange={handleChange}
                required
                className={inputStyles}
              >
                <option value="">Select Location</option>
                {locations.map((loc) => (
                  <option key={loc.slug} value={loc.slug}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Assign Excel File">
              <select
                name="excelFile"
                value={formData.excelFile}
                onChange={handleChange}
                disabled={!formData.location || files.length === 0}
                className={`${inputStyles} disabled:bg-gray-100`}
              >
                <option value="">
                  {!formData.location ? "Select location first" : "Select file"}
                </option>
                {files.map((file) => (
                  <option key={file.id} value={file.name}>
                    {file.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md flex items-center justify-center disabled:bg-blue-300 w-36"
            >
              {loading ? <Loader2 className="animate-spin" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- Delete User Modal Component (NO CHANGES) ---
const DeleteUserModal = ({ user, closeModal, onUserDeleted }) => {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await apiClient.delete(`/users/${user.id}`);
      toast.success("User deleted successfully!");
      onUserDeleted();
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete user.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Delete User</h2>
        <p className="text-gray-600 mb-6">
          Are you sure you want to permanently delete the user{" "}
          <span className="font-semibold text-gray-900">
            {user.name} ({user.username})
          </span>
          ? This action cannot be undone.
        </p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={closeModal}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md flex items-center justify-center disabled:bg-red-300 w-32"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UsersManagement;
