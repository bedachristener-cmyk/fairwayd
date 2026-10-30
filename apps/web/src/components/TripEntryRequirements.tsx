import { ExternalLink, FileCheck2, Stamp } from "lucide-react";
import { getLang } from "../i18n/strings";

const checkedOn = "2026-10-30";
const copy = {
  en: {
    heading: "Entry & visas", country: "Thailand", checked: "Last checked", tdac: "TDAC · Digital arrival card",
    tdacText: "Complete the TDAC within the three days before arrival in Thailand, including the arrival date. The relevant date is your arrival, not your departure. The official form is free of charge.",
    tdacLink: "Open official TDAC form", visa: "Visa / e-Visa", visaText: "Check whether you need a visa based on your nationality, length of stay and travel purpose. A longer stay may require a visa. If needed, apply well ahead of your trip; processing times vary.",
    visaLink: "Check visa options / apply", note: "The TDAC is not a visa and does not replace one. Check the official requirements for your own circumstances before travelling. These links open the official websites; Fairwayd does not submit an application.",
  },
  de: {
    heading: "Einreise & Visa", country: "Thailand", checked: "Zuletzt geprüft", tdac: "TDAC · Digitale Einreisekarte",
    tdacText: "Die TDAC innerhalb der drei Tage vor der Ankunft in Thailand ausfüllen; der Ankunftstag zählt mit. Massgeblich ist die Ankunft, nicht der Abflug. Das offizielle Formular ist kostenlos.",
    tdacLink: "Offizielles TDAC-Formular öffnen", visa: "Visum / E-Visum", visaText: "Prüfe anhand deiner Staatsangehörigkeit, Aufenthaltsdauer und deines Reisezwecks, ob ein Visum nötig ist. Bei längerem Aufenthalt kann ein Visum erforderlich sein. Falls nötig, frühzeitig beantragen; die Bearbeitungszeiten unterscheiden sich.",
    visaLink: "Visa prüfen / beantragen", note: "Die TDAC ist kein Visum und ersetzt keines. Prüfe vor der Reise die offiziellen Vorgaben für deine persönliche Situation. Die Links öffnen die offiziellen Websites; Fairwayd reicht keinen Antrag ein.",
  },
  fr: {
    heading: "Entrée & visas", country: "Thaïlande", checked: "Dernière vérification", tdac: "TDAC · Carte d’arrivée numérique",
    tdacText: "Remplissez la TDAC dans les trois jours précédant l’arrivée en Thaïlande, jour d’arrivée compris. C’est la date d’arrivée qui compte, pas celle du départ. Le formulaire officiel est gratuit.",
    tdacLink: "Ouvrir le formulaire TDAC officiel", visa: "Visa / e-Visa", visaText: "Vérifiez si un visa est nécessaire selon votre nationalité, la durée et le motif du séjour. Un séjour prolongé peut nécessiter un visa. Si nécessaire, faites la demande suffisamment tôt ; les délais de traitement varient.",
    visaLink: "Vérifier les visas / faire une demande", note: "La TDAC n’est pas un visa et ne le remplace pas. Avant le voyage, vérifiez les règles officielles correspondant à votre situation. Les liens ouvrent les sites officiels ; Fairwayd ne soumet aucune demande.",
  },
  it: {
    heading: "Ingresso e visti", country: "Thailandia", checked: "Ultima verifica", tdac: "TDAC · Carta d’arrivo digitale",
    tdacText: "Compila la TDAC nei tre giorni prima dell’arrivo in Thailandia, incluso il giorno di arrivo. Conta la data di arrivo, non quella di partenza. Il modulo ufficiale è gratuito.",
    tdacLink: "Apri il modulo TDAC ufficiale", visa: "Visto / e-Visa", visaText: "Verifica se serve un visto in base alla cittadinanza, alla durata e allo scopo del soggiorno. Per soggiorni più lunghi può essere necessario un visto. Se occorre, richiedilo con anticipo; i tempi di elaborazione variano.",
    visaLink: "Verifica i visti / presenta domanda", note: "La TDAC non è un visto e non lo sostituisce. Prima del viaggio, verifica le regole ufficiali per la tua situazione. I link aprono i siti ufficiali; Fairwayd non presenta alcuna domanda.",
  },
};

export function TripEntryRequirements({ destinations }: { destinations: (string | null | undefined)[] }) {
  const thailand = destinations.some(value => value && /\b(thailand|tha[iï]lande|thailandia|th|tha)\b|ประเทศไทย/iu.test(value));
  if (!thailand) return null;
  const language = getLang();
  const c = copy[language as keyof typeof copy] ?? copy.en;
  const date = new Intl.DateTimeFormat(language, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${checkedOn}T12:00:00Z`));
  const cards = [
    { title: c.tdac, text: c.tdacText, link: c.tdacLink, href: "https://tdac.immigration.go.th/", Icon: FileCheck2 },
    { title: c.visa, text: c.visaText, link: c.visaLink, href: "https://www.thaievisa.go.th/", Icon: Stamp },
  ];
  return (
    <section aria-label={c.heading} data-trip-entry-requirements style={{ minWidth: 0, display: "grid", gap: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 6 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: "var(--text)" }}>{c.heading} · {c.country}</h3>
        <span style={{ color: "var(--sub)", fontSize: 12 }}>{c.checked}: <time dateTime={checkedOn}>{date}</time></span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", gap: 10 }}>
        {cards.map(({ title, text, link, href, Icon }) => (
          <article key={href} style={{ minWidth: 0, border: "1px solid var(--border)", borderRadius: 14, background: "var(--bg)", padding: 14, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 10 }}>
            <h4 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "var(--text)" }}><Icon aria-hidden="true" size={19} style={{ flexShrink: 0 }} />{title}</h4>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.55, color: "var(--sub)", overflowWrap: "anywhere" }}>{text}</p>
            <a href={href} target="_blank" rel="noopener noreferrer" style={{ marginTop: "auto", padding: "8px 0", minHeight: 28, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "var(--text)", overflowWrap: "anywhere" }}>{link}<ExternalLink aria-hidden="true" size={15} style={{ flexShrink: 0 }} /></a>
          </article>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: "var(--sub)" }}>{c.note}</p>
    </section>
  );
}
