/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams, Outlet } from "react-router-dom";
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
  FileText,
  Inbox,
  ClipboardCopy,
} from "lucide-react";
import apiClient from "../lib/axios";
import toast from "react-hot-toast";

// --- Main Page Wrapper ---
export const DataManagementPage = () => (
  <div className="bg-gray-50 min-h-screen">
    <Outlet />
  </div>
);

// --- Reusable UI Components ---

const ManagementCard = ({
  icon,
  title,
  description,
  children,
  className = "",
  contentClassName = "",
}) => (
  <div
    className={`bg-white px-5 py-6 rounded-xl border border-gray-200 shadow-sm ${className}`}
  >
    <div className="flex items-start mb-2">
      {icon && (
        <div className="mr-4 text-blue-600 bg-blue-100 p-3 rounded-lg">
          {icon}
        </div>
      )}
      <div className="flex-1 ">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
    </div>
    <div className={`mt-4 ${icon ? "md:pl-16" : ""} ${contentClassName}`}>
      {children}
    </div>
  </div>
);

const EmptyState = ({ message, icon = <Inbox size={48} /> }) => (
  <div className="text-center w-full py-12 text-gray-500 bg-gray-50 rounded-lg">
    <div className="inline-block p-4 bg-gray-200 rounded-full mb-4">{icon}</div>
    <p className="font-medium">{message}</p>
  </div>
);

const TableSkeletonRow = ({ columns }) => (
  <tr className="animate-pulse">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
      </td>
    ))}
  </tr>
);

const SelectInput = ({
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  required = true,
}) => (
  <select
    name={name}
    value={value}
    onChange={onChange}
    disabled={disabled}
    required={required}
    className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-200 disabled:cursor-not-allowed"
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
  required = true,
}) => (
  <input
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    type={type}
    disabled={disabled}
    required={required}
    className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-200 disabled:cursor-not-allowed"
  />
);

// --- Main /data-management Hub ---
export const DataManagementHub = () => {
  const [data, setData] = useState({ locations: [], users: [], config: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, usersRes] = await Promise.all([
          apiClient.get("/data/config"),
          apiClient.get("/users"),
        ]);
        setData({
          locations: configRes.data.locations || [],
          config: configRes.data,
          users: usersRes.data || [],
        });
      } catch (err) {
        console.error("Failed to load initial data", err);
        toast.error("Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">Data Management</h1>
      <div className="space-y-6">
        <LocationsSection locations={data.locations} loading={loading} />
        <SearchRecord />
        <BundleCountersStatus locations={data.locations} />
        <DownloadRecords locations={data.locations} />
        <DownloadDuplicateLog locations={data.locations} />
        <AdminTools users={data.users} config={data.config} />
        <DangerZone />
      </div>
    </div>
  );
};

// --- /data-management/:location Page ---
export const LocationFileManagement = () => {
  const { location } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    try {
      await apiClient.post(`/data/upload/${location}`, formData);
      toast.success("File uploaded successfully!");
      fetchFiles();
      setSelectedFile(null); // Clear file input
    } catch (err) {
      toast.error(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) return;
    try {
      await apiClient.delete(`/data/files/${location}/${fileId}`);
      toast.success("File deleted successfully!");
      fetchFiles();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete file.");
    }
  };

  const renderTableContent = () => {
    if (loading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableSkeletonRow key={i} columns={4} />
      ));
    }
    if (files.length === 0) {
      return (
        <tr>
          <td colSpan="4">
            <EmptyState message="No files have been uploaded for this location yet." />
          </td>
        </tr>
      );
    }
    return files.map((file) => (
      <tr key={file.id} className="hover:bg-gray-50">
        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
          {file.name}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {(file.size / 1024).toFixed(2)} KB
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {new Date(file.uploadDate).toLocaleDateString()}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <button
            onClick={() => handleDelete(file.id)}
            className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-red-700 active:scale-95 transition-all"
          >
            Delete
          </button>
        </td>
      </tr>
    ));
  };

  return (
    <div className="p-4 md:p-8 space-y-6">
      <button
        onClick={() => navigate("/data-management")}
        className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Data Management
      </button>
      <h1 className="text-3xl font-bold text-gray-800">
        Manage Data for{" "}
        <span className="capitalize text-blue-600">
          {location.replace(/-/g, " ")}
        </span>
      </h1>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md border border-red-200">
          {error}
        </div>
      )}

      <ManagementCard
        icon={<UploadCloud size={24} />}
        title="Upload New File"
        description="Upload a new Excel data file for this location."
      >
        <div className="flex items-center space-x-4">
          <input
            key={selectedFile ? "file-selected" : "no-file"}
            type="file"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="flex-1 text-sm text-gray-600 border border-gray-300 rounded-lg p-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 transition"
          />
          <button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="flex items-center justify-center px-5 py-2.5 font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 active:scale-95 disabled:bg-blue-300 transition-all w-32"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Upload"
            )}
          </button>
        </div>
      </ManagementCard>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Uploaded Files
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  File Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Upload Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
    </div>
  );
};

// --- Child Components for DataManagementHub (Fully Implemented) ---

const LocationsSection = ({ locations, loading }) => (
  <ManagementCard
    icon={<Database size={24} />}
    title="Locations"
    description="Manage and upload Excel data for each configured location."
  >
    {loading ? (
      <div className="flex flex-wrap gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-4 border-2 border-gray-200 rounded-lg flex items-center justify-between animate-pulse w-full md:w-auto md:flex-1 min-w-[250px]"
          >
            <div className="h-5 w-1/3 bg-gray-200 rounded-md"></div>
            <div className="h-9 w-24 bg-gray-200 rounded-md"></div>
          </div>
        ))}
      </div>
    ) : locations.length > 0 ? (
      <div className="flex flex-wrap gap-4">
        {locations.map((loc) => (
          <div
            key={loc.slug}
            className="p-4 border border-gray-200 rounded-lg flex items-center justify-between shadow-sm hover:shadow-md hover:border-blue-400 transition-all w-full md:w-auto md:flex-1 min-w-[250px]"
          >
            <span className="font-medium text-gray-800">{loc.name}</span>
            <Link
              to={`/data-management/${loc.slug}`}
              className="ml-2 flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
            >
              Manage <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ))}
      </div>
    ) : (
      <EmptyState message="No locations have been configured yet." />
    )}
  </ManagementCard>
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
      setError(
        err.response?.data?.message ||
          "Search failed. Record not found or server error."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ManagementCard
      icon={<Search size={24} />}
      title="Search Record"
      description={`Search for a record by its ID from the "Search from" column.`}
    >
      <form onSubmit={handleSearch} className="flex items-center space-x-3">
        <TextInput
          name="search"
          value={searchId}
          onChange={(e) => setSearchId(e.target.value)}
          placeholder="Enter Record ID"
          required={true}
        />
        <button
          type="submit"
          disabled={loading || !searchId}
          className="flex items-center justify-center px-5 py-2.5 font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 active:scale-95 disabled:bg-blue-300 transition-all w-32"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Search"}
        </button>
      </form>
      {error && <p className="text-red-500 mt-3 text-sm">{error}</p>}
      {foundRecord && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md border relative group">
          <h3 className="font-bold text-gray-800">Record Found</h3>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                JSON.stringify(foundRecord, null, 2)
              );
              toast.success("Copied to clipboard!");
            }}
            className="absolute top-2 right-2 p-1.5 bg-gray-200 rounded-md text-gray-600 hover:bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <ClipboardCopy size={16} />
          </button>
          <pre className="text-xs mt-2 bg-gray-100 p-3 rounded overflow-x-auto">
            {JSON.stringify(foundRecord, null, 2)}
          </pre>
        </div>
      )}
    </ManagementCard>
  );
};

const BundleCountersStatus = ({ locations }) => {
  const [counters, setCounters] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounters = async () => {
      setLoading(true);
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
          id: `${locationSlug}-${taluka}`,
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

  const counterRows = getRows();

  return (
    <ManagementCard
      icon={<PackageCheck size={24} />}
      title="Bundle Counters Status"
      description="Live status of the bundle assignment system for each Taluka."
    >
      <div className="mt-4 overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Taluka
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Next to Assign
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Next New #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Available Gaps
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableSkeletonRow key={i} columns={5} />
              ))
            ) : counterRows.length > 0 ? (
              counterRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {row.location}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                    {row.taluka}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-bold text-blue-600">
                    {row.nextToAssign}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {row.nextNew}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    {row.gaps}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">
                  <EmptyState message="No bundle counter data available." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </ManagementCard>
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
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${selectedLocation}-processed-records-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error("Download failed. There might be no data for this location.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ManagementCard
      icon={<Download size={24} />}
      title="Download Updated Records"
      description="Download an Excel file of all processed records for a location."
    >
      <div className="flex items-center space-x-3">
        <SelectInput
          name="location"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          options={locations.map((loc) => ({
            value: loc.slug,
            label: loc.name,
          }))}
          placeholder="Select a location"
        />
        <button
          onClick={handleDownload}
          disabled={!selectedLocation || loading}
          className="flex items-center justify-center px-5 py-2.5 font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700 active:scale-95 disabled:bg-green-300 transition-all w-40"
        >
          {loading ? <Loader2 className="animate-spin" /> : "Download"}
        </button>
      </div>
    </ManagementCard>
  );
};

const DownloadDuplicateLog = ({ locations }) => {
  const [selectedLocation, setSelectedLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!selectedLocation) return;
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/admin/export/duplicate-log/${selectedLocation}`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${selectedLocation}-duplicate-log-${new Date()
          .toISOString()
          .slice(0, 10)}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      toast.error(
        "Download failed. No duplicate data found for this location."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ManagementCard
      icon={<FileText size={24} />}
      title="Download Duplicate Records Log"
      description="Download an Excel file of all records that were submitted as duplicates."
    >
      <div className="flex items-center space-x-3">
        <SelectInput
          name="location"
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          options={locations.map((loc) => ({
            value: loc.slug,
            label: loc.name,
          }))}
          placeholder="Select a location"
        />
        <button
          onClick={handleDownload}
          disabled={!selectedLocation || loading}
          className="flex items-center justify-center px-5 py-2.5 font-semibold text-white bg-orange-600 rounded-lg shadow-sm hover:bg-orange-700 active:scale-95 disabled:bg-orange-300 transition-all w-48"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            "Download Duplicates"
          )}
        </button>
      </div>
    </ManagementCard>
  );
};

const AdminTool = ({ title, description, children }) => (
  <div className="py-8">
    <h3 className="font-semibold text-gray-800 text-lg">{title}</h3>
    <p className="text-sm text-gray-500 mt-1 max-w-2xl">{description}</p>
    <div className="mt-4">{children}</div>
  </div>
);

const AdminTools = ({ users, config }) => {
  if (!users || !config) {
    return (
      <ManagementCard
        icon={<ShieldCheck size={24} />}
        title="Management Tools"
        description="Advanced tools for system administrators to manage data configurations."
      >
        <div className="flex items-center text-gray-500">
          <Loader2 className="animate-spin mr-2" />
          Loading tools...
        </div>
      </ManagementCard>
    );
  }
  return (
    <ManagementCard
      icon={<ShieldCheck size={24} />}
      title="Management Tools"
      description="Advanced tools for system administrators to manage data configurations."
      className="p-0"
      contentClassName="-mt-4"
    >
      <div className="divide-y divide-gray-200">
        <AdminTool
          title="Add New Taluka"
          description="Add a new Taluka to a Location. This makes it available for bundle assignment."
        >
          <AddTalukaForm config={config} />
        </AdminTool>
        <AdminTool
          title="Delete Existing Bundle"
          description="Manually remove a user's current bundle. This allows them to be assigned a new one. Note: This does not delete any processed data."
        >
          <MarkIncompleteForm users={users} config={config} />
        </AdminTool>
        <AdminTool
          title="Force Complete a Bundle"
          description="Manually mark any bundle as complete."
        >
          <ForceCompleteForm users={users} config={config} />
        </AdminTool>
        <AdminTool
          title="Manual Bundle Assignment"
          description="Manually assign or re-assign a specific bundle number to a user."
        >
          <ManualAssignForm users={users} config={config} />
        </AdminTool>
        <AdminTool
          title="Reset User Progress"
          description="Clear all processed data and reset bundle progress for a user."
        >
          <ResetProgressForm users={users} config={config} />
        </AdminTool>
      </div>
    </ManagementCard>
  );
};

const AddTalukaForm = ({ config }) => {
  const [formData, setFormData] = useState({
    locationSlug: "",
    talukaName: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !window.confirm(
        `Are you sure you want to add "${formData.talukaName}" to this location?`
      )
    )
      return;
    setLoading(true);
    try {
      await apiClient.post("/data/config/talukas", formData);
      toast.success("Taluka added successfully!");
      setFormData({ locationSlug: "", talukaName: "" });
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
        name="locationSlug"
        value={formData.locationSlug}
        onChange={(e) =>
          setFormData({ ...formData, locationSlug: e.target.value })
        }
        options={config.locations.map((loc) => ({
          value: loc.slug,
          label: loc.name,
        }))}
        placeholder="Select Location"
      />
      <TextInput
        name="talukaName"
        value={formData.talukaName}
        onChange={(e) =>
          setFormData({ ...formData, talukaName: e.target.value })
        }
        placeholder="New Taluka Name"
        disabled={!formData.locationSlug}
      />
      <button
        type="submit"
        disabled={loading || !formData.locationSlug || !formData.talukaName}
        className="flex items-center justify-center px-4 py-2.5 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 w-full"
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

  useEffect(() => {
    const selectedUser = users.find((u) => u.id === formData.userId);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !window.confirm("Are you sure? This will clear the user's active bundle.")
    )
      return;
    setLoading(true);
    try {
      await apiClient.post("/admin/mark-incomplete-complete", formData);
      toast.success("Active bundle cleared successfully!");
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
        onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
        options={users.map((u) => ({ value: u.id, label: u.name }))}
        placeholder="Select User"
      />
      <SelectInput
        name="taluka"
        value={formData.taluka}
        onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
        options={talukas.map((t) => ({ value: t, label: t }))}
        placeholder="Select Taluka"
        disabled={!formData.userId || talukas.length === 0}
      />
      <button
        type="submit"
        disabled={loading || !formData.taluka}
        className="flex items-center justify-center px-4 py-2.5 font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:bg-gray-300 w-full"
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

  useEffect(() => {
    const selectedUser = users.find((u) => u.id === formData.userId);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to force complete this bundle?"))
      return;
    setLoading(true);
    try {
      await apiClient.post("/admin/force-complete", formData);
      toast.success("Bundle force completed successfully!");
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
        onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
        options={users.map((u) => ({ value: u.id, label: u.name }))}
        placeholder="Select User"
      />
      <SelectInput
        name="taluka"
        value={formData.taluka}
        onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
        options={talukas.map((t) => ({ value: t, label: t }))}
        placeholder="Select Taluka"
        disabled={!formData.userId || talukas.length === 0}
      />
      <TextInput
        name="bundleNo"
        value={formData.bundleNo}
        onChange={(e) => setFormData({ ...formData, bundleNo: e.target.value })}
        placeholder="Bundle No."
        type="number"
        disabled={!formData.taluka}
      />
      <button
        type="submit"
        disabled={loading || !formData.bundleNo}
        className="flex items-center justify-center px-4 py-2.5 font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:bg-gray-300 w-full"
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

  useEffect(() => {
    const selectedUser = users.find((u) => u.id === formData.userId);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !window.confirm(
        "Are you sure? This will override the user's current active bundle."
      )
    )
      return;
    setLoading(true);
    try {
      await apiClient.post("/admin/manual-assign", formData);
      toast.success("Bundle assigned successfully!");
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
        onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
        options={users.map((u) => ({ value: u.id, label: u.name }))}
        placeholder="Select User"
      />
      <SelectInput
        name="taluka"
        value={formData.taluka}
        onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
        options={talukas.map((t) => ({ value: t, label: t }))}
        placeholder="Select Taluka"
        disabled={!formData.userId || talukas.length === 0}
      />
      <TextInput
        name="bundleNo"
        value={formData.bundleNo}
        onChange={(e) => setFormData({ ...formData, bundleNo: e.target.value })}
        placeholder="Bundle No."
        type="number"
        disabled={!formData.taluka}
      />
      <button
        type="submit"
        disabled={loading || !formData.bundleNo}
        className="flex items-center justify-center px-4 py-2.5 font-semibold text-white bg-gray-600 rounded-lg hover:bg-gray-700 disabled:bg-gray-300 w-full"
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

  useEffect(() => {
    const selectedUser = users.find((u) => u.id === formData.userId);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !window.confirm(
        "ARE YOU SURE? This will delete processed data and cannot be undone."
      )
    )
      return;
    setLoading(true);
    try {
      await apiClient.post("/admin/reset-progress", formData);
      toast.success("User progress reset successfully!");
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
        onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
        options={users.map((u) => ({ value: u.id, label: u.name }))}
        placeholder="Select User"
      />
      <SelectInput
        name="taluka"
        value={formData.taluka}
        onChange={(e) => setFormData({ ...formData, taluka: e.target.value })}
        options={talukas.map((t) => ({ value: t, label: t }))}
        placeholder="Select Taluka"
        disabled={!formData.userId || talukas.length === 0}
      />
      <button
        type="submit"
        disabled={loading || !formData.taluka}
        className="flex items-center justify-center px-4 py-2.5 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-300 w-full"
      >
        <RefreshCw className="w-5 h-5 mr-2" />
        {loading ? <Loader2 className="animate-spin" /> : "Reset Progress"}
      </button>
    </form>
  );
};

const DangerZone = () => {
  const [loading, setLoading] = useState({});

  const handleAction = async (actionType, confirmText, endpoint) => {
    if (!window.confirm(confirmText)) return;
    setLoading((prev) => ({ ...prev, [actionType]: true }));
    try {
      await apiClient.post(endpoint);
      toast.success("Operation completed successfully.");
    } catch (err) {
      toast.error("Operation failed.");
    } finally {
      setLoading((prev) => ({ ...prev, [actionType]: false }));
    }
  };

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
      <div className="flex items-center">
        <AlertTriangle className="w-6 h-6 mr-3 text-red-500 flex-shrink-0" />
        <h2 className="text-xl font-semibold text-red-800">
          System Danger Zone
        </h2>
      </div>
      <p className="text-red-700 mt-2 text-sm">
        Permanently reset system-wide data. Use with extreme caution. These
        actions cannot be undone.
      </p>
      <div className="mt-4 flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
        <button
          onClick={() =>
            handleAction(
              "resetData",
              "ARE YOU ABSOLUTELY SURE? This will delete ALL processed records and cannot be undone.",
              "/admin/danger-zone/reset-all-data"
            )
          }
          disabled={loading.resetData}
          className="w-full sm:w-auto flex items-center justify-center px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400"
        >
          {loading.resetData ? (
            <Loader2 className="animate-spin mr-2" />
          ) : (
            <DatabaseZap className="w-5 h-5 mr-2" />
          )}{" "}
          Reset All Processed Data
        </button>
        <button
          onClick={() =>
            handleAction(
              "resetCounters",
              "ARE YOU ABSOLUTELY SURE? This will reset ALL bundle counters and user states. This cannot be undone.",
              "/admin/danger-zone/reset-all-counters"
            )
          }
          disabled={loading.resetCounters}
          className="w-full sm:w-auto flex items-center justify-center px-4 py-2 font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:bg-red-400"
        >
          {loading.resetCounters ? (
            <Loader2 className="animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-5 h-5 mr-2" />
          )}{" "}
          Reset All Counters & Bundles
        </button>
      </div>
    </div>
  );
};
