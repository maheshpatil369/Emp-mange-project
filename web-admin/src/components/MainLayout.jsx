// import { Link, useLocation, Outlet } from "react-router-dom";
// import { useAuth } from "../services/AuthContext";
// import { Users, BarChart3, LogOut, Database } from "lucide-react";

// // This component is now the main layout wrapper
// function MainLayout() {
//   const location = useLocation();
//   const { currentUser, logout } = useAuth();

//   const navigation = [
//     { name: "Dashboard", href: "/", icon: BarChart3 },
//     { name: "Users", href: "/users", icon: Users },
//     { name: "Data Management", href: "/data-management", icon: Database },
//     { name: "Analytics", href: "/analytics", icon: Database },
//   ];

//   const handleSignOut = async () => {
//     try {
//       await logout();
//     } catch (error) {
//       console.error("Error signing out:", error);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-100">
//       {/* Sidebar */}
//       <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900">
//         <div className="flex h-16 shrink-0 items-center px-6">
//           <h1 className="text-xl font-bold text-white">Admin Central</h1>
//         </div>
//         <nav className="mt-8">
//           <ul role="list" className="flex flex-col gap-y-1 px-6">
//             {navigation.map((item) => (
//               <li key={item.name}>
//                 <Link
//                   to={item.href}
//                   className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
//                     location.pathname === item.href
//                       ? "bg-gray-800 text-white"
//                       : "text-gray-400 hover:text-white hover:bg-gray-800"
//                   }`}
//                 >
//                   <item.icon className="h-6 w-6 shrink-0" />
//                   {item.name}
//                 </Link>
//               </li>
//             ))}
//           </ul>
//         </nav>

//         {/* User info and sign out */}
//         <div className="absolute bottom-0 w-full p-6 border-t border-gray-800">
//           <div className="flex items-center gap-x-3 mb-4">
//             <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
//               <span className="text-sm font-medium text-white">
//                 {currentUser?.email?.charAt(0).toUpperCase()}
//               </span>
//             </div>
//             <div className="text-sm text-gray-300 truncate">
//               {currentUser?.email}
//             </div>
//           </div>
//           <button
//             onClick={handleSignOut}
//             className="flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800"
//           >
//             <LogOut className="h-6 w-6" />
//             Sign Out
//           </button>
//         </div>
//       </div>

//       {/* Main content */}
//       <div className="pl-64">
//         <main className="py-8">
//           <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
//             <Outlet />
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// }

// export default MainLayout;



import { Link, useLocation, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../services/AuthContext";

// LOGIC UNCHANGED: Importing your original icons + ShieldCheck for the new UI
import { 
    ShieldCheck, 
    Users, 
    BarChart3, 
    LogOut, 
    Database 
} from "lucide-react";

// The MainLayout component wraps the entire authenticated part of the app.
function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  // LOGIC UNCHANGED: Using your exact original navigation array.
  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Users", href: "/users", icon: Users },
    { name: "Data Management", href: "/data-management", icon: Database },
    { name: "Analytics", href: "/analytics", icon: Database }, // Note: Original had Database icon for Analytics too
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