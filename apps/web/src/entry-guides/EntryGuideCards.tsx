import { ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getLang } from '../i18n/strings';
import { countryName, guideCopy, guideText, type EntryGuide } from './api';
export function EntryGuideCards({ guides }: { guides: EntryGuide[] }) {
 const c = guideCopy();
 return <div style={{display:'grid',gap:16,minWidth:0}}>{guides.map(guide => <section key={guide.countryCode} aria-label={`${c.title} · ${countryName(guide.countryCode)}`} data-trip-entry-requirements style={{display:'grid',gap:12,minWidth:0}}>
  <div style={{display:'flex',flexWrap:'wrap',alignItems:'baseline',justifyContent:'space-between',gap:6}}><h3 style={{margin:0,fontSize:15}}>{c.title} · {countryName(guide.countryCode)}</h3><span style={{color:'var(--sub)',fontSize:12}}>{c.checked}: <time dateTime={guide.checkedOn}>{new Intl.DateTimeFormat(getLang(),{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(new Date(`${guide.checkedOn}T12:00:00Z`))}</time></span></div>
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',gap:10}}>{guide.entries.map((entry,index) => <article key={index} style={{minWidth:0,border:'1px solid var(--border)',borderRadius:14,background:'var(--bg)',padding:14,display:'flex',flexDirection:'column',alignItems:'flex-start',gap:10}}>
   <h4 style={{margin:0,fontSize:14,overflowWrap:'anywhere'}}>{guideText(entry.title)}</h4><p style={{margin:0,fontSize:13,lineHeight:1.55,color:'var(--sub)',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{guideText(entry.text)}</p>
   <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{marginTop:'auto',padding:'8px 0',display:'inline-flex',gap:6,fontSize:13,fontWeight:800,color:'var(--text)',overflowWrap:'anywhere'}}>{new URL(entry.url).hostname}<ExternalLink aria-hidden="true" size={15} style={{flexShrink:0}}/></a>
   <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer" style={{fontSize:12,color:'var(--sub)'}}>{c.source}</a>
  </article>)}</div>
  <p style={{margin:0,fontSize:12,lineHeight:1.5,color:'var(--sub)'}}>{c.notice}</p>
 </section>)}</div>;
}
export function TripGuideStatus({countryCodes,guides}: {countryCodes:string[];guides:EntryGuide[]}) {
 const c=guideCopy();const missing=countryCodes.filter(code=>!guides.some(guide=>guide.countryCode===code));
 return <>{missing.map(code=><p key={code} role="status">{countryName(code)}: {c.unavailable}</p>)}<Link to="/destinations" style={{fontSize:13,color:'var(--text)'}}>{c.explore}</Link></>;
}
