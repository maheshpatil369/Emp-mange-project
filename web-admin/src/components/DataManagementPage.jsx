/* eslint-disable no-unused-vars */
// File: src/components/DataManagementPage.jsx

import React from "react";
import { Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ChevronRight,
  Database,
  UploadCloud,
  Loader2,
  AlertTriangle,
  ArrowLeft,
  Download,
  RefreshCw,
  ShieldCheck,
  BookUser,
  DatabaseZap,
  Search,
  PackageCheck,
} from "lucide-react";
import apiClient from "../lib/axios";
import { Outlet } from "react-router-dom";
import toast from "react-hot-toast";

export const DataManagementPage = () => {
  return (
    <div>
      <Outlet />
    </div>
  );
};

// --- Component for the main /data-management page ---
export const DataManagementHub = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch locations, talukas, and users in parallel
        const [configRes, usersRes] = await Promise.all([
          apiClient.get("/data/config"),
          apiClient.get("/users"),
        ]);
        setLocations(configRes.data.locations || []);
        setConfig(configRes.data);
        setUsers(usersRes.data || []);
      } catch (err) {
        console.error("Failed to load initial data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Data Management</h1>

      <LocationsSection locations={locations} loading={loading} />
      <SearchRecord />
      <BundleCountersStatus locations={locations} />
      <DownloadRecords locations={locations} />
      <AdminTools users={users} config={config} />
      <DangerZone />
    </div>
  );
};

// --- Component for the /data-management/:location page ---
export const LocationFileManagement = () => {
  const { location } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiClient.get(`/data/files/${location}`);
      setFiles(response.data || []);
    } catch (err) {
      setError(`Failed to fetch files for ${location}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [location]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      await apiClient.post(`/data/upload/${location}`, formData);
      toast.success("File uploaded successfully!");
      fetchFiles(); // Refresh the list
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
      setSelectedFile(null);
    }
  };

  const handleDelete = async (fileId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this file? This action cannot be undone."
      )
    ) {
      return;
    }
    try {
      await apiClient.delete(`/data/files/${location}/${fileId}`);
      toast.success("File deleted successfully!");
      fetchFiles(); // Refresh the list after deletion
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete file.");
    }
  };

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate("/data-management")}
        className="flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Data Management
      </button>
      <h1 className="text-3xl font-bold text-gray-800">
        Manage Data for{" "}
        <span className="capitalize">{location.replace("-", " ")}</span>
      </h1>

      {error && <p className="text-red-500">{error}</p>}

      {/* Upload Section */}
      {/* <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Upload Files
        </h2>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <UploadCloud className="w-5 h-5 mr-2" />
            )}
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div> */}

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b-2 border-green-400 inline-block pb-1">
          Upload Files
        </h2>

        <div className="flex items-center space-x-4">
          <input
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg p-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200 transition"
          />

          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex items-center justify-center px-5 py-2 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-500 active:scale-95 disabled:bg-green-300 transition-all duration-200"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <UploadCloud className="w-5 h-5 mr-2" />
            )}
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>

      {/* Uploaded Files Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Uploaded Files
        </h2>
        {loading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  File Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Upload Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => (
                <tr key={file.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {file.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {(file.size / 1024).toFixed(2)} KB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {file.uploadDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {/* <button
                      onClick={() => handleDelete(file.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button> */}
                    <button
                      onClick={() => handleDelete(file.id)}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md shadow hover:bg-red-700 active:scale-95 transition-all duration-200"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// --- Child Components for the DataManagementHub ---

const LocationsSection = ({ locations, loading }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <div className="flex items-center mb-4">
      <Database className="w-6 h-6 mr-3 text-blue-600" />
      <h2 className="text-xl font-semibold text-gray-700">Locations</h2>
    </div>
    <p className="text-sm text-gray-500 mb-4">
      Manage and upload Excel data for each location.
    </p>
    {loading ? (
      <Loader2 className="animate-spin" />
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {locations.map((loc) => (
          // <div
          //   key={loc.slug}
          //   className="p-4 border rounded-lg flex items-center justify-between"
          // >
          //   <span className="font-medium">{loc.name}</span>
          //   <Link
          //     to={`/data-management/${loc.slug}`}
          //     className="flex items-center text-sm text-blue-600 hover:underline"
          //   >
          //     Manage Data <ChevronRight className="w-4 h-4 ml-1" />
          //   </Link>
          // </div>
          <div
            key={loc.slug}
            className="p-4 border-2 border-gray-300 rounded-lg flex items-center justify-between shadow-sm hover:shadow-md transition"
          >
            <span className="font-medium">{loc.name}</span>

            <Link
              to={`/data-management/${loc.slug}`}
              className="ml-2 flex items-center gap-1 px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md shadow-md hover:bg-green-500 active:scale-95 transition-all duration-200"
            >
              Manage Data
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>
    )}
  </div>
);

const SearchRecord = () => {
  const [searchId, setSearchId] = useState("");
  const [loading, setLoading] = useState(false);
  const [foundRecord, setFoundRecord] = useState(null);
  const [error, setError] = useState("");

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFoundRecord(null);
    try {
      const response = await apiClient.get(
        `/admin/records/search?searchFromId=${searchId}`
      );
      setFoundRecord(response.data);
    } catch (err) {
      setError(err.response?.data?.message || "Search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-700">Search Record</h2>
      <p className="text-sm text-gray-500 mt-1">
        Search for a record by its ID from the "Search from" column.
      </p>
      <form
        onSubmit={handleSearch}
        className="mt-4 flex items-center space-x-2"
      >
        <input
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="Enter ID from 'Search from' column"
          className="flex-1 p-2 border rounded-md"
        />
        <button
          type="submit"
          disabled={loading || !searchId}
          className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-300"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Search className="w-5 h-5 mr-2" />
          )}
          Search
        </button>
      </form>
      {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
      {foundRecord && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md border">
          <h3 className="font-bold">Record Found</h3>
          <pre className="text-xs mt-2 bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(foundRecord, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

const BundleCountersStatus = ({ locations }) => {
  const [counters, setCounters] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounters = async () => {
      try {
        const response = await apiClient.get(
          "/admin/analytics/bundle-counters"
        );
        setCounters(response.data);
      } catch (err) {
        console.error("Failed to fetch bundle counters", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCounters();
  }, []);

  const getRows = () => {
    if (!counters || !locations) return [];
    const rows = [];
    for (const locationSlug in counters) {
      const locationName =
        locations.find((l) => l.slug === locationSlug)?.name || locationSlug;
      for (const taluka in counters[locationSlug]) {
        const data = counters[locationSlug][taluka];
        const gaps = data.gaps || [];
        rows.push({
          location: locationName,
          taluka: taluka,
          nextToAssign: gaps.length > 0 ? Math.min(...gaps) : data.nextBundle,
          nextNew: data.nextBundle,
          gaps: gaps.join(", ") || "None",
        });
      }
    }
    return rows;
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-700">
        Bundle Counters Status
      </h2>
      <p className="text-gray-500 mt-2 text-sm">
        Live status of the bundle assignment system for each Taluka.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Location
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Taluka
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Next Bundle to Assign
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Next New Bundle #
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                Available Gaps
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan="5" className="text-center py-4">
                  <Loader2 className="animate-spin inline-block" />
                </td>
              </tr>
            ) : (
              getRows().map((row) => (
                <tr key={`${row.location}-${row.taluka}`}>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {row.location}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                    {row.taluka}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-blue-600">
                    {row.nextToAssign}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {row.nextNew}
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                    {row.gaps}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DownloadRecords = ({ locations }) => {
  const [selectedLocation, setSelectedLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!selectedLocation) return;
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/admin/export/processed/${selectedLocation}`,
        {
          responseType: "blob", // Important for file downloads
        }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      const fileName = `${selectedLocation}-processed-records-${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error(
        "Failed to download records. There might be no data for this location."
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-700">
        Download Updated Records
      </h2>
      <p className="text-gray-500 mt-2 text-sm">
        Download an Excel file of all processed records for a location.
      </p>
      <div className="mt-4 flex items-center space-x-4">
        <select
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="flex-1 p-2 border rounded-md bg-gray-50"
        >
          <option value="">Select a location</option>
          {locations.map((loc) => (
            <option key={loc.slug} value={loc.slug}>
              {loc.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleDownload}
          disabled={!selectedLocation || loading}
          className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:bg-green-300"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Download className="w-5 h-5 mr-2" />
          )}
          Download
        </button>
      </div>
    </div>
  );
};

const AdminTools = ({ users, config }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-8">
      <h2 className="text-xl font-semibold text-gray-700">Management Tools</h2>
      <AdminTool
        title="Add New Taluka"
        description="Add a new Taluka to an existing Location's configuration. This will make it available for bundle assignment."
      >
        <AddTalukaForm config={config} />
      </AdminTool>
      <hr />
      <AdminTool
        title="Delete Existing Bundle"
        description="Manually remove a user's current bundle for a specific Taluka. This allows them to be assigned a new bundle. Note: This does not delete any processed data."
      >
        <MarkIncompleteForm users={users} config={config} />
      </AdminTool>
      <hr />
      <AdminTool
        title="Force Complete a Bundle"
        description="Manually mark any bundle as complete."
      >
        <ForceCompleteForm users={users} config={config} />
      </AdminTool>
      <hr />
      <AdminTool
        title="Manual Bundle Assignment"
        description="Manually assign or re-assign a specific bundle number to a user."
      >
        <ManualAssignForm users={users} config={config} />
      </AdminTool>
      <hr />
      <AdminTool
        title="Reset User Progress"
        description="Clear all processed data and reset bundle progress for a user."
      >
        <ResetProgressForm users={users} config={config} />
      </AdminTool>
    </div>
  );
};

// A generic wrapper for each tool
const AdminTool = ({ title, description, children }) => (
  <div>
    <h3 className="font-semibold">{title}</h3>
    <p className="text-sm text-gray-500 mt-1">{description}</p>
    <div className="mt-4">{children}</div>
  </div>
);

const AddTalukaForm = ({ config }) => {
  const [formData, setFormData] = useState({
    locationSlug: "",
    talukaName: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !window.confirm(
        `Are you sure you want to add "${formData.talukaName}" to the location?`
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      // The API endpoint we created earlier
      const response = await apiClient.post("/data/config/talukas", formData);
      toast.success(response.data.message || "Taluka added successfully!");
      // Reset the form on success
      setFormData({ locationSlug: "", talukaName: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="flex items-center text-sm text-gray-400">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        <span>Loading configuration...</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
    >
      <SelectInput
        name="locationSlug"
        value={formData.locationSlug}
        onChange={handleChange}
        options={config.locations.map((loc) => ({
          value: loc.slug,
          label: loc.name,
        }))}
        placeholder="Select Location"
      />
      <TextInput
        name="talukaName"
        value={formData.talukaName}
        onChange={handleChange}
        placeholder="New Taluka Name"
        disabled={!formData.locationSlug}
      />
      <button
        type="submit"
        disabled={loading || !formData.locationSlug || !formData.talukaName}
        className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
      >
        <DatabaseZap className="w-5 h-5 mr-2" />
        {loading ? <Loader2 className="animate-spin" /> : "Add Taluka"}
      </button>
    </form>
  );
};

const MarkIncompleteForm = ({ users, config }) => {
  const [formData, setFormData] = useState({ userId: "", taluka: "" });
  const [loading, setLoading] = useState(false);
  const [talukas, setTalukas] = useState([]);

  const selectedUser = users.find((u) => u.id === formData.userId);

  useEffect(() => {
    if (selectedUser && config) {
      const locConfig = config.talukas.find(
        (t) => t.locationSlug === selectedUser.location
      );
      setTalukas(locConfig ? locConfig.talukas : []);
    } else {
      setTalukas([]);
    }
    setFormData((prev) => ({ ...prev, taluka: "" }));
  }, [formData.userId, config, users]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !window.confirm(
        "Are you sure? This will clear the user's active bundle, allowing them to assign a new one."
      )
    )
      return;
    setLoading(true);
    try {
      await apiClient.post("/admin/mark-incomplete-complete", formData);
      toast.success("Active bundle cleared successfully!");
      e.target.reset();
      setFormData({ userId: "", taluka: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
    >
      <SelectInput
        name="userId"
        value={formData.userId}
        onChange={handleChange}
        options={users.map((u) => ({ value: u.id, label: u.name }))}
        placeholder="Select User"
      />
      <SelectInput
        name="taluka"
        value={formData.taluka}
        onChange={handleChange}
        options={talukas.map((t) => ({ value: t, label: t }))}
        placeholder="Select Taluka"
        disabled={!formData.userId}
      />
      <button
        type="submit"
        disabled={loading || !formData.taluka}
        className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:bg-gray-300"
      >
        <PackageCheck className="w-5 h-5 mr-2" />
        {loading ? <Loader2 className="animate-spin" /> : "Mark as Complete"}
      </button>
    </form>
  );
};

const ForceCompleteForm = ({ users, config }) => {
  const [formData, setFormData] = useState({
    userId: "",
    taluka: "",
    bundleNo: "",
  });
  const [loading, setLoading] = useState(false);
  const [talukas, setTalukas] = useState([]);

  const selectedUser = users.find((u) => u.id === formData.userId);

  useEffect(() => {
    if (selectedUser && config) {
      const locConfig = config.talukas.find(
        (t) => t.locationSlug === selectedUser.location
      );
      setTalukas(locConfig ? locConfig.talukas : []);
    } else {
      setTalukas([]);
    }
    setFormData((prev) => ({ ...prev, taluka: "" }));
  }, [formData.userId, config, users]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to force complete this bundle?"))
      return;
    setLoading(true);
    try {
      await apiClient.post("/admin/force-complete", formData);
      toast.success("Bundle force completed successfully!");
      e.target.reset();
      setFormData({ userId: "", taluka: "", bundleNo: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
    >
      <SelectInput
        name="userId"
        value={formData.userId}
        onChange={handleChange}
        options={users.map((u) => ({ value: u.id, label: u.name }))}
        placeholder="Select User"
      />
      <SelectInput
        name="taluka"
        value={formData.taluka}
        onChange={handleChange}
        options={talukas.map((t) => ({ value: t, label: t }))}
        placeholder="Select Taluka"
        disabled={!formData.userId}
      />
      <TextInput
        name="bundleNo"
        value={formData.bundleNo}
        onChange={handleChange}
        placeholder="Bundle No."
        type="number"
        disabled={!formData.taluka}
      />
      <button
        type="submit"
        disabled={loading || !formData.bundleNo}
        className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:bg-gray-300"
      >
        <ShieldCheck className="w-5 h-5 mr-2" />
        {loading ? <Loader2 className="animate-spin" /> : "Force Complete"}
      </button>
    </form>
  );
};

const ManualAssignForm = ({ users, config }) => {
  const [formData, setFormData] = useState({
    userId: "",
    taluka: "",
    bundleNo: "",
  });
  const [loading, setLoading] = useState(false);
  const [talukas, setTalukas] = useState([]);

  const selectedUser = users.find((u) => u.id === formData.userId);

  useEffect(() => {
    if (selectedUser && config) {
      const locConfig = config.talukas.find(
        (t) => t.locationSlug === selectedUser.location
      );
      setTalukas(locConfig ? locConfig.talukas : []);
    } else {
      setTalukas([]);
    }
    setFormData((prev) => ({ ...prev, taluka: "" }));
  }, [formData.userId, config, users]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !window.confirm(
        "Are you sure you want to manually assign this bundle? This will override the user's current active bundle for this taluka."
      )
    )
      return;
    setLoading(true);
    try {
      await apiClient.post("/admin/manual-assign", formData);
      toast.success("Bundle assigned successfully!");
      e.target.reset();
      setFormData({ userId: "", taluka: "", bundleNo: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
    >
      <SelectInput
        name="userId"
        value={formData.userId}
        onChange={handleChange}
        options={users.map((u) => ({ value: u.id, label: u.name }))}
        placeholder="Select User"
      />
      <SelectInput
        name="taluka"
        value={formData.taluka}
        onChange={handleChange}
        options={talukas.map((t) => ({ value: t, label: t }))}
        placeholder="Select Taluka"
        disabled={!formData.userId}
      />
      <TextInput
        name="bundleNo"
        value={formData.bundleNo}
        onChange={handleChange}
        placeholder="Bundle No."
        type="number"
        disabled={!formData.taluka}
      />
      <button
        type="submit"
        disabled={loading || !formData.bundleNo}
        className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:bg-gray-300"
      >
        <BookUser className="w-5 h-5 mr-2" />
        {loading ? <Loader2 className="animate-spin" /> : "Assign Bundle"}
      </button>
    </form>
  );
};

const ResetProgressForm = ({ users, config }) => {
  const [formData, setFormData] = useState({ userId: "", taluka: "" });
  const [loading, setLoading] = useState(false);
  const [talukas, setTalukas] = useState([]);

  const selectedUser = users.find((u) => u.id === formData.userId);

  useEffect(() => {
    if (selectedUser && config) {
      const locConfig = config.talukas.find(
        (t) => t.locationSlug === selectedUser.location
      );
      setTalukas(locConfig ? locConfig.talukas : []);
    } else {
      setTalukas([]);
    }
    setFormData((prev) => ({ ...prev, taluka: "" }));
  }, [formData.userId, config, users]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !window.confirm(
        "ARE YOU SURE? This will delete the user's processed data for their active bundle and cannot be undone."
      )
    )
      return;
    setLoading(true);
    try {
      await apiClient.post("/admin/reset-progress", formData);
      toast.success("User progress reset successfully!");
      e.target.reset();
      setFormData({ userId: "", taluka: "" });
    } catch (err) {
      toast.error(err.response?.data?.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"
    >
      <SelectInput
        name="userId"
        value={formData.userId}
        onChange={handleChange}
        options={users.map((u) => ({ value: u.id, label: u.name }))}
        placeholder="Select User"
      />
      <SelectInput
        name="taluka"
        value={formData.taluka}
        onChange={handleChange}
        options={talukas.map((t) => ({ value: t, label: t }))}
        placeholder="Select Taluka"
        disabled={!formData.userId}
      />
      <button
        type="submit"
        disabled={loading || !formData.taluka}
        className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-300"
      >
        <RefreshCw className="w-5 h-5 mr-2" />
        {loading ? <Loader2 className="animate-spin" /> : "Reset Progress"}
      </button>
    </form>
  );
};

// Helper components for forms
const SelectInput = ({
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}) => (
  <select
    name={name}
    value={value}
    onChange={onChange}
    disabled={disabled}
    required
    className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200"
  >
    <option value="">{placeholder}</option>
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>
        {opt.label}
      </option>
    ))}
  </select>
);

const TextInput = ({
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  disabled = false,
}) => (
  <input
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    type={type}
    disabled={disabled}
    required
    className="w-full p-2 border rounded-md bg-gray-50 disabled:bg-gray-200"
  />
);

const DangerZone = () => {
  const [loading, setLoading] = useState(false);

  const handleResetData = async () => {
    if (
      !window.confirm(
        "ARE YOU ABSOLUTELY SURE? This will delete ALL processed records and cannot be undone."
      )
    )
      return;
    setLoading(true);
    try {
      await apiClient.post("/admin/danger-zone/reset-all-data");
      toast.success("All processed data has been deleted.");
    } catch (err) {
      toast.error("Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetCounters = async () => {
    if (
      !window.confirm(
        "ARE YOU ABSOLUTELY SURE? This will reset ALL bundle counters and user states. Users will lose their current assignments. This cannot be undone."
      )
    )
      return;
    setLoading(true);
    try {
      await apiClient.post("/admin/danger-zone/reset-all-counters");
      toast.success("All counters and user states have been reset.");
    } catch (err) {
      toast.error("Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg shadow-md">
      <div className="flex items-center">
        <AlertTriangle className="w-6 h-6 mr-3 text-red-600" />
        <h2 className="text-xl font-semibold text-red-800">
          System Danger Zone
        </h2>
      </div>
      <p className="text-red-700 mt-2 text-sm">
        Permanently reset system-wide data. Use with extreme caution.
      </p>
      <div className="mt-4 flex items-center space-x-4">
        <button
          onClick={handleResetData}
          disabled={loading}
          className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-300"
        >
          <DatabaseZap className="w-5 h-5 mr-2" />
          Reset All Processed Data
        </button>
        <button
          onClick={handleResetCounters}
          disabled={loading}
          className="flex items-center justify-center px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-300"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Reset All Counters & Bundles
        </button>
      </div>
    </div>
  );
};
