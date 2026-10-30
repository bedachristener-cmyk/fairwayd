# Fairwayd V1.0 – Rechtstexte zur nächsten Durchsicht

Stand: 29. Oktober 2026, Abend (Europe/Zurich). Vorbereitung auf Basis von Stage `a347cbc5aa26f0cac4d1219cb3634059c73a7938`.

Die Texte sind ein überarbeiteter Entwurf. Dieser Vorschlag aktiviert keine neue Vertragsfassung, ändert keine bestehende Zustimmung und richtet kein Prod ein. Bereits verwendete v1-Texte bleiben unverändert. Es wurde keine neue Haftungsfreistellung oder pauschale Datenschutz-Einwilligung hinzugefügt.

## Für Beda: Was wurde geändert?

- Die automatische Inhaltsprüfung wird in den vier Leserentwürfen umgebungsneutral beschrieben. Die tatsächliche Aktivierung auf Stage ist bestätigt; die Aktivierung und Konfiguration auf Prod bleiben eine gesonderte Voraussetzung vor Veröffentlichung.
- Neue auffällige Posts warten vollständig mit Text, Bildern, Golfplatz und Sichtbarkeit geschützt auf die Entscheidung. **Freigeben veröffentlicht direkt**, Ablehnen veröffentlicht nichts. Auch nicht öffentliche Einreichungen werden geprüft.
- Die erneute Einreichung innerhalb von 24 Stunden wird klar auf ältere Fälle und andere geprüfte Funktionen begrenzt. Sie ist nicht mehr mit der Freigabe eines vollständigen neuen Posts vermischt.
- E-Mails zur Prüfung und die Einstellung **Content reviews** sind beschrieben. E-Mails enthalten keine eingereichten Bilder oder Beitragstexte; In-App-Hinweise und die Prüfung bleiben bei abgeschalteten E-Mails aktiv.
- Ein im geprüften Inhalt selbst enthaltenes Reisedokument, ein Name oder eine Finanzangabe kann mitübermittelt werden. Die Aussage, dass separate Trip-Dokumente und Finanzdatensätze nicht automatisch an OpenAI gesendet werden, wird dadurch präziser.
- Kursvorschaubilder werden beschrieben: ausgewähltes Bild eines öffentlichen Posts, sonst aktueller öffentlicher Post; keine Auswahl aus Followers-/Private-Posts. Das ist eine Aussage über die Auswahlfunktion, keine Bestätigung, dass jede direkte Medien-URL geschützt ist.
- Moderationsfristen werden von **Benachrichtigungen, E-Mail-Daten und Backups** getrennt. Deren Löschung folgt nicht automatisch der Löschung eines Prüffalls.
- DE, FR, IT und EN haben denselben fachlichen Stand. Die Übersetzungen sind redaktionell abgeglichen, nicht extern juristisch beglaubigt.

## Was ist bestätigt und was bleibt offen?

| Punkt | Bestätigter Stand | Noch zu erledigen |
|---|---|---|
| Betreiber/Kontakt | beeZONE, Beda Christener, Anschrift und UID im Entwurf; rechtliche/Datenschutz-Adressen wurden getestet | Änderungen vor Veröffentlichung nachführen |
| Pilot/Geschäftsmodell | Eingeladene Gruppe mit Wohnsitz Schweiz; Nutzung derzeit für alle kostenlos; private Kostenteilung ausserhalb der App | Keine spätere Bezahlversion oder Buchungsvermittlung stillschweigend damit einführen |
| Moderation | Stage aktiviert; gewöhnliche Freigabe/Ablehnung vom Betreiber getestet | Verträge, Konto-Datenfreigaben, Empfängerstaaten und Schutzgrundlagen dokumentieren; Prod separat konfigurieren |
| Prüfaufbewahrung | Sieben Tage bis Ablauf offener Fälle/wartender Posts, 24 Stunden für begrenzte Entscheidungsnachweise; Bereinigung im Code vorhanden | Betriebsausfälle, Benachrichtigungen und Backups getrennt berücksichtigen; keine garantierte Löschung sämtlicher Kopien exakt zum Ablaufzeitpunkt |
| Kontolöschung | Datenbanklöschung und Dateibereinigung sind getrennt | Vollständigkeit und Wiederholung fehlgeschlagener Dateilöschung testen, insbesondere Uploads in fremden Trips; gemeinsame Trips und Bildreferenzen berücksichtigen |
| Medien/Cache | Kursbildauswahl verwendet nur öffentliche Posts | Direkte Medien-URLs mit Post-/Profilsichtbarkeit vergleichen; PWA-/Browserdaten beim Abmelden und nach Kontowechsel prüfen |
| Allgemeine Löschfristen | Login-Codes sind 15 Minuten nutzbar; das ist keine Löschfrist | Aufbewahrung für Meldungen, Kontaktmails, Outbox, Logs und Backups festlegen und umsetzen |
| Neue Zustimmung/Alter | Neue Entwürfe öffentlich lesbar, bisherige Zustimmung bleibt v1 | Neue serverseitige Version, unveränderliche Textfassung und erneute AGB-Annahme; Datenschutzinformation getrennt von freiwilliger Einwilligung; 18+-Bestätigung |
| Prod | Noch keine Freigabe durch diesen Vorschlag | Getrennte Ressourcen und tatsächlich verwendete Einstellungen prüfen; anschliessend Endfassung und Gültigkeitsdatum festlegen |

## Dienstleister: vorbereitete Bestandsaufnahme

Das folgende Verzeichnis benennt Datenflüsse aus Implementierung und bisher bestätigtem Betrieb. Es ersetzt keine Prüfung der abgeschlossenen Kontoverträge. **Keine Empfängerstaaten, Zertifizierungen oder Garantien werden aus einem Markennamen oder einer Serverregion abgeleitet.** Pro Anbieter sind noch konkrete Vertragseinheit, Datenverarbeitungsbedingungen, Empfängerstaaten einschliesslich Support/Unterauftragnehmern, gegebenenfalls Transfergarantien und einschlägige Löschregeln zu belegen.

| Dienst | Funktion / betroffene Daten | Kontospezifisch noch zu belegen |
|---|---|---|
| Vercel | Web-Auslieferung, technische Verbindungsdaten und gegebenenfalls Betriebslogs | Tatsächlich aktive Analytics, Logs und Aufbewahrung; Vertrag und internationale Verarbeitung |
| Railway | API-Verarbeitung, technische Betriebsdaten | Regionen allein genügen nicht als Länderbeleg; Logs und Supportzugriff prüfen |
| Neon | Konto-, Social-, Trip- und Moderationsdaten in Postgres | Verträge, Standort-/Supportverarbeitung, Backup/PITR-Aufbewahrung und Wiederherstellungsablauf |
| Cloudflare R2 | Hochgeladene Dateien und Bilder; Dokumentzugriff getrennt von öffentlichen Medien | Bucket-/CDN-Zugriffe, Altobjekte, Löschung und tatsächliche Prod-Konfiguration |
| Resend | Empfängeradressen, Absender, Betreff, Nachrichten und Zustellinformationen | Eigene App-Outbox und Provider-Daten getrennt; Aufbewahrung und Vertrag |
| Google Anmeldung | Identitätskennung, E-Mail, gegebenenfalls Name/Profilbild; OAuth-Scopes `openid email profile` | Vertragsrollen und Datenverarbeitung; kein Gmail-/Kalenderzugriff aus diesen Scopes ableiten |
| Porkbun → Gmail | Kontaktmails samt Adressen und Anhängen an legal/privacy | Tatsächliche Weiterleitung; Eignung und Vertragsrolle des verwendeten Gmail-Kontos, Mail-/Papierkorb-Aufbewahrung |
| OpenAI | Eingereichter Text oder Bilddatei zur Moderation; keine von Fairwayd zusätzlich angehängte Konto-E-Mail/-ID | Tatsächlicher API-Vertragspartner, Länder/Schutzgrundlagen und Datenfreigaben im Konto; keine Behauptung einer besonderen ZDR-Vereinbarung |
| OpenStreetMap / Esri | IP-/Verbindungsdaten und Kartenausschnitte bei Kachelanfragen | Konkrete Betreiber, Länder und Nutzungsbedingungen der verwendeten Endpunkte |
| Frankfurter | Serverabfrage mit Währungspaar, nicht individuelle Trip-Kosten | Tatsächlichen Betreiber und technische Verarbeitung ergänzen |

### OpenAI: geprüfte öffentliche Dokumentation

Die offizielle Dokumentation nennt für `/v1/moderations` keine Nutzung zum Training, keine Speicherung von Anwendungszustand und keine Aufbewahrung von Missbrauchsprotokoll-Inhalten. Daraus folgt **keine** allgemeine Garantie für sämtliche Bild-/Sicherheitsfälle oder alle OpenAI-Endpunkte. Der konkrete Vertrag, freiwillige Datenfreigaben und anwendbare Ausnahmen sind separat zu prüfen. Im geprüften Fairwayd-Code wird `https://api.openai.com/v1/moderations` genutzt; daraus lässt sich keine ausschliessliche europäische Verarbeitung ableiten.

Quelle, am 29.10.2026 abgerufen: https://developers.openai.com/api/docs/guides/your-data .

## Löschkonzept: zur Entscheidung vorbereitet, noch nicht zugesichert

Für die Endfassung benötigt jede Kategorie eine begründete Dauer oder ein konkretes Löschkriterium und einen nachweisbaren technischen/organisatorischen Ablauf. Keine bisher unbekannte Frist wurde in die Lesertexte erfunden.

| Kategorie | Festzulegende Regel | Nachweis vor verbindlicher Zusage |
|---|---|---|
| Konto-/Inhaltsdateien | Bereinigung nach Löschung, Umgang mit weiter verwendeten gemeinsamen Dateien | End-to-End-Test, Fehlerwiederholung und Ergebnisprotokoll ohne unnötige Inhalte |
| Abgelaufene Login-/Verifikationscodes | Frist für physische Datensatzbereinigung nach Ablauf | Bereinigungsjob und Test; 15 Minuten Nutzbarkeit allein reichen nicht |
| Manuelle Meldungen | Löschung nach Fallabschluss; konkret begründete Ausnahme bei Verfahren | Abschlussdatum, Löschlauf, getrennte Behandlung automatischer Prüffälle |
| Kontaktmails | Dauer nach erledigter Anfrage; notwendige Fall-/Anspruchsnachweise | Postfach, Weiterleitungskopien, Papierkorb und Sicherungen berücksichtigen |
| Benachrichtigungen/Outbox | Dauer für App-Hinweis und technische Zustellnachweise getrennt | App-Datensätze und Provider-Retention prüfen, Fehlversanddaten minimieren |
| Logs | Zweckbezogene Dauer je Dienst; keine Rohinhalte unnötig protokollieren | Tatsächliche Plattform-Einstellungen und exportierte Logs einbeziehen |
| Backups | Aufbewahrung, maximale Nachlaufzeit und Umgang mit Wiederherstellung | Konkrete Einstellungen und Wiederherstellungstest; gelöschte Daten dürfen nicht unkontrolliert wieder aktiv werden |

## Nächster Arbeitsschritt

1. Technische offenen Prüfungen zu Kontolöschung, Medienzugriff und lokalem Cache in einer isolierten Testumgebung durchführen. Keine echten Nutzerkonten oder gemeinsamen Reiseunterlagen als Löschtest verwenden.
2. Anbieter-/Kontoangaben ohne Auslesen von Schlüsseln ergänzen; fehlende vertragliche Nachweise für Beda knapp auflisten.
3. Konkretes Löschkonzept festlegen und implementierte Fristen gegen Text abgleichen.
4. Erst danach verbindliche neue Version mit Gültigkeitsdatum und Alters-/Annahmeablauf vorbereiten. Lesen einer Datenschutzerklärung ist keine pauschale Einwilligung in beliebige Datenbearbeitung.
5. Finalen Stand nochmals vorlegen; erforderlichenfalls Schweizer juristische Schlussprüfung. Dieser technische/redaktionelle Abgleich ist keine Rechtsfreigabe und verspricht keinen vollständigen Haftungsausschluss.

## Quellen und Nachweise

- EDÖB, Datenschutzerklärungen im Internet: https://www.edoeb.admin.ch/de/datenschutzerklaerungen-im-internet (Abgleich tatsächlicher Verarbeitung, verständliche Angaben; abgerufen 29.10.2026).
- EDÖB, Bekanntgabe von Personendaten ins Ausland: https://www.edoeb.admin.ch/de/bekanntgabe-von-personendaten-ins-ausland (Länder-/Garantieprüfung; abgerufen 29.10.2026).
- OpenAI, Data controls in the OpenAI platform: https://developers.openai.com/api/docs/guides/your-data (endpointbezogen; abgerufen 29.10.2026).
- Code: `apps/api/src/posts/pending-posts.service.ts`, `apps/api/src/moderation/moderation.service.ts`, `apps/api/src/notifications/notification-email.service.ts`, `apps/api/src/users/users.service.ts`, `apps/api/src/courses/courses.service.ts`.
- Lesertexte: `apps/web/src/legal/content/{de,en,fr,it}.json`, jeweils nur `draft`.
- Die bereits eingesetzte v1 und der bestehende Annahmeablauf werden durch diesen Vorbereitungsvorschlag nicht verändert.


## Rückfragen des Betreibers vom 30. Oktober 2026

- Lesertexte nennen keine interne Stage-/Prod-Bezeichnung mehr; daraus folgt keine technische Prod-Freigabe. Vor Veröffentlichung ist die Übereinstimmung der Prod-Datenflüsse mit den Texten zu prüfen.
- «Wesentliche Änderungen» bezieht sich auf die Nutzungsbedingungen. Technische Updates/Fehlerbehebungen ohne wesentliche Änderung der vereinbarten Nutzung oder Datenbearbeitung erfordern nicht allein deshalb neue Zustimmung. Releases können gebündelt werden; Informationspflichten über neue Datenbearbeitungen bleiben bestehen.
- Die 24-Stunden-Neueinreichung besteht im Stage-Code weiterhin für einzelne Prüffälle ausserhalb vollständiger neuer Posts (`ModerationService.decide/enforce`). Neue vollständige Posts werden nach Freigabe unmittelbar veröffentlicht (`PendingPostsService.decide`). Die 24-Stunden-Metadatenaufbewahrung ist davon getrennt. Keine Entfernung einer implementierten Frist nur durch redaktionelle Streichung.
- Sieben Tage gelten ab Einreichung für wartende neue Posts und einzelne offene/gesperrte Prüffälle. Ohne Entscheidung wird der Beitrag nicht veröffentlicht; eine erneute Einreichung startet eine neue Prüfung. Veröffentlichte Beiträge sind nicht von dieser Frist betroffen. Die physische Bereinigung und andere Speicherorte sind getrennt beschrieben.
- Standort/Kamera: Browser-/Betriebssystemberechtigungen sind von AGB-Annahme getrennt. Standort nur nach erklärter Nutzeraktion anfordern; Ablehnung zulassen und manuelle Suche ermöglichen. In Stage `CoursesMap.useGeolocation` und `MapView` lösen Standortanfragen derzeit beim Mount aus; `GolfNearMePage.useMyLocation` ist bereits aktionsgebunden, `ContextSidebar` liest nur bei vorhandener Freigabe. Diese Pfade vor einer Zusage in den Rechtstexten vereinheitlichen und testen. Kamera in FeedPage nutzt den System-Datei-/Kameraauswahldialog (`input capture`), keinen eigenen `getUserMedia`-Stream. Kein pauschaler Zugriff auf alle Fotos daraus ableiten. Noch keine Codeänderung an Berechtigungsabläufen in diesem Dokumentationsschritt.
- Store-Updates: bestehende Capacitor-Konfiguration nutzt `webDir: dist` ohne Live-Server-URL. API/Daten können kompatibel serverseitig aktualisiert werden; Änderungen an gebündelter Web-Oberfläche oder nativen Teilen benötigen regulär ein neues Store-Paket. Kein ungeprüftes Live-Update-System zugesagt.
