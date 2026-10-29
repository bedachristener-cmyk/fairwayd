import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../api/base';
import { useAuth } from '../auth/AuthContext';

type Review = { id: string; userId: string; scope: string; status: string; categories: string[]; text?: string; mimeType?: string; createdAt: string; expiresAt: string };
type PendingPost = { id: string; content: string; courseId: string; visibility: string; state: string; categories: string[]; expiresAt: string; leaseUntil?: string; user: { name?: string; handle?: string }; images: { id: string }[] };
function Preview({ id, token, path }: { id: string; token: string; path?: string }) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController(); let objectUrl = '';
    void fetch(`${API_BASE}${path ?? `/safety/admin/moderation/${encodeURIComponent(id)}/image`}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw Error('Preview unavailable.');
      const blob = await response.blob();
      if (!controller.signal.aborted) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); }
    }).catch(() => { if (!controller.signal.aborted) setError('Preview unavailable.'); });
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [id, token, path]);
  return error ? <p role="alert">{error}</p> : url ? <img src={url} alt="Quarantined image for moderation" style={{ maxWidth: '100%', maxHeight: 320, objectFit: 'contain' }} /> : <p>Loading preview…</p>;
}
export default function ModerationAdminPage() {
  const { token } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [items, setItems] = useState<Review[]>([]);
  const [posts, setPosts] = useState<PendingPost[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [preview, setPreview] = useState('');
  const load = useCallback(async () => {
    if (!token) return;
    setError('');
    try {
      const response = await fetch(`${API_BASE}/safety/admin/moderation`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (!response.ok) throw Error(response.status === 403 ? 'Admin access required.' : 'Could not load moderation reviews.');
      const reviews = await response.json();
      const postsResponse = await fetch(`${API_BASE}/safety/admin/pending-posts`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (!postsResponse.ok) throw Error('Could not load pending posts.');
      const pendingPosts = await postsResponse.json();
      if (!Array.isArray(reviews) || !Array.isArray(pendingPosts)) throw Error('Could not load moderation reviews.');
      setItems(reviews); setPosts(pendingPosts);
      const statusResponse = await fetch(`${API_BASE}/safety/admin/moderation/status`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
      if (!statusResponse.ok) throw Error('Could not verify content-check status.');
      const status = await statusResponse.json();
      setEnabled(status.enabled === true && status.configured === true);
    } catch (e) { setItems([]); setPosts([]); setError(e instanceof Error ? e.message : 'Request failed.'); }
  }, [token]);
  useEffect(() => { void load(); }, [load]);
  async function decide(id: string, decision: string, completePost = false) {
    if (!token || busy) return;
    setBusy(id); setError('');
    try {
      const response = await fetch(`${API_BASE}/safety/admin/${completePost ? "pending-posts" : "moderation"}/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) });
      if (!response.ok) throw Error('Review changed or request failed. Refresh and try again.');
      setPreview(''); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Request failed.'); }
    finally { setBusy(''); }
  }
  return <main className="fw-page" style={{ maxWidth: 900, margin: 'auto', padding: '20px 16px 100px', display: 'grid', gap: 16, alignContent: 'start', lineHeight: 1.5 }}>
    <Link to="/admin/reports">Back to content reports</Link>
    <h1>Automatic content checks</h1>
    {enabled === false ? <p role="status">Automatic checks are not active. Server configuration and privacy disclosures must be completed before activation.</p> : enabled === true ? <p role="status">Automatic checks are active.</p> : null}
    <p>New posts wait here with their full text, images and chosen audience. Approve publishes the complete post automatically; reject keeps it unpublished. The author is notified in Fairwayd and by email if enabled. Previews can contain disturbing material. Blocked child-safety cases have no preview or approval option.</p>
    <button className="fw-button-secondary" type="button" onClick={() => void load()}>Refresh</button>
    {error ? <p role="alert">{error}</p> : null}
    {!error && !items.length && !posts.length ? <p>No current reviews.</p> : null}
    {posts.map(post => <article key={post.id} id={post.id} style={{ border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 16, padding: 16, overflowWrap: 'anywhere', scrollMarginTop: 100 }}>
      <h2 style={{ fontSize: 18 }}>Post · {post.state}</h2>
      <p>{post.user.name || post.user.handle || 'Golfer'} · Audience: {post.visibility}</p>
      <p>Reference: {post.id} · Detected categories: {post.categories.join(', ')}</p>
      {post.content && <blockquote style={{ whiteSpace: 'pre-wrap' }}>{post.content}</blockquote>}
      <p>{post.images.length} image(s) · Expires: {new Date(post.expiresAt).toLocaleString()}</p>
      {post.state === 'PENDING' || (post.state === 'PUBLISHING' && post.leaseUntil && new Date(post.leaseUntil).getTime() < Date.now()) ? <>
        {post.images.length > 0 && token ? <><button className="fw-button-secondary" type="button" onClick={() => setPreview(preview === post.id ? '' : post.id)}>{preview === post.id ? 'Hide preview' : 'Show all images for review'}</button>{preview === post.id && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>{post.images.map(image => <Preview key={image.id} id={image.id} token={token} path={`/safety/admin/pending-posts/${encodeURIComponent(post.id)}/images/${encodeURIComponent(image.id)}`} />)}</div>}</> : null}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 16 }}>
          <button className="fw-button-secondary" type="button" disabled={Boolean(busy)} onClick={() => void decide(post.id, 'APPROVED', true)}>Approve and publish</button>
          <button className="fw-button-secondary" type="button" disabled={Boolean(busy)} onClick={() => void decide(post.id, 'REJECTED', true)}>Reject post</button>
        </div>
      </> : null}
    </article>)}
    {items.length > 0 && <p>Other content and older cases: approval allows unchanged resubmission within 24 hours. It does not publish those items automatically.</p>}
    {items.map(item => <article key={item.id} style={{ border: '1px solid var(--border)', background: 'var(--card)', borderRadius: 16, padding: 16, overflowWrap: 'anywhere' }}>
      <h2 style={{ fontSize: 18 }}>{item.scope} · {item.status}</h2>
      <p>Reference: {item.id} · User: {item.userId}</p>
      <p>Detected categories: {item.categories.join(', ') || 'Unspecified'}</p>
      <p>Expires: {new Date(item.expiresAt).toLocaleString()}</p>
      {item.text ? <blockquote style={{ whiteSpace: 'pre-wrap' }}>{item.text}</blockquote> : null}
      {item.status === 'PENDING' ? <>
        {item.mimeType && token ? <><button className="fw-button-secondary" type="button" onClick={() => setPreview(preview === item.id ? '' : item.id)}>{preview === item.id ? 'Hide preview' : 'Show potentially disturbing image'}</button>{preview === item.id ? <Preview id={item.id} token={token} /> : null}</> : null}
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="fw-button-secondary" type="button" disabled={Boolean(busy)} onClick={() => void decide(item.id, 'APPROVED')}>Approve unchanged resubmission</button>
          <button className="fw-button-secondary" type="button" disabled={Boolean(busy)} onClick={() => void decide(item.id, 'REJECTED')}>Reject</button>
        </div>
      </> : null}
    </article>)}
  </main>;
}
