import { EntryGuideCards, TripGuideStatus } from '../entry-guides/EntryGuideCards';
import { guideCopy, useEntryGuides } from '../entry-guides/api';
export function TripEntryRequirements({ countryCodes }: {countryCodes:string[]}) {
 const {guides,loading,error,reload}=useEntryGuides();const c=guideCopy();
 if(!countryCodes.length)return null;
 if(loading)return <p role="status">{c.loading}</p>;
 if(error)return <div role="alert">{error} <button type="button" onClick={reload}>{c.retry}</button></div>;
 return <div style={{display:'grid',gap:12}}><EntryGuideCards guides={guides.filter(guide=>countryCodes.includes(guide.countryCode))}/><TripGuideStatus countryCodes={countryCodes} guides={guides}/></div>;
}
