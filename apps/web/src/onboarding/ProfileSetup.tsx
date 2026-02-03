import { useMemo, useState } from "react";
import { apiPostForm, apiPostJson } from "../api";
import type { Me } from "../auth/useMe";

export default function ProfileSetup({
  me,
  onDone,
}: {
  me: Me;
  onDone: () => Promise<void>;
}) {
  const [handle, setHandle] = useState(me.handle ?? "");
  const [name, setName] = useState(me.name ?? "");
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const handleHint = useMemo(() => {
    const h = handle.trim().toLowerCase();
    if (!h) return "Handle ist required (z.B. beda)";
    if (!/^[a-z0-9_]+$/.test(h)) return "Nur a-z, 0-9 und _";
    if (h.length > 20) return "Max 20 Zeichen";
    return "OK";
  }, [handle]);

  const saveProfile = async () => {
    setMsg(null);
    const h = handle.trim();
    if (!h) {
      setMsg("Bitte einen Handle eingeben");
      return;
    }

    try {
      setBusy(true);

      await apiPostJson("/users/me/profile", {
        handle: h,
        name: name.trim() ? name.trim() : null,
      });

      if (file) {
        const form = new FormData();
        form.append("avatar", file);
        await apiPostForm("/users/me/avatar", form);
      }

      await onDone();
    } catch (e: any) {
      setMsg(e?.message ?? "Failed to update profile");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{ maxWidth: 720, margin: "40px auto", fontFamily: "system-ui" }}
    >
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Complete your profile</h1>
      <p style={{ opacity: 0.85, lineHeight: 1.5 }}>
        Wir brauchen mindestens einen Handle und ein Avatar-Bild.
      </p>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <label style={{ display: "block", fontWeight: 800, marginBottom: 6 }}>
          Handle
        </label>
        <input
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          placeholder="z.B. beda"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
            fontSize: 14,
          }}
        />
        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
          {handleHint}
        </div>

        <label
          style={{
            display: "block",
            fontWeight: 800,
            marginTop: 14,
            marginBottom: 6,
          }}
        >
          Name (optional)
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="z.B. Beda"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
            fontSize: 14,
          }}
        />

        <label
          style={{
            display: "block",
            fontWeight: 800,
            marginTop: 14,
            marginBottom: 6,
          }}
        >
          Avatar (jpg/png/webp)
        </label>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        {msg && (
          <div style={{ marginTop: 12, color: "crimson", fontWeight: 700 }}>
            {msg}
          </div>
        )}

        <button
          onClick={saveProfile}
          disabled={busy}
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #ddd",
            fontWeight: 800,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          {busy ? "Saving..." : "Save & Continue"}
        </button>
      </div>
    </div>
  );
}
