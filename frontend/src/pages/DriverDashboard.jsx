import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import MapView from '../components/MapView.jsx';
import api from '../api/client';
import { getSocket } from '../api/socket';

const NEXT_STATUS = {
  Assigned: 'In Progress',
  'In Progress': 'Completed',
};

export default function DriverDashboard() {
  const [tasks, setTasks] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const watchIdRef = useRef(null);

  async function loadTasks() {
    const { data } = await api.get('/tasks');
    setTasks(data.tasks);
  }

  useEffect(() => {
    loadTasks();
    const socket = getSocket();
    if (socket) {
      socket.on('task:assigned', () => loadTasks());
    }
    return () => {
      if (socket) socket.off('task:assigned');
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  function startTracking() {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported on this device.');
      return;
    }
    setTracking(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLastLocation({ latitude, longitude });
        try {
          await api.post('/locations', { latitude, longitude });
          const socket = getSocket();
          if (socket) socket.emit('location:push', { latitude, longitude });
        } catch (err) {
          console.error('Failed to push location:', err);
        }
      },
      (err) => console.error('Geolocation error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  function stopTracking() {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setTracking(false);
  }

  async function handleAdvanceStatus(task) {
    const nextStatus = NEXT_STATUS[task.status];
    if (!nextStatus) return;
    try {
      await api.patch(`/tasks/${task.task_id}/status`, { status: nextStatus });
      loadTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not update task status.');
    }
  }

  const activeTasks = tasks.filter((t) => t.status !== 'Completed');

  const mapMarkers = [];
  if (lastLocation) {
    mapMarkers.push({
      id: 'driver',
      lat: lastLocation.latitude,
      lng: lastLocation.longitude,
      label: 'Your Current Location'
    });
  }
  activeTasks.forEach((t) => {
    if (t.latitude && t.longitude) {
      mapMarkers.push({
        id: `task-${t.task_id}`,
        lat: parseFloat(t.latitude),
        lng: parseFloat(t.longitude),
        label: t.description
      });
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-6xl mx-auto p-4 grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-lg shadow p-4 flex items-center justify-between lg:col-span-2">
          <div>
            <h2 className="font-semibold">Location Sharing</h2>
            <p className="text-sm text-gray-500">
              {tracking
                ? `Sharing your live location${lastLocation ? ` (last: ${lastLocation.latitude.toFixed(4)}, ${lastLocation.longitude.toFixed(4)})` : ''}...`
                : 'Turn this on when you start your collection route.'}
            </p>
          </div>
          <button
            onClick={tracking ? stopTracking : startTracking}
            className={`px-4 py-2 rounded-md text-white ${
              tracking ? 'bg-red-600 hover:bg-red-700' : 'bg-eswama-green hover:bg-green-700'
            }`}
          >
            {tracking ? 'Stop Sharing' : 'Start Sharing'}
          </button>
        </section>

        <section className="bg-white rounded-lg shadow p-4 lg:col-span-1 h-[28rem] lg:h-auto">
          <h2 className="font-semibold mb-3">Your Route Map</h2>
          <div className="h-[calc(100%-2rem)] rounded-lg overflow-hidden">
            <MapView
              center={lastLocation ? [lastLocation.latitude, lastLocation.longitude] : null}
              markers={mapMarkers}
            />
          </div>
        </section>

        <section className="bg-white rounded-lg shadow p-4 lg:col-span-1">
          <h2 className="font-semibold mb-3">Your Tasks ({activeTasks.length} active)</h2>
          <ul className="space-y-3 max-h-[32rem] overflow-y-auto">
            {tasks.length === 0 && <p className="text-sm text-gray-500">No tasks assigned yet.</p>}
            {tasks.map((t) => (
              <li key={t.task_id} className="border rounded-md p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">
                    Assigned {new Date(t.assigned_at).toLocaleString()}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {t.status}
                  </span>
                </div>
                <p className="text-sm mb-2">{t.description}</p>
                <div className="flex items-center gap-2">
                  {NEXT_STATUS[t.status] && (
                    <button
                      onClick={() => handleAdvanceStatus(t)}
                      className="flex-1 text-sm bg-eswama-green text-white px-3 py-1.5 rounded-md hover:bg-green-700"
                    >
                      Mark as {NEXT_STATUS[t.status]}
                    </button>
                  )}
                  {t.latitude && t.longitude && (
                    <a
                      href={lastLocation 
                        ? `https://www.google.com/maps/dir/?api=1&origin=${lastLocation.latitude},${lastLocation.longitude}&destination=${t.latitude},${t.longitude}`
                        : `https://www.google.com/maps/search/?api=1&query=${t.latitude},${t.longitude}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 text-center flex-1"
                    >
                      Track on Map
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
