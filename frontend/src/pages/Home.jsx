// src/pages/Home.jsx
import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { LogoUploader } from '../components/ui/LogoUploader';
import {
  ChartBarIcon,
  UsersIcon,
  ShoppingCartIcon,
  CalendarIcon,
  Bars3Icon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // const handleLogout = () => {
  //   logout();
  //   navigate('/login');
  // };

  const menu = [
    { name: 'Customers', icon: UsersIcon, to: '/customerDashboard' },
    { name: 'Charts & Dashboards', icon: ChartBarIcon, to: '/charts' },
    { name: 'Workers', icon: UsersIcon, to: '/workers' },
    { name: 'Daily Sales', icon: CalendarIcon, to: '/daily-sales' },
    { name: 'Shop', icon: ShoppingCartIcon, to: '/shop' },
  ]

  const Sidebar = ({ onClickLink }) => (
    <div className="h-full flex flex-col bg-white border-r p-4">
      <div className="flex items-center mb-8">
        {/* <img src="/logo.png" alt="Logo" className="h-8 w-8 rounded mr-2" /> */}
          <LogoUploader onChange={() => {}} />
        <span className="text-xl font-bold">My Shop</span>
      </div>
      <nav className="flex-1 space-y-1">
        {menu.map(item => (
          <Link
            key={item.name}
            to={item.to}
            onClick={onClickLink}
            className="flex items-center space-x-3 px-3 py-2 rounded hover:bg-gray-100 transition"
          >
            <item.icon className="h-6 w-6 text-blue-600" />
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="fixed inset-0 bg-black opacity-30"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 bg-white shadow-xl">
            <button
              className="absolute top-4 right-4 p-2"
              onClick={() => setMobileOpen(false)}
            >
              <XMarkIcon className="h-6 w-6 text-gray-700" />
            </button>
            <Sidebar onClickLink={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar for mobile */}
        <header className="md:hidden flex items-center justify-between bg-white p-4 border-b">
          <button onClick={() => setMobileOpen(true)}>
            <Bars3Icon className="h-6 w-6 text-gray-700" />
          </button>
          <div className="flex items-center space-x-2">
            <img src="/logo.png" alt="Logo" className="h-8 w-8 rounded" />
            <span className="font-bold">My Shop</span>
          </div>
          <button onClick={() => navigate(-1)} className="text-gray-600">
            Back
          </button>
        </header>

        <main className="flex-1 p-6 bg-gray-50 overflow-auto">
          <h1 className="text-2xl font-bold mb-6">Welcome back!</h1>
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {menu.map(item => (
              <Link
                key={item.name}
                to={item.to}
                className="bg-white rounded-lg shadow p-6 flex flex-col items-center hover:shadow-md transition"
              >
                <item.icon className="h-10 w-10 text-blue-600 mb-4" />
                <span className="text-lg font-medium">{item.name}</span>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}
