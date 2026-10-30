import { useState, type CSSProperties } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useAdminStatus } from '../auth/useAdminStatus';
import { EntryGuideCards } from './EntryGuideCards';
import { countryName, guideCopy, guideRequest, useEntryGuides, type EntryGuide, type GuideEntry, type Translation } from './api';
const field: CSSProperties={width:'100%',boxSizing:'border-box',border:'1px solid var(--border)',borderRadius:10,padding:10,background:'var(--bg)',color:'var(--text)',font:'inherit'};
const button: CSSProperties={minHeight:40,padding:'9px 14px',borderRadius:999,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontWeight:800,cursor:'pointer'};
const emptyEntry=():GuideEntry=>({title:{en:''},text:{en:''},url:'',sourceUrl:''});
export function DestinationEntryGuides({countryCode}:{countryCode:string}) {
 const {guides,loading,error,reload}=useEntryGuides();const {token}=useAuth();const isAdmin=useAdminStatus();const c=guideCopy();
 const [draft,setDraft]=useState<EntryGuide|null>(null),[language,setLanguage]=useState<keyof Translation>('en'),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function edit(){setBusy(true);setMessage('');try{const data=await guideRequest(`/${encodeURIComponent(countryCode)}/admin`,{headers:{Authorization:`Bearer ${token}`}});setDraft(data??{countryCode,checkedOn:new Date().toISOString().slice(0,10),published:false,entries:[emptyEntry()],version:0});}catch(e){setMessage(e instanceof Error?e.message:c.failed);}finally{setBusy(false);}}
 async function save(event:React.FormEvent){event.preventDefault();if(!draft)return;setBusy(true);setMessage('');try{await guideRequest(`/${encodeURIComponent(countryCode)}`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(draft)});setDraft(null);reload();}catch(e){setMessage(e instanceof Error?e.message:c.failed);}finally{setBusy(false);}}
 function changeEntry(index:number,change:Partial<GuideEntry>){setDraft(current=>current?{...current,entries:current.entries.map((entry,i)=>i===index?{...entry,...change}:entry)}:null);}
 const selected=guides.filter(guide=>guide.countryCode===countryCode);
 return <section id="entry-requirements" style={{border:'1px solid var(--border)',borderRadius:20,padding:16,display:'grid',gap:14,minWidth:0,background:'var(--card)'}}>
  {loading?<p role="status">{c.loading}</p>:selected.length?<EntryGuideCards guides={selected}/>:<div><h3 style={{marginTop:0}}>{c.title} · {countryName(countryCode)}</h3><p style={{fontSize:13,color:'var(--sub)'}}>{error||c.empty}</p></div>}
  {error?<button type="button" onClick={reload}>{c.retry}</button>:null}
  {isAdmin&&!draft?<button className="fw-button-secondary" style={button} type="button" disabled={busy} onClick={edit}>{c.edit}</button>:null}
  {message?<p role="alert">{message}</p>:null}
  {draft&&isAdmin?<form onSubmit={save} style={{display:'grid',gap:12,minWidth:0}}><fieldset disabled={busy} style={{border:0,padding:0,margin:0,minWidth:0,display:'grid',gap:12}}><h3 style={{margin:0}}>{c.edit}</h3>
   <label>{c.date}<input style={field} type="date" required max={new Date().toISOString().slice(0,10)} value={draft.checkedOn} onChange={event=>setDraft({...draft,checkedOn:event.target.value})}/></label>
   <label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={draft.published} onChange={event=>setDraft({...draft,published:event.target.checked})}/>{c.published}</label>
   <label>Language / Sprache<select style={field} value={language} onChange={event=>setLanguage(event.target.value as keyof Translation)}><option value="en">English (required)</option><option value="de">Deutsch</option><option value="fr">Français</option><option value="it">Italiano</option></select></label><p style={{margin:0,fontSize:12,color:'var(--sub)',lineHeight:1.5}}>{c.translationHelp}</p>
   {draft.entries.map((entry,index)=><fieldset key={index} style={{minWidth:0,display:'grid',gap:10,border:'1px solid var(--border)',borderRadius:12,padding:12}}><legend>{index+1}</legend>
    <label>Title / Titel<input style={field} maxLength={120} required={language==='en'} value={entry.title[language]||''} onChange={event=>changeEntry(index,{title:{...entry.title,[language]:event.target.value}})}/></label>
    <label>Text<textarea style={field} rows={5} maxLength={2500} required={language==='en'} value={entry.text[language]||''} onChange={event=>changeEntry(index,{text:{...entry.text,[language]:event.target.value}})}/></label>
    <label>Official link / Offizieller Link<input style={field} type="url" required maxLength={1500} value={entry.url} onChange={event=>changeEntry(index,{url:event.target.value})}/></label>
    <label>{c.source}<input style={field} type="url" required maxLength={1500} value={entry.sourceUrl} onChange={event=>changeEntry(index,{sourceUrl:event.target.value})}/></label>
    {draft.entries.length>1?<button type="button" className="fw-button-secondary" style={button} disabled={busy} onClick={()=>setDraft({...draft,entries:draft.entries.filter((_,i)=>i!==index)})}>{c.remove}</button>:null}
   </fieldset>)}
   {draft.entries.length<8?<button type="button" className="fw-button-secondary" style={button} disabled={busy} onClick={()=>setDraft({...draft,entries:[...draft.entries,emptyEntry()]})}>{c.add}</button>:null}
   <div style={{display:'flex',flexWrap:'wrap',gap:10}}><button type="submit" className="fw-button-primary" style={{...button,background:'var(--text)',color:'var(--card)'}} disabled={busy}>{c.save}</button><button type="button" className="fw-button-secondary" style={button} disabled={busy} onClick={()=>{setDraft(null);setMessage('');}}>{c.cancel}</button></div>
  </fieldset></form>:null}
 </section>;
}
