import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { defaultLegalLanguage, isLegalLanguage, LEGAL_LANGUAGES, LEGAL_UI, type LegalKind, type LegalLanguage } from "./ui";
import "./legal.css";

type Section = { title: string; paragraphs: string[] };
type Documents = Record<"current" | "draft", Record<LegalKind, Section[]>>;
const loaders: Record<LegalLanguage, () => Promise<{ default: Documents }>> = {
  de: () => import("./content/de.json"), fr: () => import("./content/fr.json"),
  it: () => import("./content/it.json"), en: () => import("./content/en.json"),
};

export default function LegalDocumentPage({ kind }: { kind: LegalKind }) {
  const [params, setParams] = useSearchParams();
  const requested = params.get("lang");
  const language = isLegalLanguage(requested) ? requested : defaultLegalLanguage();
  const version = params.get("version") === "draft" ? "draft" : "current";
  const copy = LEGAL_UI[language];
  const [loaded, setLoaded] = useState<{ language: LegalLanguage; documents: Documents } | null>(null);
  const [failure, setFailure] = useState<{ language: LegalLanguage; attempt: number } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    loaders[language]().then(({ default: documents }) => {
      if (!cancelled) { setLoaded({ language, documents }); setFailure(null); }
    }).catch(() => { if (!cancelled) setFailure({ language, attempt }); });
    return () => { cancelled = true; };
  }, [language, attempt]);
  useEffect(() => { window.scrollTo(0, 0); }, [kind, language, version]);
  const failed = failure?.language === language && failure.attempt === attempt;
  const sections = loaded?.language === language ? loaded.documents[version][kind] : null;
  const documentUrl = (next: LegalKind) => `/${next}?lang=${language}&version=${version === "draft" ? "draft" : "v1"}`;
  const changeParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next);
  };
  const date = new Intl.DateTimeFormat(language, { dateStyle: "long", timeZone: "UTC" }).format(new Date(version === "draft" ? "2026-10-29T12:00:00Z" : "2026-06-10T12:00:00Z"));
  return (
    <main className="fw-legal" lang={language}>
      <div className="fw-legal__wrap">
        <header className="fw-legal__header">
          <Link className="fw-legal__back" to="/map">← {copy.back}</Link>
          <span className="fw-legal__brand">Fairwayd</span>
          <label className="fw-legal__language">{copy.language}
            <select value={language} onChange={event => changeParam("lang", event.target.value)}>
              {LEGAL_LANGUAGES.map(item => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </label>
        </header>
        <nav className="fw-legal__documents" aria-label={copy.contents}>
          {(["terms", "privacy"] as const).map(item => <Link key={item} to={documentUrl(item)} aria-current={item === kind ? "page" : undefined}>{copy[item]}</Link>)}
        </nav>
        <h1>{copy[kind]}</h1>
        <p className="fw-legal__date">{version === "draft" ? "v1.0-pilot-draft-2026-10-29" : "v1"} · {copy.version}: {date}</p>
        <div className="fw-legal__versions" role="group" aria-label={copy.version}>
          <button type="button" aria-pressed={version === "current"} onClick={() => changeParam("version", "v1")}>{copy.current}</button>
          <button type="button" aria-pressed={version === "draft"} onClick={() => changeParam("version", "draft")}>{copy.draft}</button>
        </div>
        <aside className="fw-legal__notice" aria-label={version === "draft" ? copy.draft : copy.current}>
          <p>{version === "draft" ? copy.draftNotice : copy.currentNotice}</p>
          {version === "draft" ? <p>{copy.translation}</p> : null}
        </aside>
        {failed ? <div role="alert"><p>{copy.error}</p><button type="button" onClick={() => setAttempt(value => value + 1)}>{copy.retry}</button></div> : sections ? <>
          <div className="fw-legal__tools"><button type="button" onClick={() => window.print()}>{copy.print}</button></div>
          <details className="fw-legal__toc">
            <summary>{copy.contents}</summary>
            <ol>{sections.map((section, index) => <li key={section.title}><a href={`#legal-section-${index}`}>{section.title}</a></li>)}</ol>
          </details>
          <article aria-label={copy[kind]}>
            {sections.map((section, index) => <section key={`${version}-${index}`} id={`legal-section-${index}`} className="fw-legal__section">
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
            </section>)}
          </article>
        </> : <p role="status">{copy.loading}</p>}
        <footer className="fw-legal__footer">
          <p>beeZONE, Beda Christener · Hombergerstr. 14 · 4422 Arisdorf · Schweiz<br />UID CHE-310.823.737</p>
          <a href={`mailto:${kind === "privacy" ? "privacy" : "legal"}@fairwayd.golf`}>{kind === "privacy" ? "privacy" : "legal"}@fairwayd.golf</a>
        </footer>
      </div>
    </main>
  );
}
