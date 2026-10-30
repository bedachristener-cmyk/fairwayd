import { useEffect, useState } from 'react';
import { API_BASE } from '../api/base';
import { getLang } from '../i18n/strings';
export type Translation = { en: string; de?: string; fr?: string; it?: string };
export type GuideEntry = { title: Translation; text: Translation; url: string; sourceUrl: string };
export type EntryGuide = { countryCode: string; checkedOn: string; published: boolean; entries: GuideEntry[]; version: number };
export const guideText = (value: Translation) => value[getLang() as keyof Translation] || value.en;
export const countryName = (code: string) => new Intl.DisplayNames([getLang()], { type: 'region' }).of(code) || code;
export const guideCopy = () => {
 const all = {
  en: { title:'Entry & visas', choose:'Include entry requirements?', help:'Choose countries with published information in Explore. Updates there also appear in this trip.', loading:'Loading country information…', failed:'Country information could not be loaded. Please try again.', empty:'No entry information is published for this country yet.', checked:'Last checked', source:'Official source', explore:'View in Explore', edit:'Edit entry information', save:'Save', cancel:'Cancel', published:'Published in Explore', date:'Verification date', add:'Add entry', remove:'Remove', notice:'Requirements depend on nationality, travel purpose and stay. Check the official sources before travelling. Arrival declarations do not replace a visa. Fairwayd does not submit applications.', unavailable:'Information currently unavailable', retry:'Try again' },
  de: { title:'Einreise & Visa', choose:'Einreisebestimmungen übernehmen?', help:'Länder mit veröffentlichten Informationen in Explore auswählen. Änderungen dort erscheinen auch in diesem Trip.', loading:'Länderinformationen werden geladen…', failed:'Länderinformationen konnten nicht geladen werden. Bitte erneut versuchen.', empty:'Für dieses Land sind noch keine Einreiseinformationen veröffentlicht.', checked:'Zuletzt geprüft', source:'Offizielle Quelle', explore:'In Explore ansehen', edit:'Einreiseinformationen bearbeiten', save:'Speichern', cancel:'Abbrechen', published:'In Explore veröffentlicht', date:'Prüfdatum', add:'Eintrag hinzufügen', remove:'Entfernen', notice:'Vorgaben hängen von Staatsangehörigkeit, Reisezweck und Aufenthaltsdauer ab. Vor der Reise offizielle Quellen prüfen. Einreiseanmeldungen ersetzen kein Visum. Fairwayd reicht keine Anträge ein.', unavailable:'Informationen derzeit nicht verfügbar', retry:'Erneut versuchen' },
  fr: { title:'Entrée & visas', choose:'Reprendre les formalités d’entrée ?', help:'Choisissez les pays avec des informations publiées dans Explore. Leurs mises à jour apparaissent aussi dans ce voyage.', loading:'Chargement des informations…', failed:'Impossible de charger les informations. Réessayez.', empty:'Aucune information d’entrée publiée pour ce pays.', checked:'Dernière vérification', source:'Source officielle', explore:'Voir dans Explore', edit:'Modifier les informations d’entrée', save:'Enregistrer', cancel:'Annuler', published:'Publié dans Explore', date:'Date de vérification', add:'Ajouter une entrée', remove:'Supprimer', notice:'Les règles dépendent de la nationalité, du motif et de la durée du séjour. Vérifiez les sources officielles avant le voyage. Une déclaration d’arrivée ne remplace pas un visa. Fairwayd ne soumet aucune demande.', unavailable:'Informations actuellement indisponibles', retry:'Réessayer' },
  it: { title:'Ingresso e visti', choose:'Includere le formalità d’ingresso?', help:'Scegli i paesi con informazioni pubblicate in Explore. Gli aggiornamenti appariranno anche nel viaggio.', loading:'Caricamento delle informazioni…', failed:'Impossibile caricare le informazioni. Riprova.', empty:'Nessuna informazione d’ingresso pubblicata per questo paese.', checked:'Ultima verifica', source:'Fonte ufficiale', explore:'Vedi in Explore', edit:'Modifica le informazioni d’ingresso', save:'Salva', cancel:'Annulla', published:'Pubblicato in Explore', date:'Data di verifica', add:'Aggiungi voce', remove:'Rimuovi', notice:'Le regole dipendono da cittadinanza, scopo e durata del soggiorno. Verifica le fonti ufficiali prima del viaggio. Una dichiarazione d’arrivo non sostituisce il visto. Fairwayd non presenta domande.', unavailable:'Informazioni attualmente non disponibili', retry:'Riprova' },
 };
 return all[getLang() as keyof typeof all] || all.en;
};
export async function guideRequest(path = '', init?: RequestInit) {
 const response = await fetch(`${API_BASE}/entry-guides${path}`, { ...init, cache:'no-store' });
 const data = await response.json().catch(() => null);
 if (!response.ok) throw new Error(typeof data?.message === 'string' ? data.message : guideCopy().failed);
 return data;
}
export function useEntryGuides() {
 const [guides,setGuides] = useState<EntryGuide[]>([]), [loading,setLoading] = useState(true), [error,setError] = useState(''), [revision,setRevision] = useState(0);
 useEffect(() => { const controller = new AbortController(); setLoading(true); setError('');
  guideRequest('', { signal:controller.signal }).then(data => { if (!controller.signal.aborted) { if (!Array.isArray(data)) throw new Error(guideCopy().failed); setGuides(data); } }).catch(() => { if (!controller.signal.aborted) setError(guideCopy().failed); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
  return () => controller.abort();
 },[revision]);
 return { guides,loading,error,reload:() => setRevision(value => value+1) };
}
export function selectedEntryCountries(trip: { entryRequirementCountries?: unknown; title?: string; destination?: string | null; items?: { course?: {country?: string | null} | null }[] } | null): string[] {
 if (Array.isArray(trip?.entryRequirementCountries)) return trip.entryRequirementCountries.filter((code): code is string => typeof code === 'string' && /^[A-Z]{2}$/.test(code));
 // Preserve the previous Thailand cards for legacy trips only. New trips explicitly save [].
 return [trip?.title,trip?.destination,...(trip?.items ?? []).map(item => item.course?.country)].some(value => value && /\b(thailand|tha[iï]lande|thailandia|th|tha)\b|ประเทศไทย/iu.test(value)) ? ['TH'] : [];
}
