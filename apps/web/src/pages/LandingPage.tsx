import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  MapPinned,
  MessageCircleMore,
  Search,
  UsersRound,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { validPostLoginNext } from "../auth/postLoginNext";
import DevLogin from "../components/DevLogin";
import LoginPanel from "../components/LoginPanel";
import {
  LANGUAGE_OPTIONS,
  getLang,
  setLang,
  t,
  type Lang,
} from "../i18n/strings";
import logo from "../assets/logo.png";
import "./LandingPage.css";

const DESTINATIONS = [
  {
    code: "th",
    nameKey: "landing_thailand" as const,
    image: "/destinations/thailand/thailand-golf-destination.jpg",
    copyKey: "landing_thailand_copy" as const,
  },
  {
    code: "pt",
    nameKey: "landing_portugal" as const,
    image: "/destinations/portugal/portugal-golf-destination.jpg",
    copyKey: "landing_portugal_copy" as const,
  },
  {
    code: "es",
    nameKey: "landing_spain" as const,
    image: "/destinations/spain/spain-hero.jpg",
    copyKey: "landing_spain_copy" as const,
  },
  {
    code: "ch",
    nameKey: "landing_switzerland" as const,
    image: "/destinations/switzerland-crans-montana.jpg",
    copyKey: "landing_switzerland_copy" as const,
  },
];

const FEATURES = [
  {
    titleKey: "discover_courses" as const,
    copyKey: "landing_feature_discover_copy" as const,
    Icon: Search,
  },
  {
    titleKey: "landing_feature_follow" as const,
    copyKey: "landing_feature_follow_copy" as const,
    Icon: UsersRound,
  },
  {
    titleKey: "landing_feature_share" as const,
    copyKey: "landing_feature_share_copy" as const,
    Icon: MessageCircleMore,
  },
  {
    titleKey: "landing_feature_trips" as const,
    copyKey: "landing_feature_trips_copy" as const,
    Icon: CalendarDays,
  },
];

export default function LandingPage() {
  const nav = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const loginPanelRef = useRef<HTMLDivElement | null>(null);
  const aboutRef = useRef<HTMLElement | null>(null);
  const [highlightLogin, setHighlightLogin] = useState(false);
  const [showLoginHint, setShowLoginHint] = useState(false);
  const [loginHintText, setLoginHintText] = useState(t("landing_signin_hint"));

  useEffect(() => {
    if (!isAuthenticated) return;
    const next = validPostLoginNext(
      new URLSearchParams(location.search).get("next"),
    );
    nav(next ?? "/feed", { replace: true });
  }, [isAuthenticated, location.search, nav]);

  function focusLogin(message?: string) {
    if (message) {
      setLoginHintText(message);
      setShowLoginHint(true);
      window.setTimeout(() => setShowLoginHint(false), 2400);
    }

    loginPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightLogin(true);
    window.setTimeout(() => {
      loginPanelRef.current
        ?.querySelector<HTMLInputElement>('input[type="email"]')
        ?.focus({ preventScroll: true });
    }, 350);
    window.setTimeout(() => setHighlightLogin(false), 1200);
  }

  function openDestination(path: string) {
    if (isAuthenticated) {
      nav(path);
      return;
    }
    focusLogin(t("landing_destination_signin_hint"));
  }

  function scrollToAbout() {
    aboutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (isAuthenticated) {
    return (
      <main className="fw-landing fw-landing--redirecting">
        <DevLogin />
      </main>
    );
  }

  return (
    <main className="fw-landing">
      <div className="fw-landing__page">
        <section
          className="fw-landing__hero"
          aria-labelledby="landing-title"
          data-testid="landing-hero"
        >
          <header className="fw-landing__topbar" data-testid="landing-header">
            <div className="fw-landing__brand" aria-label="Fairwayd">
              <img src={logo} alt="" />
              <span>Fairwayd</span>
            </div>

            <nav className="fw-landing__nav" aria-label="Fairwayd">
              <button type="button" onClick={() => nav("/map")}>
                {t("courses")}
              </button>
              <button type="button" onClick={() => nav("/map")}>
                {t("map")}
              </button>
              <button type="button" onClick={() => openDestination("/destinations")}>
                {t("destinations")}
              </button>
              <button type="button" onClick={scrollToAbout}>
                {t("about")}
              </button>
            </nav>

            <div className="fw-landing__header-actions">
              <label className="fw-landing__language">
                <span className="fw-landing__visually-hidden">{t("language")}</span>
                <select
                  aria-label={t("language")}
                  defaultValue={getLang()}
                  onChange={(event) => setLang(event.target.value as Lang)}
                >
                  {LANGUAGE_OPTIONS.map((language) => (
                    <option value={language.code} key={language.code}>
                      {language.code.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="fw-landing__header-signin"
                type="button"
                onClick={() => focusLogin()}
              >
                {t("sign_in")}
              </button>
            </div>
          </header>

          <div className="fw-landing__hero-copy" data-testid="landing-hero-copy">
            <div className="fw-landing__hero-content">
              <p className="fw-landing__eyebrow">{t("landing_eyebrow")}</p>
              <h1 id="landing-title">{t("landing_headline")}</h1>
              <p className="fw-landing__lead">{t("landing_support")}</p>

              <div className="fw-landing__actions">
                <button
                  className="fw-landing__button fw-landing__button--primary"
                  type="button"
                  onClick={() => nav("/map")}
                >
                  <MapPinned size={18} aria-hidden="true" />
                  {t("explore_courses")}
                </button>
                <button
                  className="fw-landing__button fw-landing__button--secondary"
                  type="button"
                  onClick={() => focusLogin()}
                >
                  {t("sign_in")}
                </button>
                <button
                  className="fw-landing__text-link"
                  type="button"
                  onClick={scrollToAbout}
                >
                  {t("landing_about_heading")} <span aria-hidden="true">↓</span>
                </button>
              </div>

              <p className="fw-landing__browse-note">{t("landing_browse_hint")}</p>
            </div>
          </div>

          <aside
            className="fw-landing__login-card"
            aria-labelledby="landing-login-title"
            data-testid="landing-login-card"
          >
            <div className="fw-landing__login-intro">
              <span className="fw-landing__login-kicker">{t("landing_welcome")}</span>
              <h2 id="landing-login-title">{t("landing_join")}</h2>
              <p>{t("landing_login_copy")}</p>
            </div>

            <div className="fw-landing__community-points" aria-label={t("landing_join")}>
              <span>{t("landing_community_share")}</span>
              <span>{t("landing_community_map")}</span>
              <span>{t("landing_community_discuss")}</span>
            </div>

            <div
              ref={loginPanelRef}
              className={`fw-landing__login-panel${highlightLogin ? " is-highlighted" : ""}`}
              data-testid="landing-login-panel"
            >
              <LoginPanel />
            </div>

            <p className="fw-landing__login-footnote">{t("landing_browse_first")}</p>
          </aside>
        </section>

        <section className="fw-landing__section" aria-labelledby="popular-destinations-title">
          <div className="fw-landing__section-heading">
            <div>
              <p className="fw-landing__section-kicker">{t("landing_destinations_kicker")}</p>
              <h2 id="popular-destinations-title">{t("landing_destinations_title")}</h2>
              <p>{t("landing_destinations_intro")}</p>
            </div>
            <button
              className="fw-landing__button fw-landing__button--secondary"
              type="button"
              onClick={() => openDestination("/destinations")}
            >
              {t("landing_view_all_destinations")}
            </button>
          </div>

          <div
            className="fw-landing__destinations"
            data-testid="landing-destination-scroller"
            aria-label={t("landing_destinations_title")}
          >
            {DESTINATIONS.map((destination) => (
              <button
                className="fw-landing__destination"
                key={destination.code}
                type="button"
                onClick={() => openDestination(`/destinations/${destination.code}`)}
              >
                <img src={destination.image} alt="" loading="lazy" />
                <span className="fw-landing__destination-overlay">
                  <strong>{t(destination.nameKey)}</strong>
                  <span>{t(destination.copyKey)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section
          ref={aboutRef}
          id="what-is-fairwayd"
          className="fw-landing__section fw-landing__about"
          aria-labelledby="about-fairwayd-title"
        >
          <div className="fw-landing__about-copy">
            <p className="fw-landing__section-kicker">{t("landing_about_heading")}</p>
            <h2 id="about-fairwayd-title">{t("landing_about_title")}</h2>
            <p>{t("landing_about_copy")}</p>
          </div>

          <div className="fw-landing__features">
            {FEATURES.map(({ titleKey, copyKey, Icon }) => (
              <article className="fw-landing__feature" key={titleKey}>
                <span className="fw-landing__feature-icon">
                  <Icon size={21} strokeWidth={2} aria-hidden="true" />
                </span>
                <h3>{t(titleKey)}</h3>
                <p>{t(copyKey)}</p>
              </article>
            ))}
          </div>
        </section>
      </div>

      {showLoginHint ? (
        <div className="fw-landing__toast" role="status">
          {loginHintText}
        </div>
      ) : null}
    </main>
  );
}
