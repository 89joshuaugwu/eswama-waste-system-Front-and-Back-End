import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from './NotificationBell.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="relative z-[1200] bg-eswama-dark text-white px-4 sm:px-6 py-4 flex items-center justify-between gap-3 shadow-sm">
      <Link to="/" className="font-semibold text-sm sm:text-lg flex items-center gap-2">
        <img src="/logo.png" alt="ESWAMA Logo" className="h-8 w-8 object-contain rounded-full bg-white p-0.5" />
        <span>ESWAMA<span className="hidden sm:inline"> Waste Tracker</span></span>
      </Link>
      <div className="flex items-center gap-3 sm:gap-4 text-sm">
        {user && (
          <>
            <NotificationBell user={user} />
            <span className="hidden sm:inline ml-2">
              {user.full_name} <span className="opacity-70">({user.role})</span>
            </span>
            <button
              onClick={handleLogout}
              className="bg-eswama-green hover:bg-green-700 px-3 py-1.5 rounded-md transition"
            >
              Log out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
