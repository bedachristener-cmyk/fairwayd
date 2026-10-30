import { deviceAccessCopy } from './copy';
export default function DeviceAccessHelp() {
  const copy = deviceAccessCopy();
  return <section id="device-access" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, display: 'grid', gap: 12, scrollMarginTop: 90 }}>
    <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{copy.settingsTitle}</h2>
    <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--sub)' }}>{copy.settingsBody}</p>
    <p style={{ margin: 0, lineHeight: 1.6, color: 'var(--sub)' }}>{copy.settingsHelp}</p>
  </section>;
}
