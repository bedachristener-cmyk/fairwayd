import { useState } from 'react';
import { resetDeviceAccessExplanations } from './useDeviceAccess';
import { deviceAccessCopy } from './copy';
export default function DeviceAccessHelp() {
  const copy = deviceAccessCopy();
  const [resetStatus, setResetStatus] = useState<'idle' | 'done' | 'error'>('idle');
  return <section id="device-access" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'grid', gap: 12, scrollMarginTop: 90 }}>
    <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{copy.settingsTitle}</h2>
    <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--sub)' }}>{copy.settingsBody}</p>
    <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--sub)' }}>{copy.settingsHelp}</p>
    <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--sub)' }}>{copy.resetHelp}</p>
    <button type="button" onClick={() => setResetStatus(resetDeviceAccessExplanations() ? 'done' : 'error')} style={{ justifySelf: 'start', minHeight: 44, padding: '10px 18px', borderRadius: 999, border: '1px solid #b69050', background: 'var(--card)', color: 'var(--text)', fontWeight: 750, cursor: 'pointer' }}>{copy.resetButton}</button>
    {resetStatus !== 'idle' && <p role="status" style={{ margin: 0, lineHeight: 1.6 }}>{resetStatus === 'done' ? copy.resetDone : copy.resetError}</p>}
  </section>;
}
