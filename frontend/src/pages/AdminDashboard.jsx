import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import MapView from '../components/MapView.jsx';
import api from '../api/client';
import { getSocket } from '../api/socket';

export default function AdminDashboard() {
  const [reports, setReports] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedReport, setSelectedReport] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [message, setMessage] = useState('');

  async function loadReports() {
    const { data } = await api.get('/reports');
    setReports(data.reports);
  }

  async function loadVehicles() {
    const { data } = await api.get('/locations/latest');
    setVehicles(data.vehicles.filter((v) => v.latitude && v.longitude));
  }

  useEffect(() => {
    loadReports();
    loadVehicles();

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

  const pendingReports = reports.filter((r) => r.status === 'Pending');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto p-4 grid gap-6 lg:grid-cols-3">
        <section className="bg-white rounded-lg shadow p-4 lg:col-span-1">
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
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(r.reported_at).toLocaleString()}
                  </p>
                </button>
              </li>
            ))}
          </ul>

          {selectedReport && (
            <div className="mt-4 border-t pt-4">
              <h3 className="font-medium text-sm mb-2">Assign Collection Task</h3>
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

        <section className="bg-white rounded-lg shadow p-4 lg:col-span-2 h-[36rem]">
          <h2 className="font-semibold mb-3">Live Fleet Map</h2>
          <div className="h-[calc(100%-2rem)] rounded-lg overflow-hidden">
            <MapView
              markers={vehicles.map((v) => ({
                id: v.vehicle_id,
                lat: parseFloat(v.latitude),
                lng: parseFloat(v.longitude),
                label: `${v.driver_name} - ${v.plate_number} (${v.zone})`,
              }))}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
