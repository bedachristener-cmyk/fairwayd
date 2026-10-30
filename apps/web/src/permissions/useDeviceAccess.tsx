import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { deviceAccessCopy } from './copy';

type AccessKind = 'location' | 'camera';
type AccessRequest = { kind: AccessKind; confirm: () => void; alternative?: () => void };
type AccessDecision = 'accepted' | 'dismissed';
// Purpose acknowledgement only: never treat this as a browser/OS permission grant.
const memoryDecisions: Partial<Record<AccessKind, AccessDecision>> = {};
function accessDecision(kind: AccessKind): AccessDecision | null {
  try {
    const value = localStorage.getItem(`fairwayd_device_access_v1_${kind}`);
    if (value === 'accepted' || value === 'dismissed') return value;
  } catch { /* Restricted storage: keep the decision for this app session. */ }
  return memoryDecisions[kind] ?? null;
}
function rememberDecision(kind: AccessKind, value: AccessDecision) {
  memoryDecisions[kind] = value;
  try { localStorage.setItem(`fairwayd_device_access_v1_${kind}`, value); } catch { /* Session fallback above. */ }
}
const button = { minHeight: 44, padding: '10px 18px', borderRadius: 999, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text)', fontWeight: 750, cursor: 'pointer' };
function AccessDialog({ request, close }: { request: AccessRequest; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const copy = deviceAccessCopy();
  useEffect(() => {
    const original = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => { dialog?.close(); if (original?.isConnected) original.focus({ preventScroll: true }); };
  }, []);
  const act = (fn: () => void) => {
    // Keep camera/picker activation in the confirming user's click, not in an effect.
    try { fn(); } finally { close(); }
  };
  return createPortal(<dialog ref={ref} aria-labelledby={`${id}-title`} aria-describedby={`${id}-body`} onCancel={event => { event.preventDefault(); close(); }} style={{ width: 'min(480px, calc(100vw - 32px))', maxHeight: 'calc(100dvh - 40px)', boxSizing: 'border-box', padding: 24, border: '1px solid #b69050', borderRadius: 22, background: 'var(--card)', color: 'var(--text)', boxShadow: '0 16px 64px #0006' }}>
    <h2 id={`${id}-title`} style={{ margin: '0 0 14px', fontSize: 22 }}>{request.kind === 'location' ? copy.locationTitle : copy.cameraTitle}</h2>
    <p id={`${id}-body`} style={{ lineHeight: 1.65, margin: '0 0 20px' }}>{request.kind === 'location' ? copy.locationBody : copy.cameraBody}</p>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      <button type="button" style={{ ...button, borderColor: '#b69050' }} onClick={() => act(request.confirm)}>{request.kind === 'location' ? copy.allowLocation : copy.openCamera}</button>
      <button type="button" style={button} autoFocus onClick={close}>{copy.cancel}</button>
      {request.alternative && <button type="button" style={button} onClick={() => act(request.alternative!)}>{copy.gallery}</button>}
    </div>
  </dialog>, document.body);
}
export function useDeviceAccessPrompt() {
  const [request, setRequest] = useState<AccessRequest | null>(null);
  const ask = useCallback((value: AccessRequest) => {
    if (accessDecision(value.kind) === 'accepted') { value.confirm(); return; }
    const accepted = (action: () => void) => () => { rememberDecision(value.kind, 'accepted'); action(); };
    setRequest({ ...value, confirm: accepted(value.confirm), alternative: value.alternative ? accepted(value.alternative) : undefined });
  }, []);
  const close = () => {
    // Dismissing an automatic location explanation must not nag on the next map visit.
    if (request?.kind === 'location' && accessDecision('location') !== 'accepted') rememberDecision('location', 'dismissed');
    setRequest(null);
  };
  return { ask, dialog: request ? <AccessDialog request={request} close={close} /> : null };
}

export type DevicePosition = { lat: number; lon: number };
export function useLocationAccess(onLocated?: (position: DevicePosition) => void, requestOnOpen = false) {
  const [position, setPosition] = useState<DevicePosition | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef(true);
  const inFlight = useRef(false);
  const requestedOnOpen = useRef(false);
  const onLocatedRef = useRef(onLocated);
  onLocatedRef.current = onLocated;
  const prompt = useDeviceAccessPrompt();
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const locate = useCallback(() => {
    if (inFlight.current) return;
    const copy = deviceAccessCopy();
    if (!navigator.geolocation) { setError(copy.unsupported); return; }
    inFlight.current = true; setBusy(true); setError('');
    const finish = () => { inFlight.current = false; if (active.current) setBusy(false); };
    try {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        finish(); if (!active.current) return;
        const value = { lat: coords.latitude, lon: coords.longitude };
        if (!Number.isFinite(value.lat) || !Number.isFinite(value.lon) || Math.abs(value.lat) > 90 || Math.abs(value.lon) > 180) { setError(copy.unavailable); return; }
        setPosition(value); onLocatedRef.current?.(value);
      }, problem => {
        finish(); if (!active.current) return;
        setError(problem.code === 1 ? copy.denied : problem.code === 3 ? copy.timeout : copy.unavailable);
      }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 120000 });
    } catch { finish(); if (active.current) setError(copy.unavailable); }
  }, []);
  const ask = prompt.ask;
  const requestLocation = useCallback(() => {
    if (inFlight.current) return;
    setError('');
    if (!navigator.geolocation) { setError(deviceAccessCopy().unsupported); return; }
    ask({ kind: 'location', confirm: locate });
  }, [ask, locate]);
  useEffect(() => {
    if (!requestOnOpen || requestedOnOpen.current) return;
    requestedOnOpen.current = true;
    if (accessDecision('location') !== 'dismissed') requestLocation();
  }, [requestOnOpen, requestLocation]);
  return { position, busy, error, clearError: () => setError(''), requestLocation, dialog: prompt.dialog };
}
