import { useEffect, useState } from 'react';
export default function ContentReviewNotice() {
  const [message, setMessage] = useState('');
  useEffect(() => { const receive = (event: Event) => setMessage(String((event as CustomEvent).detail || '')); window.addEventListener('fairwayd:review-pending', receive); return () => window.removeEventListener('fairwayd:review-pending', receive); }, []);
  return message ? <div role="status" aria-live="polite" style={{ position: 'fixed', bottom: 80, left: 16, right: 16, margin: '0 auto', maxWidth: 640, zIndex: 20000, padding: 18, border: '1px solid #b69050', borderRadius: 16, background: 'var(--card)', color: 'var(--text)', boxShadow: '0 8px 32px #0004', lineHeight: 1.6 }}><p style={{ margin: '0 0 10px' }}>{message}</p><button type="button" className="fw-button-secondary" aria-label="Close review notice" onClick={() => setMessage('')}>OK</button></div> : null;
}
