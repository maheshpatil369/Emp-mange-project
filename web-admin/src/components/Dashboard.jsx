import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  Users,
  FileText,
  CheckCircle,
  Clock,
  Package,
  AlertTriangle,
  FileWarning,
  RefreshCw,
  TrendingUp,
  MapPin,
  PieChart as PieIcon,
} from "lucide-react";

import apiClient from "../lib/axios";

// --- Reusable UI Components (No changes here) ---

const DashboardCard = ({ icon, title, children, className = "" }) => (
  <div
    className={`bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full ${className}`}
  >
    <div className="flex items-center mb-4">
      <div className="mr-3 text-blue-600">{icon}</div>
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
        {title}
      </h2>
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

// --- Main Dashboard Page ---
const DashboardPage = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRecalculating, setIsRecalculating] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        "/admin/analytics/dashboard-summary"
      );
      setAnalyticsData(response.data);
    } catch (err) {
      setError("Could not load dashboard data. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleRecalculation = async () => {
    const password = window.prompt(
      "This is a sensitive operation. Please enter the admin password to continue:"
    );

    // --- 1. Check if the user cancelled or entered nothing ---
    if (password === null) {
      return; // User clicked "Cancel"
    }

    // --- 2. Set your secure password here ---
    const CORRECT_PASSWORD = import.meta.env.VITE_RECALCULATE_PASSWORD;

    // --- 3. Validate the password ---
    if (password !== CORRECT_PASSWORD) {
      alert("Incorrect password. Aborting operation.");
      return;
    }

    setIsRecalculating(true);
    try {
      await apiClient.post("/admin/analytics/recalculate");
      alert(
        "Recalculation completed successfully! The dashboard will now refresh."
      );
      fetchAnalytics(); // Refresh the data
    } catch (err) {
      alert(
        "Failed to start recalculation. Please check the browser console for errors."
      );
      console.error("Recalculation trigger error:", err);
    } finally {
      setIsRecalculating(false);
    }
  };

  if (loading && !analyticsData) {
    return <DashboardPageSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-600 bg-red-50 p-4 rounded-lg">
        <AlertTriangle className="w-6 h-6 mr-2" /> {error}
      </div>
    );
  }

  const {
    totalExcelRecords,
    completedRecords,
    pendingRecords,
    registeredUsers,
    activeBundles,
    pdfsRequired,
    recordsByLocation,
    recordsProcessedByDate,
  } = analyticsData || {};

  const recordStatusData = [
    { name: "Completed", value: completedRecords ?? 0 },
    { name: "Pending", value: pendingRecords ?? 0 },
    { name: "PDFs Required", value: pdfsRequired ?? 0 },
  ].filter((item) => item.value > 0);

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gray-50">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <button
          onClick={handleRecalculation}
          disabled={isRecalculating}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-sm hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${isRecalculating ? "animate-spin" : ""}`}
          />
          {isRecalculating ? "Recalculating..." : "Recalculate Analytics"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          icon={<FileText />}
          title="Total Records"
          value={totalExcelRecords}
        />
        <StatCard
          icon={<CheckCircle />}
          title="Completed"
          value={completedRecords}
          color="text-green-500"
        />
        <StatCard
          icon={<Clock />}
          title="Pending"
          value={pendingRecords}
          color="text-orange-500"
        />
        <StatCard
          icon={<FileWarning />}
          title="PDFs Required"
          value={pdfsRequired}
          color="text-red-500"
        />
        <StatCard icon={<Users />} title="Users" value={registeredUsers} />
        <StatCard
          icon={<Package />}
          title="Active Bundles"
          value={activeBundles}
        />
      </div>

      <div className="space-y-6">
        {/* Pass the data directly, as it's already formatted by the backend */}
        <ProgressChart data={recordsProcessedByDate} />
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            {/* Pass the data directly, no transformation needed */}
            <LocationChart data={recordsByLocation} />
          </div>
          <div className="lg:col-span-2">
            <StatusPieChart data={recordStatusData} />
          </div>
        </div>
      </div>
    </div>
  );
};

const DashboardPageSkeleton = () => (
  <div className="p-4 md:p-6 space-y-6 bg-gray-50 animate-pulse">
    <div className="h-9 w-64 bg-gray-300 rounded-md"></div>
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
    <div className="h-96 bg-gray-200 rounded-xl"></div>
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 h-96 bg-gray-200 rounded-xl"></div>
      <div className="lg:col-span-2 h-96 bg-gray-200 rounded-xl"></div>
    </div>
  </div>
);

// --- Chart Components ---

const ProgressChart = ({ data }) => {
  // --- THIS COMPONENT IS NOW SIMPLIFIED ---
  // No useMemo hook is needed because the backend sends the data ready for display.
  return (
    <DashboardCard
      icon={<TrendingUp size={24} />}
      title="Last 7 Days Processing Progress"
    >
      {data && data.length > 0 ? (
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data} // Use the data prop directly
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value) => [
                  value.toLocaleString(),
                  "Records Processed",
                ]}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#1d4ed8"
                fill="#60a5fa"
                name="Records Processed"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState message="No day-wise progress data available yet." />
      )}
    </DashboardCard>
  );
};

const LocationChart = ({ data }) => (
  // This component doesn't need any changes, it already expects the correct data format.
  <DashboardCard
    icon={<MapPin size={24} />}
    title="Processed Records by Location"
  >
    {data && data.length > 0 ? (
      <div className="w-full h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip
              wrapperClassName="shadow-lg rounded-md"
              formatter={(value) => value.toLocaleString()}
            />
            <Legend />
            <Bar
              dataKey="value"
              fill="#4f46e5"
              name="Records Processed"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <EmptyState message="No location data available to display." />
    )}
  </DashboardCard>
);

const StatusPieChart = ({ data }) => {
  const COLORS = ["#10b981", "#f97316", "#ef4444"];
  return (
    <DashboardCard icon={<PieIcon size={24} />} title="Record Status Breakdown">
      {data.length > 0 ? (
        <div className="w-full h-96">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value.toLocaleString(), name]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState message="No record status to analyze yet." />
      )}
    </DashboardCard>
  );
};

export default DashboardPage;
