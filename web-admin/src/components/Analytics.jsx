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
  PieChart,
  Pie,
  Cell,
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
  CopyX,
  PieChart as PieChartIcon,
  BarChart3,
  ListOrdered,
  Award,
  Filter,
  Table,
  AreaChart,
  FileTextIcon,
  CheckSquare,
} from "lucide-react";
import apiClient from "../lib/axios";

// --- Reusable UI Components ---

const AnalyticsCard = ({ icon, title, children, controls, className = "" }) => (
  <div
    className={`bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col ${className}`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center">
        <div className="mr-3 text-blue-600">{icon}</div>
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
          {title}
        </h2>
      </div>
      {controls && <div>{controls}</div>}
    </div>
    <div className="flex-grow flex flex-col">{children}</div>
  </div>
);

const StatCard = ({ icon, title, value, color = "text-blue-500" }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between transition-all hover:shadow-md hover:border-blue-300 min-h-[110px]">
    <div className="flex justify-between items-start">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      <div
        className={`p-2 rounded-full ${color} bg-opacity-10 text-opacity-100`}
      >
        {React.cloneElement(icon, { className: "w-5 h-5" })}
      </div>
    </div>
    <div>
      <p className="text-3xl font-bold text-gray-800 tracking-tight">
        {value?.toLocaleString() ?? "0"}
      </p>
    </div>
  </div>
);

const StatCardSkeleton = () => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between animate-pulse min-h-[110px]">
    <div className="flex justify-between items-start">
      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      <div className="h-9 w-9 bg-gray-200 rounded-full"></div>
    </div>
    <div>
      <div className="h-8 bg-gray-300 rounded w-3/4 mt-1"></div>
    </div>
  </div>
);

const EmptyState = ({ message = "No data available to display." }) => (
  <div className="text-center h-full flex items-center justify-center py-10 px-4 text-gray-500 bg-gray-50 rounded-lg">
    <p>{message}</p>
  </div>
);

const ViewSwitcher = ({ view, setView }) => (
  <div className="flex items-center gap-2">
    <button
      onClick={() => setView("chart")}
      className={`p-2 rounded-md ${
        view === "chart"
          ? "bg-blue-100 text-blue-600"
          : "text-gray-500 hover:bg-gray-100"
      }`}
    >
      <AreaChart size={20} />
    </button>
    <button
      onClick={() => setView("table")}
      className={`p-2 rounded-md ${
        view === "table"
          ? "bg-blue-100 text-blue-600"
          : "text-gray-500 hover:bg-gray-100"
      }`}
    >
      <Table size={20} />
    </button>
  </div>
);

// --- Main Analytics Page ---
const AnalyticsPage = () => {
  const [data, setData] = useState({ analytics: null, config: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [analyticsRes, configRes] = await Promise.all([
          apiClient.get("/admin/analytics"),
          apiClient.get("/data/config"),
        ]);
        setData({ analytics: analyticsRes.data, config: configRes.data });
      } catch (err) {
        setError("Failed to load analytics data. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  if (loading) {
    return <AnalyticsPageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-red-600 bg-red-50 p-4 rounded-lg">
        <AlertTriangle className="w-6 h-6 mr-2" /> {error}
      </div>
    );
  }

  const { analytics, config } = data;
  const stats = analytics?.topLevelStats;

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50">
      <h1 className="text-3xl font-bold text-gray-800">Analytics Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard
          icon={<FileText />}
          title="Total Records"
          value={stats?.totalExcelRecords}
        />
        <StatCard
          icon={<CheckCircle />}
          title="Completed"
          value={stats?.completedRecords}
          color="text-green-500"
        />
        <StatCard
          icon={<Clock />}
          title="Pending"
          value={stats?.pendingRecords}
          color="text-orange-500"
        />
        <StatCard
          icon={<FileWarning />}
          title="PDFs Required"
          value={stats?.pdfRequired}
          color="text-red-500"
        />
        {/* <StatCard
          icon={<CopyX />}
          title="Duplicates"
          value={stats?.totalDuplicates}
          color="text-purple-500"
        /> */}
        <StatCard
          icon={<Users />}
          title="Users"
          value={stats?.registeredUsers}
        />
        <StatCard
          icon={<Package />}
          title="Active Bundles"
          value={stats?.activeBundles}
        />
        <br />
        <StatCard
          icon={<CheckSquare className="text-green-500" />} // ✅ Completion checkmark
          title="Today Processed Records"
          value={stats?.todayProcessedRecords}
        />
        <StatCard
          icon={<FileTextIcon className="text-blue-500" />} // 📄 Document icon for PDFs
          title="Today PDF Required"
          value={stats?.todayPdfRequired}
        />
      </div>

      {/* Refined Vertical Layout */}
      <div className="space-y-6">
        <AnalyticsCard
          icon={<PieChartIcon size={24} />}
          title="Overall Record Status"
        >
          <OverallStatusChart stats={stats} />
        </AnalyticsCard>
        <FileStatusSection data={analytics?.processingStatusByFile} />
        <UserLeaderboardSection data={analytics?.userLeaderboard} />
        {/* <DuplicateLeaderboardSection
          data={analytics?.duplicateStats?.duplicateLeaderboard}
        /> */}
        <BundleCompletionSummary
          data={analytics?.bundleCompletionSummary}
          config={config}
        />
      </div>
    </div>
  );
};

// --- Skeleton Component for the entire page ---
const AnalyticsPageSkeleton = () => (
  <div className="p-4 md:p-6 space-y-6 bg-gray-50 animate-pulse">
    <div className="h-9 w-72 bg-gray-300 rounded-md"></div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {Array.from({ length: 7 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    <div className="space-y-6">
      <div className="h-96 bg-gray-200 rounded-xl"></div>
      <div className="h-96 bg-gray-200 rounded-xl"></div>
      <div className="h-[40rem] bg-gray-200 rounded-xl"></div>
    </div>
  </div>
);

// --- Sections with View Toggles ---

const FileStatusSection = ({ data }) => {
  const [view, setView] = useState("chart");
  return (
    <AnalyticsCard
      icon={<BarChart3 size={24} />}
      title="Processing Status by File"
      controls={<ViewSwitcher view={view} setView={setView} />}
    >
      {view === "chart" ? (
        <FileStatusChart data={data} />
      ) : (
        <FileStatusTable data={data} />
      )}
    </AnalyticsCard>
  );
};

const UserLeaderboardSection = ({ data }) => {
  const [view, setView] = useState("chart");
  return (
    <AnalyticsCard
      icon={<Award size={24} />}
      title="User Leaderboard"
      controls={<ViewSwitcher view={view} setView={setView} />}
    >
      {view === "chart" ? (
        <UserLeaderboardChart data={data} />
      ) : (
        <UserLeaderboardTable data={data} />
      )}
    </AnalyticsCard>
  );
};

const DuplicateLeaderboardSection = ({ data }) => {
  const [view, setView] = useState("chart");
  return (
    <AnalyticsCard
      icon={<CopyX size={24} />}
      title="Duplicate Submissions Leaderboard"
      controls={<ViewSwitcher view={view} setView={setView} />}
    >
      {view === "chart" ? (
        <DuplicateLeaderboardChart data={data} />
      ) : (
        <DuplicateLeaderboardTable data={data} />
      )}
    </AnalyticsCard>
  );
};

// --- Chart Components ---

const OverallStatusChart = ({ stats }) => {
  const data = useMemo(
    () =>
      [
        { name: "Completed", value: stats?.completedRecords ?? 0 },
        { name: "Pending", value: stats?.pendingRecords ?? 0 },
        { name: "PDFs Required", value: stats?.pdfRequired ?? 0 },
      ].filter((d) => d.value > 0),
    [stats]
  );
  const COLORS = ["#10b981", "#f97316", "#ef4444"];

  return data.length > 0 ? (
    <div className="w-full h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={110}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip formatter={(value) => value.toLocaleString()} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <EmptyState />
  );
};

const FileStatusChart = ({ data }) => {
  return data && data.length > 0 ? (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            type="category"
            dataKey="fileName"
            width={150}
            tick={{ fontSize: 12 }}
          />
          <Tooltip formatter={(value) => value.toLocaleString()} />
          <Legend />
          <Bar
            dataKey="completed"
            stackId="a"
            fill="#10b981"
            name="Completed"
          />
          <Bar dataKey="pending" stackId="a" fill="#f97316" name="Pending" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <EmptyState />
  );
};

const UserLeaderboardChart = ({ data }) => {
  const topUsers = useMemo(() => (data || []).slice(0, 10).reverse(), [data]);
  return topUsers && topUsers.length > 0 ? (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={topUsers} layout="vertical" margin={{ right: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            type="category"
            dataKey="userName"
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip
            cursor={{ fill: "#f3f4f6" }}
            formatter={(value) => value.toLocaleString()}
          />
          <Bar
            dataKey="recordsProcessed"
            fill="#3b82f6"
            name="Records Processed"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <EmptyState />
  );
};

const DuplicateLeaderboardChart = ({ data }) => {
  const topUsers = useMemo(() => (data || []).slice(0, 5).reverse(), [data]);
  return topUsers && topUsers.length > 0 ? (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={topUsers} layout="vertical" margin={{ right: 40 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis type="number" />
          <YAxis
            type="category"
            dataKey="userName"
            tick={{ fontSize: 12 }}
            width={80}
          />
          <Tooltip
            cursor={{ fill: "#f3f4f6" }}
            formatter={(value) => value.toLocaleString()}
          />
          <Bar dataKey="duplicateCount" fill="#8b5cf6" name="Duplicate Count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <EmptyState />
  );
};

// --- TABLE COMPONENTS (NO SCROLLBARS) ---

const FileStatusTable = ({ data }) => (
  <div className="overflow-x-auto">
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
        {(data || []).length > 0 ? (
          (data || []).map((file) => (
            <tr key={file.fileName}>
              <td className="px-6 py-4 whitespace-normal break-words text-sm font-medium">
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
          ))
        ) : (
          <tr>
            <td colSpan="5">
              <EmptyState />
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const UserLeaderboardTable = ({ data }) => (
  <div className="overflow-x-auto">
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
        {(data || []).length > 0 ? (
          (data || []).map((user) => (
            <tr key={user.userName}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                {user.rank}
              </td>
              <td className="px-6 py-4 whitespace-normal break-words text-sm">
                {user.userName}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                {user.recordsProcessed.toLocaleString()}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="3">
              <EmptyState />
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const DuplicateLeaderboardTable = ({ data }) => {
  const rankedData = (data || []).map((user, index) => ({
    ...user,
    rank: index + 1,
  }));
  return (
    <div className="overflow-x-auto">
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
              Duplicate Count
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rankedData.length > 0 ? (
            rankedData.map((user) => (
              <tr key={user.userName}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold">
                  {user.rank}
                </td>
                <td className="px-6 py-4 whitespace-normal break-words text-sm">
                  {user.userName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                  {user.duplicateCount.toLocaleString()}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3">
                <EmptyState message="No duplicate submission data found." />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// --- Bundle Completion Summary ---
const BundleCompletionSummary = ({ data = [], config = {} }) => {
  const [filters, setFilters] = useState({
    location: "",
    taluka: "",
    status: "",
    user: "",
  });
  const [talukaOptions, setTalukaOptions] = useState([]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };
      if (key === "location") {
        newFilters.taluka = "";
        const matchingLocation = config.talukas?.find(
          (entry) => entry.locationSlug === value
        );
        setTalukaOptions(matchingLocation?.talukas || []);
      }
      return newFilters;
    });
  };

  const uniqueStatuses = useMemo(
    () =>
      Array.from(
        new Set((data || []).map((item) => item.status).filter(Boolean))
      ),
    [data]
  );

  const filteredData = useMemo(() => {
    return (data || []).filter(
      (item) =>
        (filters.location ? item.location === filters.location : true) &&
        (filters.taluka ? item.taluka === filters.taluka : true) &&
        (filters.status ? item.status === filters.status : true) &&
        (filters.user
          ? (item.userName || "")
              .toLowerCase()
              .includes(filters.user.toLowerCase())
          : true)
    );
  }, [data, filters]);

  const getStatusClass = (status) => {
    switch (status) {
      case "Completed by User":
        return "bg-green-100 text-green-800";
      case "Force Completed by Admin":
        return "bg-red-100 text-red-800";
      case "In Progress":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <AnalyticsCard
      icon={<ListOrdered size={24} />}
      title="Bundle Completion Summary"
    >
      <div className="mb-4 p-4 border bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={16} className="text-gray-600" />
          <h3 className="font-semibold text-gray-700">Filters</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <select
            value={filters.location}
            onChange={(e) => handleFilterChange("location", e.target.value)}
            className="p-2 border rounded-md bg-white w-full"
          >
            <option value="">All Locations</option>
            {config.locations?.map((loc) => (
              <option key={loc.slug} value={loc.slug}>
                {loc.name}
              </option>
            ))}
          </select>
          <select
            value={filters.taluka}
            onChange={(e) => handleFilterChange("taluka", e.target.value)}
            className="p-2 border rounded-md bg-white w-full"
            disabled={!filters.location}
          >
            <option value="">All Talukas</option>
            {talukaOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="p-2 border rounded-md bg-white w-full"
          >
            <option value="">All Statuses</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Search by user..."
            value={filters.user}
            onChange={(e) => handleFilterChange("user", e.target.value)}
            className="p-2 border rounded-md w-full"
          />
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                "User",
                "Location",
                "Taluka",
                "Bundle",
                "Processed",
                "PDFs Req.",
                "Status",
              ].map((h) => (
                <th
                  key={h}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredData.length > 0 ? (
              filteredData.map((bundle, i) => (
                <tr
                  key={`${bundle.userName}-${bundle.bundleNo}-${i}`}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    {bundle.userName}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    {bundle.location}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    {bundle.taluka}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    #{bundle.bundleNo}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    {bundle.recordsProcessed}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    {bundle.pdfsRequired ?? 0}
                  </td>
                  <td className="px-6 py-4 text-sm whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(
                        bundle.status
                      )}`}
                    >
                      {bundle.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">
                  <EmptyState message="No bundles match the current filters." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AnalyticsCard>
  );
};

export default AnalyticsPage;
