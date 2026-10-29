import type { CSSProperties, ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type MobilePageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  backLabel?: string;
  backTo?: string;
  style?: CSSProperties;
};

export default function MobilePageHeader({
  title,
  subtitle,
  action,
  backLabel = "Back",
  backTo,
  style,
}: MobilePageHeaderProps) {
  const nav = useNavigate();

  return (
    <header
      style={{
        display: "grid",
        gap: 6,
        padding: "max(2px, env(safe-area-inset-top, 0px)) 2px 2px",
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => {
          if (backTo) {
            nav(backTo);
          } else if (window.history.length > 1) {
            nav(-1);
          } else {
            nav("/feed");
          }
        }}
        style={{
          minHeight: 44,
          minWidth: 44,
          width: "fit-content",
          marginLeft: -10,
          padding: "0 10px",
          border: "none",
          background: "transparent",
          color: "var(--text)",
          fontSize: 15,
          fontWeight: 850,
          lineHeight: 1,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 7,
          cursor: "pointer",
        }}
      >
        <ArrowLeft size={20} strokeWidth={2.5} />
        {backLabel}
      </button>

      <div
        style={{
          minWidth: 0,
          display: "grid",
          gridTemplateColumns: action ? "1fr auto" : "1fr",
          alignItems: "start",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0, display: "grid", gap: 4 }}>
          <h1
            style={{
              margin: 0,
              color: "var(--text)",
              fontSize: 24,
              lineHeight: 1.1,
              fontWeight: 900,
            }}
          >
            {title}
          </h1>

          {subtitle ? (
            <p
              style={{
                margin: 0,
                color: "var(--sub)",
                fontSize: 13,
                lineHeight: 1.45,
              }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>

        {action ? (
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              minHeight: 44,
            }}
          >
            {action}
          </div>
        ) : null}
      </div>
    </header>
  );
}
