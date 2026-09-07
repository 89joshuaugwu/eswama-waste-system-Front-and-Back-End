import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import PickupSchedule from '../components/PickupSchedule.jsx';
import MapView from '../components/MapView.jsx';
import api from '../api/client';
import { getSocket } from '../api/socket';
import Analytics from '../components/Analytics.jsx';

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState('');
  const [mapCenter, setMapCenter] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' or 'users'

  // User Management State
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ fullName: '', email: '', phone: '', password: '', role: 'driver' });
  const [creatingUser, setCreatingUser] = useState(false);
  const [userMsg, setUserMsg] = useState('');

  async function loadReports() {
    const { data } = await api.get('/reports');
    setReports(data.reports);
  }

  async function loadVehicles() {
    const { data } = await api.get('/locations/latest');
    setVehicles(data.vehicles.filter((v) => v.latitude && v.longitude));
  }

  async function loadUsers() {
    try {
      const { data } = await api.get('/auth/users');
      setUsers(data.users);
    } catch (err) {
      console.error('Failed to load users:', err);
    }
  }

  useEffect(() => {
    loadReports();
    loadVehicles();
    loadUsers();

    const socket = getSocket();
    if (socket) {
      socket.on('report:new', () => loadReports());
      socket.on('location:update', () => loadVehicles());
    }
    return () => {
      if (socket) {
        socket.off('report:new');
        socket.off('location:update');
      }
    };
  }, []);

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setMessage('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setMapCenter([latitude, longitude]);
        setMessage('Map centered on your location.');
      },
      (err) => {
        setMessage('Could not get your location. Please check your permissions.');
      },
      { enableHighAccuracy: true }
    );
  }

  async function handleSelectReport(report) {
    setSelectedReport(report);
    setSuggestion(null);
    setMessage('');
    try {
      const { data } = await api.get(`/tasks/nearest-driver?reportId=${report.report_id}`);
      setSuggestion(data.suggestedDriver);
    } catch (err) {
      setMessage(err.response?.data?.error || 'No available driver could be suggested.');
    }
  }

  async function handleAssign() {
    if (!selectedReport || !suggestion) return;
    setAssigning(true);
    try {
      await api.post('/tasks', {
        reportId: selectedReport.report_id,
        driverId: suggestion.driver_id,
      });
      setMessage(`Task assigned to ${suggestion.full_name}.`);
      setSelectedReport(null);
      setSuggestion(null);
      loadReports();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not assign task.');
    } finally {
      setAssigning(false);
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    setCreatingUser(true);
    setUserMsg('');
    try {
      await api.post('/auth/users', newUser);
      setUserMsg('User created successfully.');
      setNewUser({ fullName: '', email: '', phone: '', password: '', role: 'driver' });
      loadUsers();
    } catch (err) {
      setUserMsg(err.response?.data?.error || 'Could not create user.');
    } finally {
      setCreatingUser(false);
    }
  }

  async function handleToggleUserStatus(user) {
    const newStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    try {
      await api.patch(`/auth/users/${user.user_id}/status`, { status: newStatus });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update user status.');
    }
  }

  async function handleDeleteUser(user) {
    if (!window.confirm(`Are you sure you want to delete ${user.full_name}?`)) return;
    try {
      await api.delete(`/auth/users/${user.user_id}`);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete user.');
    }
  }

  const pendingReports = reports.filter((r) => r.status === 'Pending');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 flex gap-4 overflow-x-auto">
          <button onClick={() => setActiveTab('pickups')} className={`py-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap ${activeTab === 'pickups' ? 'border-eswama-green text-eswama-green' : 'border-transparent text-gray-500'}`}>Pickup days</button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-3 px-2 border-b-2 font-medium text-sm transition ${
              activeTab === 'dashboard' ? 'border-eswama-green text-eswama-green' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Dashboard Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`py-3 px-2 border-b-2 font-medium text-sm transition ${
              activeTab === 'users' ? 'border-eswama-green text-eswama-green' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Manage Drivers & Admins
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-3 px-2 border-b-2 font-medium text-sm transition ${
              activeTab === 'analytics' ? 'border-eswama-green text-eswama-green' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Analytics & Reports
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto p-4">
        <header className="pt-4 pb-6">
          <p className="text-xs uppercase tracking-widest font-semibold text-emerald-700">Administration</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mt-2">Collection operations</h1>
          <p className="text-slate-500 mt-2">Coordinate your fleet, plan pickup days, and keep your community informed.</p>
        </header>
        {activeTab === 'pickups' && <PickupSchedule admin />}
        {activeTab === 'dashboard' ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:col-span-1">
          <h2 className="font-semibold mb-3">Pending Reports ({pendingReports.length})</h2>
          <ul className="space-y-2 max-h-[32rem] overflow-y-auto">
            {pendingReports.length === 0 && (
              <p className="text-sm text-gray-500">No pending reports right now.</p>
            )}
            {pendingReports.map((r) => (
              <li key={r.report_id}>
                <button
                  onClick={() => handleSelectReport(r)}
                  className={`w-full text-left border rounded-md p-3 hover:border-eswama-green transition ${
                    selectedReport?.report_id === r.report_id ? 'border-eswama-green bg-green-50' : ''
                  }`}
                >
                  <p className="text-sm font-medium">{r.reporter_name}</p>
                  <p className="text-sm text-gray-600">{r.description}</p>
                  {r.photo_url && (
                    <img src={r.photo_url} alt="Report Issue" className="mt-2 max-h-32 rounded-md object-cover" />
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(r.reported_at).toLocaleString()}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {selectedReport && (
            <div className="mt-4 border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-sm">Assign Collection Task</h3>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedReport.latitude},${selectedReport.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  View on Google Maps
                </a>
              </div>
              {suggestion ? (
                <div className="text-sm space-y-2">
                  <p>
                    Suggested driver: <strong>{suggestion.full_name}</strong> (
                    {suggestion.distanceKm.toFixed(2)} km away)
                  </p>
                  <button
                    onClick={handleAssign}
                    disabled={assigning}
                    className="bg-eswama-green text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {assigning ? 'Assigning...' : 'Assign This Driver'}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  {message || 'Looking for the nearest available driver...'}
                </p>
              )}
            </div>
          )}
          {message && !selectedReport && <p className="text-sm mt-3 text-eswama-dark">{message}</p>}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:col-span-2 h-[36rem]">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">Live Fleet Map</h2>
            <button
              onClick={handleUseMyLocation}
              className="text-xs text-eswama-green hover:underline focus:outline-none"
            >
              Use My Current Location
            </button>
          </div>
          <div className="h-[calc(100%-2rem)] rounded-lg overflow-hidden">
            <MapView
              center={mapCenter}
              markers={vehicles.map((v) => ({
                id: v.vehicle_id,
                lat: parseFloat(v.latitude),
                lng: parseFloat(v.longitude),
                label: `${v.driver_name} - ${v.plate_number} (${v.zone})`,
              }))}
              />
            </div>
          </section>
        </div>
        ) : activeTab === 'users' ? (
        /* User Management Section */
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <h2 className="font-semibold mb-4 text-lg border-b pb-2">Fleet & User Management</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 border-r pr-4">
              <h3 className="font-medium mb-3">Add New User</h3>
              <form onSubmit={handleCreateUser} className="space-y-3">
                <input
                  required
                  placeholder="Full Name"
                  value={newUser.fullName}
                  onChange={(e) => setNewUser({ ...newUser, fullName: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eswama-green"
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eswama-green"
                />
                <input
                  required
                  placeholder="Phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eswama-green"
                />
                <input
                  required
                  type="password"
                  placeholder="Password (min 6 chars)"
                  minLength={6}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eswama-green"
                />
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eswama-green"
                >
                  <option value="driver">Driver</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="w-full bg-eswama-green text-white py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                >
                  {creatingUser ? 'Creating...' : 'Create User'}
                </button>
                {userMsg && <p className="text-sm mt-2 text-eswama-dark">{userMsg}</p>}
              </form>
            </div>
            
            <div className="md:col-span-2">
              <h3 className="font-medium mb-3">All Users ({users.length})</h3>
              <div className="overflow-x-auto h-80 overflow-y-auto border rounded-md">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      <th className="px-4 py-2 font-medium">Name</th>
                      <th className="px-4 py-2 font-medium">Role</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium">Joined</th>
                      <th className="px-4 py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map((u) => (
                      <tr key={u.user_id} className="hover:bg-gray-50">
                        <td className="px-4 py-2">
                          <p className="font-medium">{u.full_name}</p>
                          <p className="text-xs text-gray-500">{u.email}</p>
                        </td>
                        <td className="px-4 py-2 capitalize">{u.role}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            u.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-gray-500 text-xs">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-2 text-right space-x-2">
                          {u.role !== 'resident' && (
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className="text-xs px-2 py-1 border rounded hover:bg-gray-100"
                            >
                              {u.status === 'Active' ? 'Suspend' : 'Activate'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="text-xs px-2 py-1 border border-red-200 text-red-600 rounded hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
        ) : activeTab === 'analytics' ? (
          /* Analytics Section */
          <section className="mt-4">
            <Analytics />
          </section>
        ) : null}
      </main>
    </div>
  );
}
