import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import GoogleLoginButton from "../auth/oauth/GoogleLoginButton";
import { API_BASE } from "../api/base";
import { validPostLoginNext } from "../auth/postLoginNext";
import { t } from "../i18n/strings";

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
      return t("auth_error_verify_email_first");
    }
    if (/invalid email or password/i.test(value)) {
      return t("auth_error_invalid_credentials");
    }
    if (/invalid|expired|attempt/i.test(value) && /code/i.test(value)) {
      return t("auth_error_invalid_code");
    }
    return value.replace(/\s+\(\d{3}\)$/, ".");
  };

  const isPositiveMessage = (value: string) => {
    const positiveMessages = new Set([
      t("auth_register_verification_sent"),
      t("auth_verification_code_sent"),
      t("auth_reset_code_sent"),
      t("auth_password_reset_done"),
    ]);
    return (
      positiveMessages.has(value) ||
      /sent|check your email|reset\.|new verification code|can sign in/i.test(
        value,
      )
    );
  };

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
        const apiError = await readApiError(res, t("auth_error_invalid_credentials"));
        if (/EMAIL_NOT_VERIFIED/i.test(apiError)) {
          setVerificationEmail(value);
          setMode("verify");
          throw new Error(t("auth_error_verify_email_first"));
        }
        throw new Error(apiError);
      }

      const data = await res.json();
      const token = typeof data?.token === "string" ? data.token : "";
      if (!token) {
        throw new Error(t("auth_error_invalid_credentials"));
      }

      onLoggedIn(token);
    } catch (err) {
      setMsg(
        readableMessage(
          err instanceof Error ? err.message : t("auth_error_invalid_credentials"),
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
      setMsg(t("auth_error_name_required"));
      return;
    }
    if (!cleanEmail) {
      setMsg(t("auth_error_email_required"));
      return;
    }
    if (password.length < 8) {
      setMsg(t("auth_error_password_min"));
      return;
    }
    if (password !== passwordConfirm) {
      setMsg(t("auth_error_passwords_mismatch"));
      return;
    }
    if (!acceptedLegal) {
      setMsg(t("auth_error_accept_legal"));
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
        const apiError = await readApiError(res, t("auth_error_create_account"));

        if (res.status === 409 || /already registered/i.test(apiError)) {
          throw new Error(
            t("auth_error_email_registered"),
          );
        }

        throw new Error(apiError);
      }

      await res.json().catch(() => null);
      setVerificationEmail(cleanEmail);
      setVerificationCode("");
      setMode("verify");
      setMsg(t("auth_register_verification_sent"));
    } catch (err) {
      setMsg(
        readableMessage(
          err instanceof Error ? err.message : t("auth_error_create_account"),
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
      setMsg(t("auth_error_enter_verification_code"));
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
        throw new Error(await readApiError(res, t("auth_error_verify_account")));
      }

      const data = await res.json();
      const token = typeof data?.token === "string" ? data.token : "";
      if (!token) {
        throw new Error(t("auth_error_verify_account"));
      }

      onLoggedIn(token);
    } catch (err) {
      setMsg(
        readableMessage(
          err instanceof Error ? err.message : t("auth_error_verify_account"),
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
        throw new Error(await readApiError(res, t("auth_error_resend_code")));
      }

      setMsg(t("auth_verification_code_sent"));
    } catch (err) {
      setMsg(
        readableMessage(
          err instanceof Error ? err.message : t("auth_error_resend_code"),
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
      setMsg(t("auth_error_email_required"));
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
        throw new Error(await readApiError(res, t("auth_error_send_reset_code")));
      }

      setResetEmail(cleanEmail);
      setResetCode("");
      setResetPassword("");
      setResetPasswordConfirm("");
      setMode("resetPassword");
      setMsg(t("auth_reset_code_sent"));
    } catch (err) {
      setMsg(
        readableMessage(
          err instanceof Error ? err.message : t("auth_error_send_reset_code"),
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
      setMsg(t("auth_error_enter_email_reset_code"));
      return;
    }
    if (resetPassword.length < 8) {
      setMsg(t("auth_error_new_password_min"));
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setMsg(t("auth_error_passwords_mismatch"));
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
        throw new Error(await readApiError(res, t("auth_error_reset_password")));
      }

      setPassword("");
      setEmail(cleanEmail);
      setMode("signin");
      setMsg(t("auth_password_reset_done"));
    } catch (err) {
      setMsg(
        readableMessage(
          err instanceof Error ? err.message : t("auth_error_reset_password"),
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
              <h2 style={titleStyle}>{t("auth_signin_title")}</h2>
              <p style={helpTextStyle}>
                {t("auth_signin_help")}
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
              placeholder={t("auth_password_placeholder")}
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
              <span>{t("auth_remember_me")}</span>
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
              {passwordBusy ? t("auth_signing_in") : t("auth_sign_in")}
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
              {t("auth_forgot_password")}
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
            <div>{t("auth_or")}</div>
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
                {t("auth_google_not_configured")}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
                {t("auth_google_config_help_prefix")}{" "}
                <strong>VITE_GOOGLE_CLIENT_ID</strong>{" "}
                {t("auth_google_config_help_suffix")}
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
            {t("auth_create_account")}
          </button>
        </>
      ) : mode === "register" ? (
        <div
          style={fieldGroupStyle}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={titleStyle}>{t("auth_register_title")}</h2>
            <p style={helpTextStyle}>
              {t("auth_register_help")}
            </p>
          </div>

          <input
            className="fw-auth-input"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("auth_name_placeholder")}
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
            placeholder={t("auth_password_placeholder")}
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
            placeholder={t("auth_repeat_password_placeholder")}
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
              {t("auth_accept_prefix")}{" "}
              <Link
                to="/terms"
                className="fw-auth-inline-link"
                style={{ fontWeight: 900 }}
              >
                {t("auth_terms")}
              </Link>{" "}
              {t("auth_accept_and")}{" "}
              <Link
                to="/privacy"
                className="fw-auth-inline-link"
                style={{ fontWeight: 900 }}
              >
                {t("auth_privacy_policy")}
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
            {registerBusy ? t("auth_creating_account") : t("auth_register_account")}
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
            {t("auth_already_have_account")}
          </button>
        </div>
      ) : mode === "verify" ? (
        <div
          style={fieldGroupStyle}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={titleStyle}>{t("auth_verify_title")}</h2>
            <p style={helpTextStyle}>
              {t("auth_verify_help").replace("{email}", verificationEmail || email)}
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
            {verifyBusy ? t("auth_verifying") : t("auth_verify_account")}
          </button>

          <button
            className="fw-auth-link"
            type="button"
            disabled={resendBusy}
            onClick={resendVerificationCode}
            style={linkButtonStyle}
          >
            {resendBusy ? t("sending") : t("auth_resend_code")}
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
            {t("auth_back_to_signin")}
          </button>
        </div>
      ) : mode === "forgotPassword" ? (
        <div
          style={fieldGroupStyle}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={titleStyle}>{t("auth_forgot_title")}</h2>
            <p style={helpTextStyle}>
              {t("auth_forgot_help")}
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
            {forgotBusy ? t("sending") : t("auth_send_reset_code")}
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
            {t("auth_back_to_signin")}
          </button>
        </div>
      ) : (
        <div
          style={fieldGroupStyle}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <h2 style={titleStyle}>{t("auth_reset_title")}</h2>
            <p style={helpTextStyle}>
              {t("auth_reset_help")}
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
            placeholder={t("auth_reset_code_placeholder")}
            autoComplete="one-time-code"
            style={inputStyle}
          />

          <input
            className="fw-auth-input"
            type="password"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
            placeholder={t("auth_new_password_placeholder")}
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
            placeholder={t("auth_confirm_new_password_placeholder")}
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
            {resetBusy ? t("auth_resetting") : t("auth_reset_password")}
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
            {t("auth_send_new_code")}
          </button>
        </div>
      )}
    </div>
  );
}
