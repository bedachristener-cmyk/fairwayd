import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_BASE } from '../api/base';
import { useAuth } from '../auth/AuthContext';
import TripDetailPage from './TripDetailPage';

export default function TripEntryPage() {
  const { tripId } = useParams();
  const { token } = useAuth();
  const [role, setRole] = useState<{ tripId: string; token: string; value: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    setRole(null); setError(null);
    async function load() {
      const headers = { Authorization: `Bearer ${token}` };
      const base = `${API_BASE}/trips/${encodeURIComponent(tripId || '')}`;
      const response = await fetch(base, { headers, signal: abort.signal });
      if (!response.ok) throw new Error('This trip is not available to your account.');
      const data = await response.json();
      if (abort.signal.aborted) return;
      setRole({ tripId: tripId || '', token: token || '', value: data.viewerRole === 'VIEWER' ? 'VIEWER' : 'PARTICIPANT' });
    }
    if (token && tripId) void load().catch(e => { if (!abort.signal.aborted) setError(e.message); });
    return () => abort.abort();
  }, [token, tripId]);

  if (error) return <div className="fw-page" style={{ padding: 20 }}><p role="alert">{error}</p><Link to="/trips">Back to trips</Link></div>;
  if (!role || role.tripId !== tripId || role.token !== token) return <div className="fw-page" style={{ padding: 20 }}>Loading trip…</div>;
  return <TripDetailPage key={`${tripId}:${role.value}`} spectatorMode={role.value === 'VIEWER'} />;
}
