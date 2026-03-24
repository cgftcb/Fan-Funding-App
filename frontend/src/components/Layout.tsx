import React from 'react';
import Navbar from './Navbar';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

export default function Layout({ children, className = '' }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className={`flex-1 ${className}`}>
        {children}
      </main>
      <footer className="bg-white border-t border-gray-100 py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-pink-400 rounded-lg flex items-center justify-center">
                  <Heart className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold text-gradient">FanFunding</span>
              </div>
              <p className="text-gray-500 text-sm max-w-sm">
                Community-funded cosmetic and plastic surgery platform connecting patients with supportive contributors.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Platform</h4>
              <ul className="space-y-2">
                <li><Link to="/listings" className="text-sm text-gray-500 hover:text-primary-600">Browse Listings</Link></li>
                <li><Link to="/surgeons" className="text-sm text-gray-500 hover:text-primary-600">Find Surgeons</Link></li>
                <li><Link to="/register" className="text-sm text-gray-500 hover:text-primary-600">Join as Patient</Link></li>
                <li><Link to="/register" className="text-sm text-gray-500 hover:text-primary-600">Join as Contributor</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">For Surgeons</h4>
              <ul className="space-y-2">
                <li><Link to="/register" className="text-sm text-gray-500 hover:text-primary-600">Register Your Practice</Link></li>
                <li><Link to="/surgeon/dashboard" className="text-sm text-gray-500 hover:text-primary-600">Surgeon Portal</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs text-gray-400">
              &copy; {new Date().getFullYear()} FanFunding. All rights reserved.
            </p>
            <p className="text-xs text-gray-400">
              Platform for cosmetic surgery crowdfunding. Contributions held in secure escrow.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
