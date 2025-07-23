import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../services/AuthContext';
import {
  Users,
  Upload,
  BarChart3,
  Settings,
  LogOut,
  Database,
  AlertTriangle,
  FileDown,
  UserPlus
} from 'lucide-react';

// Import dashboard components
import Analytics from './Analytics';
import UsersManagement from './UsersManagement';
import DataUpload from './DataUpload';
import BundleManagement from './BundleManagement';
import DangerZone from './DangerZone';
import ExportData from './ExportData';

function Dashboard() {
  const location = useLocation();
  const { currentUser, logout } = useAuth();

  const navigation = [
    { name: 'Analytics', href: '/', icon: BarChart3, current: location.pathname === '/' },
    { name: 'Users', href: '/users', icon: Users, current: location.pathname === '/users' },
    { name: 'Data Upload', href: '/upload', icon: Upload, current: location.pathname === '/upload' },
    { name: 'Bundle Management', href: '/bundles', icon: Database, current: location.pathname === '/bundles' },
    { name: 'Export Data', href: '/export', icon: FileDown, current: location.pathname === '/export' },
    { name: 'Danger Zone', href: '/danger', icon: AlertTriangle, current: location.pathname === '/danger' },
  ];

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900">
        <div className="flex h-16 shrink-0 items-center px-6">
          <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
        </div>
        <nav className="mt-8">
          <ul role="list" className="flex flex-col gap-y-1 px-6">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold ${
                    item.current
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  <item.icon className="h-6 w-6 shrink-0" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* User info and sign out */}
        <div className="absolute bottom-0 w-full p-6 border-t border-gray-800">
          <div className="flex items-center gap-x-3 mb-4">
            <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
              <span className="text-sm font-medium text-white">
                {currentUser?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="text-sm text-gray-300 truncate">
              {currentUser?.email}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <LogOut className="h-6 w-6" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Routes>
              <Route path="/" element={<Analytics />} />
              <Route path="/users" element={<UsersManagement />} />
              <Route path="/upload" element={<DataUpload />} />
              <Route path="/bundles" element={<BundleManagement />} />
              <Route path="/export" element={<ExportData />} />
              <Route path="/danger" element={<DangerZone />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;