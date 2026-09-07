import React, { useEffect, useState } from 'react';
import api from '../api/client';
import { getSocket } from '../api/socket';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const initial = { weekday: '1', pickupTime: '07:00', notes: '' };

export default function PickupSchedule({ admin = false }) {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(initial);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data } = await api.get('/pickups');
        if (active) { setSchedules(data.schedules); setError(''); }
      } catch { if (active) setError('Unable to load pickup days. We will retry shortly.'); }
      finally { if (active) setLoading(false); }
    }
    load();
    const timer = setInterval(load, 60000);
    const socket = getSocket();
    socket?.on('pickup:updated', load);
    socket?.on('connect', load);
    window.addEventListener('focus', load);
    return () => {
      active = false;
      clearInterval(timer);
      socket?.off('pickup:updated', load);
      socket?.off('connect', load);
      window.removeEventListener('focus', load);
    };
  }, []);

  async function save(e) {
    e.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      await api.post('/pickups', { ...form, weekday: Number(form.weekday) });
      setMessage('Pickup day saved. Residents can now see the updated schedule.');
      setForm(initial);
      const { data } = await api.get('/pickups'); setSchedules(data.schedules);
    } catch (err) { setError(err.response?.data?.error || 'Could not save or refresh pickup days. Please try again.'); }
    finally { setBusy(false); }
  }
  async function remove(s) {
    if (!window.confirm(`Remove the recurring ${DAYS[s.weekday]} pickup?`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      await api.delete(`/pickups/${s.schedule_id}`);
      setSchedules(current => current.filter(day => day.schedule_id !== s.schedule_id));
      setMessage('Pickup day removed.');
    } catch (err) { setError(err.response?.data?.error || 'Could not remove pickup day.'); }
    finally { setBusy(false); }
  }
  const today = schedules.find(s => s.days_away === 0);
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
    <div className="px-6 py-5 border-b border-slate-100">
      <p className="text-xs font-semibold tracking-widest uppercase text-emerald-700 mb-1">Collection calendar</p>
      <h2 className="text-xl font-semibold text-slate-900">{admin ? 'Manage pickup days' : 'Your weekly pickup schedule'}</h2>
      <p className="text-sm text-slate-500 mt-1">Weekly collection for all residents · Nigeria time (WAT)</p>
    </div>
    <div className="p-6 space-y-5">
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      {!admin && today && !error && <div role="status" className="rounded-xl bg-emerald-800 p-5 text-white">
        <p className="text-lg font-semibold">Today is pickup day</p>
        <p className="mt-1 text-sm text-emerald-50">Please bag your waste and have it ready for collection by {today.pickup_time}.</p>
        {today.notes && <p className="mt-2 text-sm whitespace-pre-wrap break-words">{today.notes}</p>}
      </div>}
      {admin && <form onSubmit={save} className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="text-sm font-medium text-slate-700">Pickup day
            <select className="pickup-input" value={form.weekday} onChange={e => setForm({ ...form, weekday: e.target.value })}>
              {DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Have waste ready by
            <input required type="time" className="pickup-input" value={form.pickupTime} onChange={e => setForm({ ...form, pickupTime: e.target.value })} />
          </label>
        </div>
        <label className="block text-sm font-medium text-slate-700">Preparation notes (optional)
          <textarea maxLength={500} rows={2} className="pickup-input" placeholder="e.g. Tie waste bags securely and place them at your collection point." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <button disabled={busy} className="rounded-lg bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50">{busy ? 'Saving changes…' : 'Save pickup day'}</button>
          <p className="text-xs text-slate-500">Saving an existing day updates its time and notes.</p>
        </div>
      </form>}
      {loading ? <p role="status" className="text-sm text-slate-500">Loading pickup days…</p> : !error && schedules.length === 0 ?
        <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center">
          <p className="font-medium text-slate-700">No pickup days scheduled yet</p>
          <p className="text-sm text-slate-500 mt-1">{admin ? 'Add the first collection day using the form above.' : 'Your administrator will publish collection days here. You can still report a waste issue below.'}</p>
        </div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schedules.map((s, index) => <article key={s.schedule_id} className={`rounded-xl border p-4 ${s.days_away === 0 ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200'}`}>
            <div className="flex justify-between items-center gap-2">
              <h3 className="font-semibold text-slate-800">{DAYS[s.weekday]}</h3>
              {index === 0 && <span className="text-xs font-medium text-emerald-700">{s.days_away === 0 ? 'Today' : 'Next pickup'}</span>}
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{s.pickup_time} <span className="text-xs font-normal text-slate-500">WAT</span></p>
            <p className="text-xs text-slate-500 mt-1">{s.days_away === 0 ? 'Prepare your waste for collection' : s.days_away === 1 ? 'Tomorrow' : `In ${s.days_away} days`}</p>
            {s.notes && <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap break-words">{s.notes}</p>}
            {admin && <div className="flex gap-4 border-t border-slate-200 mt-4 pt-3">
              <button disabled={busy} onClick={() => { setForm({ weekday: String(s.weekday), pickupTime: s.pickup_time, notes: s.notes }); setMessage(`Editing ${DAYS[s.weekday]}. Update the form above and save.`); }} className="text-sm font-medium text-emerald-800">Edit</button>
              <button disabled={busy} onClick={() => remove(s)} className="text-sm text-red-700">Remove</button>
            </div>}
          </article>)}
        </div>}
      {!admin && <p className="text-xs text-slate-500">A reminder will appear in your notifications on each pickup day.</p>}
    </div>
  </section>;
}
