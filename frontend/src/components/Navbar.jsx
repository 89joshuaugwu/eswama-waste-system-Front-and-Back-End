import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="bg-eswama-dark text-white px-4 py-3 flex items-center justify-between">
      <Link to="/" className="font-semibold text-lg">
        ESWAMA Waste Tracker
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {user && (
          <>
            <span className="hidden sm:inline">
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
