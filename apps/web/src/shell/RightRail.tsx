export default function RightRail() {
  return (
    <div
      style={{
        position: "sticky",
        top: 16,
        alignSelf: "start",
        background: "white",
        borderRadius: 16,
        boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
        padding: 16,
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 8 }}>Right rail</div>
      <div style={{ fontSize: 13, opacity: 0.8, lineHeight: 1.4 }}>
        Spater: Trending courses, friends activity, suggestions.
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={pill}>⛳ Course filters (soon)</div>
        <div style={pill}>👥 Friends (soon)</div>
        <div style={pill}>🔥 Trending (soon)</div>
      </div>
    </div>
  );
}

const pill: React.CSSProperties = {
  marginTop: 8,
  padding: "10px 12px",
  borderRadius: 999,
  border: "1px solid rgba(0,0,0,0.08)",
  fontWeight: 700,
  fontSize: 12,
};
