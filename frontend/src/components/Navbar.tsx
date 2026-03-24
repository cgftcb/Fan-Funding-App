import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Heart,
  Menu,
  X,
  User,
  LogOut,
  LayoutDashboard,
  Plus,
  Settings,
  Stethoscope,
} from 'lucide-react';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const getDashboardPath = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'PATIENT': return '/patient/dashboard';
      case 'CONTRIBUTOR': return '/contributor/dashboard';
      case 'SURGEON': return '/surgeon/dashboard';
      case 'ADMIN': return '/admin/dashboard';
      default: return '/';
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-pink-400 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <Heart className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gradient">FanFunding</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/listings"
              className={`text-sm font-medium transition-colors ${
                isActive('/listings') ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              Browse Listings
            </Link>
            <Link
              to="/surgeons"
              className={`text-sm font-medium transition-colors ${
                isActive('/surgeons') ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              Find Surgeons
            </Link>
            {isAuthenticated && user?.role === 'PATIENT' && (
              <Link
                to="/listings/create"
                className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <Plus className="w-4 h-4" />
                New Listing
              </Link>
            )}
          </div>

          {/* Auth buttons */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to={getDashboardPath()}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link
                  to="/profile"
                  className="flex items-center gap-2"
                >
                  {user?.profile?.avatarUrl ? (
                    <img
                      src={user.profile.avatarUrl}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full object-cover border-2 border-primary-100"
                    />
                  ) : (
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-primary-600" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 max-w-[120px] truncate">
                    {user?.profile?.fullName || user?.email}
                  </span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-gray-600 hover:text-primary-600 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-sm"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white py-4 px-4 space-y-3">
          <Link
            to="/listings"
            className="block text-sm font-medium text-gray-700 hover:text-primary-600 py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            Browse Listings
          </Link>
          <Link
            to="/surgeons"
            className="block text-sm font-medium text-gray-700 hover:text-primary-600 py-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            <span className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4" />
              Find Surgeons
            </span>
          </Link>
          {isAuthenticated ? (
            <>
              <Link
                to={getDashboardPath()}
                className="block text-sm font-medium text-gray-700 hover:text-primary-600 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </span>
              </Link>
              {user?.role === 'PATIENT' && (
                <Link
                  to="/listings/create"
                  className="block text-sm font-medium text-primary-600 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    New Listing
                  </span>
                </Link>
              )}
              <Link
                to="/profile"
                className="block text-sm font-medium text-gray-700 hover:text-primary-600 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Profile Settings
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left text-sm font-medium text-red-600 py-2"
              >
                <span className="flex items-center gap-2">
                  <LogOut className="w-4 h-4" />
                  Logout
                </span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="block text-sm font-medium text-gray-700 py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="block btn-primary text-sm text-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
