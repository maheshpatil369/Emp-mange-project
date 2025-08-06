// File: src/components/Analytics.jsx

import React, { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  Package,
  Loader2,
  AlertTriangle,
  FileWarning,
} from "lucide-react";
import apiClient from "../lib/axios";
import { ChevronDown, ChevronRight } from "lucide-react";

const AnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [config, setConfig] = useState(null);

  // State for filters
  const [locationFilter, setLocationFilter] = useState("");
  const [talukaFilter, setTalukaFilter] = useState("");

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        // Fetch both analytics and config data
        const [analyticsRes, configRes] = await Promise.all([
          apiClient.get("/admin/analytics"),
          apiClient.get("/data/config"),
        ]);
        setAnalyticsData(analyticsRes.data);
        setConfig(configRes.data);
      } catch (err) {
        setError("Failed to load analytics data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-600">
        <AlertTriangle className="w-6 h-6 mr-2" /> {error}
      </div>
    );
  }

  const stats = analyticsData?.topLevelStats;
  const locationData = analyticsData?.recordsByLocation;

  // Apply filters to the bundle summary data
  const filteredBundleSummary = analyticsData?.bundleCompletionSummary.filter(
    (bundle) => {
      const locationMatch =
        !locationFilter || bundle.location === locationFilter;
      const talukaMatch = !talukaFilter || bundle.taluka === talukaFilter;
      return locationMatch && talukaMatch;
    }
  );

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>

      {/* Statistic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard
          icon={<FileText />}
          title="Total Excel Records"
          value={stats?.totalExcelRecords}
        />
        <StatCard
          icon={<CheckCircle />}
          title="Completed Records"
          value={stats?.completedRecords}
          color="text-green-500"
        />
        <StatCard
          icon={<Clock />}
          title="Pending Records"
          value={stats?.pendingRecords}
          color="text-orange-500"
        />
        <StatCard
          icon={<FileWarning />}
          title="PDFs Required"
          value={stats?.pdfRequired}
          color="text-red-500"
        />
        <StatCard
          icon={<Users />}
          title="Registered Users"
          value={stats?.registeredUsers}
        />
        <StatCard
          icon={<Package />}
          title="Active Bundles"
          value={stats?.activeBundles}
        />
      </div>

      {/* Location Chart */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Processed Records by Location
        </h2>
        <div style={{ width: "100%", height: 400 }}>
          <ResponsiveContainer>
            <BarChart data={locationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#16a34a" name="Records Processed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Other Analytics Tables */}
      <ProcessingStatusByFile data={analyticsData?.processingStatusByFile} />
      <UserLeaderboard data={analyticsData?.userLeaderboard} />
      <BundleCompletionSummary
        data={filteredBundleSummary}
        config={config}
        onLocationChange={setLocationFilter}
        onTalukaChange={setTalukaFilter}
      />
    </div>
  );
};

// --- Helper Components ---
const StatCard = ({ icon, title, value, color = "text-blue-500" }) => (
  <div className="bg-white p-6 rounded-lg shadow-md flex items-center space-x-4">
    <div className={`p-3 rounded-full bg-gray-100 ${color}`}>
      {React.cloneElement(icon, { className: "w-6 h-6" })}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <p className="text-2xl font-bold text-gray-800">
        {value !== undefined ? value.toLocaleString() : "..."}
      </p>
    </div>
  </div>
);

const ProcessingStatusByFile = ({ data }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-xl font-semibold text-gray-700">
      Processing Status by Excel File
    </h2>
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              File Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Total
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Completed
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Pending
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
              Progress
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {data?.map((file) => (
            <tr key={file.fileName}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                {file.fileName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                {file.total}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                {file.completed}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600">
                {file.pending}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${file.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {file.progress}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const UserLeaderboard = ({ data = [] }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      {/* Header with collapse toggle */}
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-xl font-semibold text-gray-700">
          User Leaderboard
        </h2>
        <button
          className="text-sm text-blue-500 hover:underline flex items-center"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          {isOpen ? (
            <>
              <ChevronDown size={16} className="mr-1" />
              Collapse
            </>
          ) : (
            <>
              <ChevronRight size={16} className="mr-1" />
              Expand
            </>
          )}
        </button>
      </div>

      {/* Collapsible content */}
      {isOpen && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  User Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Records Processed
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((user) => (
                <tr key={user.userName}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                    {user.rank}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {user.userName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                    {user.recordsProcessed.toLocaleString()}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center py-6 text-gray-500">
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const BundleCompletionSummary = ({ data = [], config = {} }) => {
  const [locationFilter, setLocationFilter] = useState("");
  const [talukaFilter, setTalukaFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [talukaOptions, setTalukaOptions] = useState([]);
  const [isOpen, setIsOpen] = useState(true);

  const handleLocationChange = (e) => {
    const selectedLocation = e.target.value;
    setLocationFilter(selectedLocation);
    setTalukaFilter("");

    const matchingLocation = config.talukas?.find(
      (entry) => entry.locationSlug === selectedLocation
    );

    setTalukaOptions(matchingLocation?.talukas || []);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case "Completed by User":
        return "px-2 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800";
      case "Force Completed by Admin":
        return "px-2 inline-flex text-xs font-semibold rounded-full bg-red-100 text-red-800";
      case "In Progress":
        return "px-2 inline-flex text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800";
      default:
        return "px-2 inline-flex text-xs font-semibold rounded-full bg-gray-100 text-gray-800";
    }
  };

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(data.map((item) => item.status).filter(Boolean)));
  }, [data]);

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchLocation = locationFilter
        ? item.location === locationFilter
        : true;
      const matchTaluka = talukaFilter ? item.taluka === talukaFilter : true;
      const matchStatus = statusFilter ? item.status === statusFilter : true;
      const matchUser = searchTerm
        ? (item.userName || "").toLowerCase().includes(searchTerm.toLowerCase())
        : true;

      return matchLocation && matchTaluka && matchStatus && matchUser;
    });
  }, [data, locationFilter, talukaFilter, statusFilter, searchTerm]);

  console.log(filteredData);

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      {/* Header */}
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="text-xl font-semibold text-gray-700">
          Bundle Completion Summary
        </h2>
        <button
          className="text-sm text-blue-500 hover:underline flex items-center"
          onClick={(e) => {
            e.stopPropagation(); // Prevent double toggle
            setIsOpen(!isOpen);
          }}
        >
          {isOpen ? (
            <>
              <ChevronDown size={16} className="mr-1" />
              Collapse
            </>
          ) : (
            <>
              <ChevronRight size={16} className="mr-1" />
              Expand
            </>
          )}
        </button>
      </div>

      {/* Collapsible content */}
      {isOpen && (
        <>
          {/* Filters */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Location */}
            <select
              value={locationFilter}
              onChange={handleLocationChange}
              className="p-2 border rounded-md bg-gray-50"
            >
              <option value="">Filter by Location</option>
              {config.locations?.map((loc) => (
                <option key={loc.slug} value={loc.slug}>
                  {loc.name}
                </option>
              ))}
            </select>

            {/* Taluka */}
            <select
              value={talukaFilter}
              onChange={(e) => setTalukaFilter(e.target.value)}
              className="p-2 border rounded-md bg-gray-50"
              disabled={!locationFilter}
            >
              <option value="">Filter by Taluka</option>
              {talukaOptions.map((taluka) => (
                <option key={taluka} value={taluka}>
                  {taluka}
                </option>
              ))}
            </select>

            {/* Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="p-2 border rounded-md bg-gray-50"
            >
              <option value="">Filter by Status</option>
              {uniqueStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            {/* User Name */}
            <input
              type="text"
              placeholder="Search by user name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="p-2 border rounded-md"
            />
          </div>

          {/* Table */}
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "User Name",
                    "Location",
                    "Taluka",
                    "Bundle No.",
                    "Records Processed",
                    "PDFs Required",
                    "Status",
                  ].map((header) => (
                    <th
                      key={header}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.map((bundle) => (
                  <tr
                    key={`${bundle.location}-${bundle.taluka}-${
                      bundle.bundleNo
                    }-${Math.random()}`}
                  >
                    <td className="px-6 py-4 text-sm">{bundle.userName}</td>
                    <td className="px-6 py-4 text-sm">{bundle.location}</td>
                    <td className="px-6 py-4 text-sm">{bundle.taluka}</td>
                    <td className="px-6 py-4 text-sm">#{bundle.bundleNo}</td>
                    <td className="px-6 py-4 text-sm">
                      {bundle.recordsProcessed}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {bundle.pdfsRequired ?? 0}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={getStatusClass(bundle.status)}>
                        {bundle.status}
                      </span>
                    </td>
                  </tr>
                ))}

                {filteredData.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-6 text-gray-500">
                      No results found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default AnalyticsPage;
