import DevLogin from "./DevLogin";

export default function LoginPanel() {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        boxShadow: "0 2px 14px rgba(0,0,0,0.06)",
        padding: 18,
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 10 }}>Login</div>
      <DevLogin />
      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
        DevLogin + Google Login (wie in /map).
      </div>
    </div>
  );
}
