
import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";

// LOGIC UNCHANGED: Importing your original icons + ShieldCheck for the new UI
import { 
    ShieldCheck, 
    Users, 
    LayoutDashboard, 
    LogOut, 
    Database,
    LineChart
} from "lucide-react";


// The MainLayout component wraps the entire authenticated part of the app.
function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  // LOGIC UNCHANGED: Using your exact original navigation array.
const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Users", href: "/users", icon: Users },
  { name: "Data Management", href: "/data-management", icon: Database },
  { name: "Analytics", href: "/analytics", icon: LineChart },
];

  // LOGIC UNCHANGED: Your original logout handler.
  const handleSignOut = async () => {
    try {
      await logout();
      navigate("/login"); 
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    // UI CHANGED: The overall structure and styling is updated to match the screenshot.
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* --- Sidebar --- */}
      <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-gray-200 bg-white">
        
        {/* Sidebar Header */}
        <div className=" flex h-16 shrink-0 items-center gap-x-3 px-6 border-b border-gray-200">
          <ShieldCheck className="h-7 w-7 text-green-600" />
          <h1 className="text-lg font-bold text-gray-800 ">Admin Central</h1>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex flex-1 flex-col overflow-y-auto pt-4">
          <ul role="list" className="flex flex-1 flex-col gap-y-1.5 px-4">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`group flex items-center gap-x-3 rounded-md p-2.5 text-sm leading-6 font-semibold transition-colors duration-150 ${
                    location.pathname === item.href
                      ? "bg-green-50 text-green-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                  }`}
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Info and Sign Out Section */}
        <div className="w-full p-4 border-t border-gray-200">
            <div className="flex items-center gap-x-3 mb-3">
              <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-600">
                  {currentUser?.email?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-gray-800 truncate">Super Admin</p>
                <p className="text-xs text-gray-500 truncate">
                  {currentUser?.email || 'admin@example.com'}
                </p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="group flex w-full items-center gap-x-3 rounded-md p-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors duration-150"
            >
              <LogOut className="h-5 w-5" />
              Log Out
            </button>
        </div>
      </aside>

      {/* --- Main Content --- */}
      <div className="pl-60 w-full">
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout;