import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import GoogleLoginButton from "../auth/oauth/GoogleLoginButton";
import { API_BASE } from "../api/base";
import { validPostLoginNext } from "../auth/postLoginNext";

export default function LoginPanel() {
  const nav = useNavigate();
  const loc = useLocation();
  const { login } = useAuth();

  const [mode, setMode] = useState<
    "signin" | "register" | "verify" | "forgotPassword" | "resetPassword"
  >("signin");
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [registerBusy, setRegisterBusy] = useState(false);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const cleanEmail = email.trim();
  const canRegister =
    name.trim().length > 0 &&
    cleanEmail.length > 0 &&
    password.length >= 8 &&
    passwordConfirm.length > 0 &&
    password === passwordConfirm &&
    acceptedLegal;

  const googleConfigured = useMemo(() => {
    // Vite ersetzt das zur Build-Zeit; wenn es fehlt, ist Google Login nicht konfiguriert
    return !!import.meta.env.VITE_GOOGLE_CLIENT_ID;
  }, []);

  useEffect(() => {
    const savedRemember = localStorage.getItem("fairwayd_remember_me");
    if (savedRemember != null) setRememberMe(savedRemember === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem("fairwayd_remember_me", rememberMe ? "1" : "0");
  }, [rememberMe]);

  const onLoggedIn = (token: string) => {
    setMsg(null);
    login(token, rememberMe);
    const next = validPostLoginNext(new URLSearchParams(loc.search).get("next"));
    nav(next ?? "/feed", { replace: true });
  };

  const readApiError = async (res: Response, fallback: string) => {
    const text = await res.text().catch(() => "");
    let message = "";

    if (text) {
      try {
        const data = JSON.parse(text);
        message = Array.isArray(data?.message)
          ? data.message.join(", ")
          : typeof data?.message === "string"
            ? data.message
            : typeof data?.code === "string"
              ? data.code
              : typeof data?.error === "string"
                ? data.error
                : text;
      } catch {
        message = text;
      }
    }

    return message
      ? `${fallback}: ${message} (${res.status})`
      : `${fallback} (${res.status})`;
  };

  const readableMessage = (value: string) => {
    if (/EMAIL_NOT_VERIFIED/i.test(value)) {
      return "Please verify your email before signing in.";
    }
    if (/invalid email or password/i.test(value)) {
      return "Invalid email or password.";
    }
    if (/invalid|expired|attempt/i.test(value) && /code/i.test(value)) {
      return "Invalid or expired code.";
    }
    return value.replace(/\s+\(\d{3}\)$/, ".");
  };

  const isPositiveMessage = (value: string) =>
    /sent|check your email|reset\.|new verification code|can sign in/i.test(
      value,
    );

  const passwordLogin = async () => {
    const value = email.trim();
    if (!value || !password || passwordBusy) return;

    try {
      setPasswordBusy(true);
      setMsg(null);

      const res = await fetch(`${API_BASE}/auth/password-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, password }),
      });

      if (!res.ok) {
        const apiError = await readApiError(res, "Invalid email or password");
        if (/EMAIL_NOT_VERIFIED/i.test(apiError)) {
          setVerificationEmail(value);
          setMode("verify");
          throw new Error("Please verify your email before signing in.");
        }
        throw new Error(apiError);
      }

      const data = await res.json();
      const token = typeof data?.token === "string" ? data.token : "";
      if (!token) {
        throw new Error("Invalid email or password");
      }

      onLoggedIn(token);
    } catch (err) {
      setMsg(
        readableMessage(
          err instanceof Error ? err.message : "Invalid email or password",
        ),
      );
    } finally {
      setPasswordBusy(false);
    }
  };

  const registerAccount = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();
    if (registerBusy) return;

    if (!cleanName) {
      setMsg("Name is required");
      return;
    }
    if (!cleanEmail) {
      setMsg("Email is required");
      return;
    }
    if (password.length < 8) {
      setMsg("Password must be at least 8 characters");
      return;
    }
    if (password !== passwordConfirm) {
      setMsg("Passwords do not match");
      return;
    }
    if (!acceptedLegal) {
      setMsg("Please accept the Terms & Conditions and Privacy Policy.");
      return;
    }

    try {
      setRegisterBusy(true);
      setMsg(null);

      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          email: cleanEmail,
          password,
          passwordConfirm,
          acceptedTerms: acceptedLegal,
          acceptedPrivacy: acceptedLegal,
        }),
      });

      if (!res.ok) {
        const apiError = await readApiError(res, "Could not create account");

        if (res.status === 409 || /already registered/i.test(apiError)) {
          throw new Error(
            "This email is already registered. Please sign in instead.",
          );
        }

        throw new Error(apiError);
      }

      await res.json().catch(() => null);
      setVerificationEmail(cleanEmail);
      setVerificationCode("");
      setMode("verify");
      setMsg("Check your email for a 6-digit verification code.");
    } catch (err) {
      setMsg(
        readableMessage(
          err instanceof Error ? err.message : "Could not create account",
        ),
      );
    } finally {
      setRegisterBusy(false);
    }
  };

  const verifyAccount = async () => {
    const cleanEmail = verificationEmail.trim() || email.trim();
    const code = verificationCode.trim();
    if (verifyBusy) return;

    if (!cleanEmail || !code) {
      setMsg("Enter the verification code from your email.");
      return;
    }

    try {
      setVerifyBusy(true);
      setMsg(null);

      const res = await fetch(`${API_BASE}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, code }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not verify account"));
      }

      const data = await res.json();
      const token = typeof data?.token === "string" ? data.token : "";
      if (!token) {
        throw new Error("Could not verify account");
      }

      onLoggedIn(token);
    } catch (err) {
      setMsg(
        readableMessage(
          err instanceof Error ? err.message : "Could not verify account",
        ),
      );
    } finally {
      setVerifyBusy(false);
    }
  };

  const resendVerificationCode = async () => {
    const cleanEmail = verificationEmail.trim() || email.trim();
    if (!cleanEmail || resendBusy) return;

    try {
      setResendBusy(true);
      setMsg(null);

      const res = await fetch(`${API_BASE}/auth/resend-verification-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not resend code"));
      }

      setMsg("A new verification code has been sent.");
    } catch (err) {
      setMsg(
        readableMessage(
          err instanceof Error ? err.message : "Could not resend code",
        ),
      );
    } finally {
      setResendBusy(false);
    }
  };

  const requestPasswordReset = async () => {
    const cleanEmail = (resetEmail || email).trim();
    if (forgotBusy) return;

    if (!cleanEmail) {
      setMsg("Email is required");
      return;
    }

    try {
      setForgotBusy(true);
      setMsg(null);

      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not send reset code"));
      }

      setResetEmail(cleanEmail);
      setResetCode("");
      setResetPassword("");
      setResetPasswordConfirm("");
      setMode("resetPassword");
      setMsg("If an account exists for this email, we sent a reset code.");
    } catch (err) {
      setMsg(
        readableMessage(
          err instanceof Error ? err.message : "Could not send reset code",
        ),
      );
    } finally {
      setForgotBusy(false);
    }
  };

  const submitPasswordReset = async () => {
    const cleanEmail = resetEmail.trim();
    if (resetBusy) return;

    if (!cleanEmail || !resetCode.trim()) {
      setMsg("Enter your email and reset code.");
      return;
    }
    if (resetPassword.length < 8) {
      setMsg("New password must be at least 8 characters.");
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setMsg("Passwords do not match.");
      return;
    }

    try {
      setResetBusy(true);
      setMsg(null);

      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          code: resetCode,
          newPassword: resetPassword,
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res, "Could not reset password"));
      }

      setPassword("");
      setEmail(cleanEmail);
      setMode("signin");
      setMsg("Password reset. You can sign in now.");
    } catch (err) {
      setMsg(
        readableMessage(
          err instanceof Error ? err.message : "Could not reset password",
        ),
      );
    } finally {
      setResetBusy(false);
    }
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "12px 13px",
    font: "inherit",
    fontSize: 16,
    color: "var(--text)",
    background: "var(--card)",
    outline: "none",
  };

  const primaryButtonStyle: CSSProperties = {
    width: "100%",
    minHeight: 46,
    padding: "12px 14px",
    borderRadius: "var(--fw-pill-radius)",
    border: "1px solid transparent",
    background: "var(--fw-pill-cta-bg)",
    color: "var(--fw-pill-cta-text)",
    fontWeight: 900,
    fontSize: 15,
    boxShadow: "var(--fw-pill-shadow)",
  };

  const linkButtonStyle: CSSProperties = {
    border: 0,
    background: "transparent",
    color: "var(--accent-strong)",
    font: "inherit",
    fontSize: 14,
    fontWeight: 800,
    padding: "6px 0",
    cursor: "pointer",
    textDecoration: "none",
  };

  const fieldGroupStyle: CSSProperties = {
    display: "grid",
    gap: 10,
  };

  const titleStyle: CSSProperties = {
    margin: 0,
    color: "var(--text)",
    fontSize: 22,
    lineHeight: 1.1,
    fontWeight: 950,
    letterSpacing: 0,
  };

  const helpTextStyle: CSSProperties = {
    margin: 0,
    fontSize: 13,
    color: "var(--sub)",
    lineHeight: 1.45,
  };

  return (
    <div
      className="fw-auth-card fw-surface-card"
      style={{
        padding: 18,
      }}
    >
      {import.meta.env.DEV ? (
        <div style={{ fontSize: 11, opacity: 0.55, marginBottom: 8 }}>
          build {import.meta.env.MODE} / {window.location.origin} / api{" "}
          {API_BASE}
        </div>
      ) : null}

      {msg && (
        <div
          className={
            isPositiveMessage(msg)
              ? "fw-auth-message fw-auth-message--success"
              : "fw-auth-message fw-auth-message--error"
          }
          style={{
            marginBottom: 12,
          }}
        >
          {msg}
        </div>
      )}

      {mode === "signin" ? (
        <>
          <div
            style={fieldGroupStyle}
          >
            <div style={{ display: "grid", gap: 6 }}>
              <h2 style={titleStyle}>Sign in to Fairwayd</h2>
              <p style={helpTextStyle}>
                Use your email and password, or continue with Google.
              </p>
            </div>

            <input
              className="fw-auth-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void passwordLogin();
              }}
              placeholder="you@example.com"
              autoComplete="email"
              style={inputStyle}
            />

            <input
              className="fw-auth-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void passwordLogin();
              }}
              placeholder="Password"
              autoComplete="current-password"
              style={inputStyle}
            />

            <label
              className="fw-auth-check-row"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <button
              className="fw-auth-primary"
              type="button"
              disabled={passwordBusy || !email.trim() || !password}
              onClick={passwordLogin}
              style={{
                ...primaryButtonStyle,
                opacity: passwordBusy || !email.trim() || !password ? 0.6 : 1,
                cursor:
                  passwordBusy || !email.trim() || !password
                    ? "default"
                    : "pointer",
              }}
            >
              {passwordBusy ? "Signing in..." : "Sign in"}
            </button>

            <button
              className="fw-auth-link"
              type="button"
              onClick={() => {
                setResetEmail(email.trim());
                setMode("forgotPassword");
                setMsg(null);
              }}
              style={{
                ...linkButtonStyle,
                justifySelf: "start",
                padding: "2px 0",
              }}
            >
              Forgot password?
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 12,
              margin: "16px 0",
              color: "var(--sub)",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            <div style={{ height: 1, background: "var(--border)" }} />
            <div>or</div>
            <div style={{ height: 1, background: "var(--border)" }} />
          </div>

          {googleConfigured ? (
            <div className="fw-auth-google">
              <GoogleLoginButton
                onToken={(token: string) => onLoggedIn(token)}
                onError={(m: string) => setMsg(m || null)}
              />
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                Google Login ist nicht konfiguriert.
              </div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                Setze <strong>VITE_GOOGLE_CLIENT_ID</strong> im Web (Vercel /
                .env), dann erscheint der Google Button.
              </div>
            </>
          )}

          <button
            className="fw-auth-link"
            type="button"
            onClick={() => {
              setMode("register");
              setMsg(null);
            }}
            style={{ ...linkButtonStyle, marginTop: 10 }}
          >
            Create account
          </button>
        </>
      ) : mode === "register" ? (
        <div
          style={fieldGroupStyle}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={titleStyle}>Create your Fairwayd account</h2>
            <p style={helpTextStyle}>
              Join Fairwayd with email and password.
            </p>
          </div>

          <input
            className="fw-auth-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            autoComplete="name"
            style={inputStyle}
          />

          <input
            className="fw-auth-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={inputStyle}
          />

          <input
            className="fw-auth-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="new-password"
            style={inputStyle}
          />

          <input
            className="fw-auth-input"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void registerAccount();
            }}
            placeholder="Repeat password"
            autoComplete="new-password"
            style={inputStyle}
          />

          <label
            className="fw-auth-legal"
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={acceptedLegal}
              onChange={(e) => setAcceptedLegal(e.target.checked)}
              required
              style={{
                width: 18,
                height: 18,
                margin: 0,
                marginTop: 1,
                flex: "0 0 auto",
                accentColor: "var(--accent)",
                cursor: "pointer",
              }}
            />
            <span style={{ minWidth: 0 }}>
              I accept the{" "}
              <Link
                to="/terms"
                className="fw-auth-inline-link"
                style={{ fontWeight: 900 }}
              >
                Terms & Conditions
              </Link>{" "}
              and{" "}
              <Link
                to="/privacy"
                className="fw-auth-inline-link"
                style={{ fontWeight: 900 }}
              >
                Privacy Policy
              </Link>
            </span>
          </label>

          <button
            className="fw-auth-primary"
            type="button"
            disabled={registerBusy || !canRegister}
            onClick={registerAccount}
            style={{
              ...primaryButtonStyle,
              opacity: registerBusy || !canRegister ? 0.6 : 1,
              cursor: registerBusy || !canRegister ? "default" : "pointer",
            }}
          >
            {registerBusy ? "Creating account..." : "Register account"}
          </button>

          <button
            className="fw-auth-link"
            type="button"
            onClick={() => {
              setMode("signin");
              setMsg(null);
            }}
            style={linkButtonStyle}
          >
            Already have an account? Sign in
          </button>
        </div>
      ) : mode === "verify" ? (
        <div
          style={fieldGroupStyle}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={titleStyle}>Verify your email</h2>
            <p style={helpTextStyle}>
              Enter the 6-digit code sent to {verificationEmail || email}.
            </p>
          </div>

          <input
            className="fw-auth-input fw-auth-code-input"
            type="text"
            inputMode="numeric"
            value={verificationCode}
            onChange={(e) =>
              setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") void verifyAccount();
            }}
            placeholder="123456"
            autoComplete="one-time-code"
            style={{
              ...inputStyle,
              textAlign: "center",
              letterSpacing: 6,
              fontWeight: 900,
            }}
          />

          <button
            className="fw-auth-primary"
            type="button"
            disabled={verifyBusy || verificationCode.trim().length !== 6}
            onClick={verifyAccount}
            style={{
              ...primaryButtonStyle,
              opacity:
                verifyBusy || verificationCode.trim().length !== 6 ? 0.6 : 1,
              cursor:
                verifyBusy || verificationCode.trim().length !== 6
                  ? "default"
                  : "pointer",
            }}
          >
            {verifyBusy ? "Verifying..." : "Verify account"}
          </button>

          <button
            className="fw-auth-link"
            type="button"
            disabled={resendBusy}
            onClick={resendVerificationCode}
            style={linkButtonStyle}
          >
            {resendBusy ? "Sending..." : "Resend code"}
          </button>

          <button
            className="fw-auth-link"
            type="button"
            onClick={() => {
              setMode("signin");
              setMsg(null);
            }}
            style={linkButtonStyle}
          >
            Back to sign in
          </button>
        </div>
      ) : mode === "forgotPassword" ? (
        <div
          style={fieldGroupStyle}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={titleStyle}>Reset your password</h2>
            <p style={helpTextStyle}>
              Enter your email and we will send a reset code if the account
              exists.
            </p>
          </div>

          <input
            className="fw-auth-input"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void requestPasswordReset();
            }}
            placeholder="you@example.com"
            autoComplete="email"
            style={inputStyle}
          />

          <button
            className="fw-auth-primary"
            type="button"
            disabled={forgotBusy || !resetEmail.trim()}
            onClick={requestPasswordReset}
            style={{
              ...primaryButtonStyle,
              opacity: forgotBusy || !resetEmail.trim() ? 0.6 : 1,
              cursor: forgotBusy || !resetEmail.trim() ? "default" : "pointer",
            }}
          >
            {forgotBusy ? "Sending..." : "Send reset code"}
          </button>

          <button
            className="fw-auth-link"
            type="button"
            onClick={() => {
              setMode("signin");
              setMsg(null);
            }}
            style={linkButtonStyle}
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <div
          style={fieldGroupStyle}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={titleStyle}>Enter reset code</h2>
            <p style={helpTextStyle}>
              Use the 6-digit code from your email and choose a new password.
            </p>
          </div>

          <input
            className="fw-auth-input"
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            style={inputStyle}
          />

          <input
            className="fw-auth-input"
            type="text"
            inputMode="numeric"
            value={resetCode}
            onChange={(e) =>
              setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            placeholder="Reset code"
            autoComplete="one-time-code"
            style={inputStyle}
          />

          <input
            className="fw-auth-input"
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            style={inputStyle}
          />

          <input
            className="fw-auth-input"
            type="password"
            value={resetPasswordConfirm}
            onChange={(e) => setResetPasswordConfirm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submitPasswordReset();
            }}
            placeholder="Confirm new password"
            autoComplete="new-password"
            style={inputStyle}
          />

          <button
            className="fw-auth-primary"
            type="button"
            disabled={
              resetBusy ||
              !resetEmail.trim() ||
              resetCode.trim().length !== 6 ||
              !resetPassword ||
              !resetPasswordConfirm
            }
            onClick={submitPasswordReset}
            style={{
              ...primaryButtonStyle,
              opacity:
                resetBusy ||
                !resetEmail.trim() ||
                resetCode.trim().length !== 6 ||
                !resetPassword ||
                !resetPasswordConfirm
                  ? 0.6
                  : 1,
              cursor:
                resetBusy ||
                !resetEmail.trim() ||
                resetCode.trim().length !== 6 ||
                !resetPassword ||
                !resetPasswordConfirm
                  ? "default"
                  : "pointer",
            }}
          >
            {resetBusy ? "Resetting..." : "Reset password"}
          </button>

          <button
            className="fw-auth-link"
            type="button"
            onClick={() => {
              setMode("forgotPassword");
              setMsg(null);
            }}
            style={linkButtonStyle}
          >
            Send a new code
          </button>
        </div>
      )}
    </div>
  );
}
