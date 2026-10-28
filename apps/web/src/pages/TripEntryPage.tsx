import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_BASE } from '../api/base';
import { useAuth } from '../auth/AuthContext';
import TripDetailPage from './TripDetailPage';
import MobilePageHeader from '../components/MobilePageHeader';

type ItineraryItem = { id: string; type: string; title?: string; date?: string; startsAt?: string; endDate?: string; startTime?: string; endTime?: string; locationName?: string; address?: string; course?: { name: string; city?: string; country?: string } };
type SpectatorTrip = { title: string; destination?: string; coverImageUrl?: string; items: ItineraryItem[] };

export default function TripEntryPage() {
  const { tripId } = useParams();
  const { token } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const [trip, setTrip] = useState<SpectatorTrip | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    setRole(null); setTrip(null); setError(null);
    async function load() {
      const headers = { Authorization: `Bearer ${token}` };
      const base = `${API_BASE}/trips/${encodeURIComponent(tripId || '')}`;
      const response = await fetch(base, { headers, signal: abort.signal });
      if (!response.ok) throw new Error('This trip is not available to your account.');
      const data = await response.json();
      if (abort.signal.aborted) return;
      if (data.viewerRole === 'VIEWER') setTrip(data);
      setRole(data.viewerRole === 'VIEWER' ? 'VIEWER' : 'PARTICIPANT');
    }
    if (token && tripId) void load().catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [token, tripId]);

  if (error) return <div className="fw-page" style={{ padding: 20 }}><p role="alert">{error}</p><Link to="/trips">Back to trips</Link></div>;
  if (!role) return <div className="fw-page" style={{ padding: 20 }}>Loading trip…</div>;
  if (role !== 'VIEWER') return <TripDetailPage />;
  if (!trip) return null;
  return <main className="fw-page" style={{ padding: '16px 14px 100px', maxWidth: 900, margin: 'auto' }}>
    <MobilePageHeader title={trip.title} subtitle={trip.destination || 'Trip itinerary'} backTo="/trips" />
    {trip.coverImageUrl ? <img src={trip.coverImageUrl} alt="" style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 18, marginTop: 16 }} /> : null}
    <p style={{ color: 'var(--fw-selection-text)', background: 'var(--fw-selection-bg)', borderRadius: 12, padding: 14 }}>Spectator · Read only</p>
    <p style={{ color: 'var(--sub)', lineHeight: 1.5 }}>Follow the itinerary here. Posts remain in your regular <Link to="/feed">Feed</Link> with their existing audience settings. Costs and documents are private to the travellers.</p>
    <h2>Itinerary</h2>
    {trip.items.length ? trip.items.map(item => <article key={item.id} style={{ border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 16, padding: 18, marginBottom: 12 }}>
      <small style={{ color: 'var(--fw-selection-text)', textTransform: 'uppercase' }}>{item.type.replaceAll('_', ' ')}</small>
      <h3 style={{ margin: '8px 0' }}>{item.title || item.course?.name || item.locationName || 'Trip activity'}</h3>
      <p style={{ margin: '6px 0', color: 'var(--sub)' }}>{item.date || item.startsAt ? new Date((item.date || item.startsAt)!).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date to be confirmed'}{item.startTime ? ` · ${item.startTime}` : ''}{item.endDate ? ` – ${new Date(item.endDate).toLocaleDateString()}` : ''}{item.endTime ? ` · ${item.endTime}` : ''}</p>
      <p style={{ margin: 0, color: 'var(--sub)' }}>{[item.locationName || item.course?.name, item.address || item.course?.city, item.course?.country].filter(Boolean).join(' · ')}</p>
    </article>) : <p>No shared itinerary items yet.</p>}
  </main>;
}
