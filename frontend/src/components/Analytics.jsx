import React, { useEffect, useState } from 'react';
import api from '../api/client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await api.get('/analytics');
        setData(res.data);
      } catch (err) {
        setError('Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) return <div className="p-4 text-center text-gray-500">Loading analytics...</div>;
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>;
  if (!data) return null;

  const statusData = [
    { name: 'Pending', count: data.reportsByStatus.Pending },
    { name: 'Assigned', count: data.reportsByStatus.Assigned },
    { name: 'Resolved', count: data.reportsByStatus.Resolved },
  ];

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-400">
          <p className="text-sm text-gray-500 font-medium">Pending Reports</p>
          <p className="text-2xl font-bold">{data.reportsByStatus.Pending}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <p className="text-sm text-gray-500 font-medium">Total Resolved</p>
          <p className="text-2xl font-bold">{data.reportsByStatus.Resolved}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <p className="text-sm text-gray-500 font-medium">Avg Resolution Time</p>
          <p className="text-2xl font-bold">{data.averageResolutionHours} <span className="text-sm font-normal text-gray-400">hours</span></p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Reports over time chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4 text-gray-700">Reports Over Time (Last 7 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.reportsOverTime}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize: 12}} />
                <YAxis allowDecimals={false} tick={{fontSize: 12}} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} name="Reports" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reports by status chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="font-semibold mb-4 text-gray-700">Reports by Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis allowDecimals={false} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Reports" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Driver Performance Table */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="font-semibold mb-4 text-gray-700">Top Driver Performance</h3>
        {data.driverPerformance.length === 0 ? (
          <p className="text-sm text-gray-500">No completed tasks yet.</p>
        ) : (
          <div className="overflow-x-auto border rounded-md">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium">Driver Name</th>
                  <th className="px-4 py-3 font-medium text-right">Completed Tasks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.driverPerformance.map((driver, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{driver.driver_name}</td>
                    <td className="px-4 py-3 text-right text-gray-600">{driver.completed_tasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
