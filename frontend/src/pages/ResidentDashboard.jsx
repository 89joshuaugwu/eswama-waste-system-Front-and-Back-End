import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import MapView from '../components/MapView.jsx';
import api from '../api/client';
import { getSocket } from '../api/socket';

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Assigned: 'bg-blue-100 text-blue-800',
  Resolved: 'bg-green-100 text-green-800',
};

export default function ResidentDashboard() {
  const [reports, setReports] = useState([]);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  async function loadReports() {
    const { data } = await api.get('/reports');
    setReports(data.reports);
  }

  useEffect(() => {
    loadReports();

    const socket = getSocket();
    if (socket) {
      socket.on('report:resolved', () => loadReports());
    }
    return () => {
      if (socket) socket.off('report:resolved');
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
        setLocation({ lat: latitude, lng: longitude });
        setMapCenter([latitude, longitude]);
        setMessage('Location acquired!');
      },
      (err) => {
        setMessage('Could not get your location. Please check your permissions.');
      },
      { enableHighAccuracy: true }
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    if (!location) {
      setMessage('Please click on the map to select the location of the issue.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reports', {
        description,
        latitude: location.lat,
        longitude: location.lng,
      });
      setDescription('');
      setLocation(null);
      setMessage('Report submitted successfully.');
      loadReports();
    } catch (err) {
      setMessage(err.response?.data?.error || 'Could not submit report.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-5xl mx-auto p-4 grid gap-6 md:grid-cols-2">
        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Report a Waste Issue</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <textarea
              required
              placeholder="Describe the issue (e.g. overflowing bin, illegal dumping)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-md px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-eswama-green"
            />
            <div className="flex justify-between items-center mb-2">
              <p className="text-xs text-gray-500">Click on the map to mark where the issue is.</p>
              <button
                type="button"
                onClick={handleUseMyLocation}
                className="text-xs text-eswama-green hover:underline focus:outline-none"
              >
                Use My Current Location
              </button>
            </div>
            <div className="h-56 border rounded-lg overflow-hidden">
              <MapView
                center={mapCenter}
                onSelectLocation={(lat, lng) => setLocation({ lat, lng })}
                markers={location ? [{ id: 'selected', lat: location.lat, lng: location.lng, label: 'Selected location' }] : []}
              />
            </div>
            {message && <p className="text-sm text-eswama-dark">{message}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="bg-eswama-green text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Report'}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Your Reports</h2>
          <ul className="space-y-3 max-h-[28rem] overflow-y-auto">
            {reports.length === 0 && <p className="text-sm text-gray-500">No reports submitted yet.</p>}
            {reports.map((r) => (
              <li key={r.report_id} className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">
                    {new Date(r.reported_at).toLocaleString()}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                <p className="text-sm">{r.description}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
