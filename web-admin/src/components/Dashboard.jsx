
import React, { useState, useEffect } from "react";
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
import apiClient from "../lib/axios"; // Import our configured Axios instance

// --- Main Dashboard Page Component ---
const DashboardPage = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setError("");
        setLoading(true);
        // Fetch the comprehensive analytics data from our backend
        const response = await apiClient.get("/admin/analytics");
        setAnalyticsData(response.data);
      } catch (err) {
        console.error("Failed to fetch analytics data:", err);
        setError("Could not load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
 <div className="flex flex-col items-center justify-center min-h-screen space-y-3 bg-gray-50">
  <Loader2 className="w-10 h-10 animate-spin text-green-500" />
  <p className="text-black font-medium text-lg">Loading Dashboard...</p>
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

  // Destructure the data for easier use
  const stats = analyticsData?.topLevelStats;
  const locationData = analyticsData?.recordsByLocation;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>

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

      {/* Charts Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Processed Records by Location
        </h2>
        <div style={{ width: "100%", height: 400 }}>
          <ResponsiveContainer>
            <BarChart
              data={locationData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#4f46e5" name="Records Processed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

// --- Helper Component for Statistic Cards ---
const StatCard = ({ icon, title, value, color = "text-blue-500" }) => {
  return (
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
};

export default DashboardPage;
